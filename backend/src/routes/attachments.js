const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { splitName, toIso } = require('../utils/format');
const { recordAudit } = require('../utils/audit');

const router = express.Router();

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const ALLOWED_ENTITY_TYPES = new Set(['incident', 'inspection', 'action']);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const entityType = req.body.entityType;
    const entityId = req.body.entityId;
    const entityDir = path.join(uploadsDir, entityType || 'temp', entityId || 'temp');

    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }
    cb(null, entityDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('File type not allowed', 415, 'UNSUPPORTED_MEDIA'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Helper to verify entity exists and user has access
const verifyEntityAccess = async (entityType, entityId, userId, userRole) => {
  if (entityType === 'incident') {
    const result = await query('SELECT id, reported_by FROM incidents WHERE id = $1', [entityId]);
    if (result.rowCount === 0) {
      return { exists: false, hasAccess: false };
    }
    // Workers can only upload to their own incidents
    const hasAccess = userRole !== 'worker' || result.rows[0].reported_by === userId;
    return { exists: true, hasAccess };
  }

  if (entityType === 'inspection') {
    const result = await query('SELECT id FROM inspections WHERE id = $1', [entityId]);
    if (result.rowCount === 0) {
      return { exists: false, hasAccess: false };
    }
    // All authenticated users can view inspections, managers+ can upload
    const hasAccess = userRole !== 'worker';
    return { exists: true, hasAccess };
  }

  if (entityType === 'action') {
    const result = await query('SELECT id, assigned_to FROM actions WHERE id = $1', [entityId]);
    if (result.rowCount === 0) {
      return { exists: false, hasAccess: false };
    }
    // Workers can only upload to actions assigned to them
    const hasAccess = userRole !== 'worker' || result.rows[0].assigned_to === userId;
    return { exists: true, hasAccess };
  }

  return { exists: false, hasAccess: false };
};

// Multer error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File exceeds max size (10MB)', 413, 'FILE_TOO_LARGE'));
    }
    return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
  }
  if (err) {
    return next(err);
  }
  return next();
};

// POST /api/attachments - Upload an attachment
router.post('/', upload.single('file'), handleUploadError, async (req, res, next) => {
  const { entityType, entityId } = req.body;
  const file = req.file;

  // Validation
  if (!entityType || !ALLOWED_ENTITY_TYPES.has(entityType)) {
    // Clean up uploaded file if validation fails
    if (file) fs.unlinkSync(file.path);
    return next(new AppError('Invalid entity type', 400, 'VALIDATION_ERROR'));
  }

  if (!entityId) {
    if (file) fs.unlinkSync(file.path);
    return next(new AppError('Entity ID is required', 400, 'VALIDATION_ERROR'));
  }

  if (!file) {
    return next(new AppError('File is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    // Verify entity exists and user has access
    const { exists, hasAccess } = await verifyEntityAccess(entityType, entityId, req.user.id, req.user.role);

    if (!exists) {
      fs.unlinkSync(file.path);
      return next(new AppError('Parent entity not found', 400, 'VALIDATION_ERROR'));
    }

    if (!hasAccess) {
      fs.unlinkSync(file.path);
      return next(new AppError('Not allowed to upload to this entity', 403, 'FORBIDDEN'));
    }

    // Build storage path relative to uploads dir
    const storagePath = path.relative(uploadsDir, file.path).replace(/\\/g, '/');

    // Insert attachment record
    const result = await query(
      `INSERT INTO attachments (entity_type, entity_id, filename, file_type, file_size, storage_path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, entity_type, entity_id, filename, file_type, file_size, uploaded_at`,
      [entityType, entityId, file.originalname, file.mimetype, file.size, storagePath, req.user.id]
    );

    const attachment = result.rows[0];

    // Record audit log
    await recordAudit({
      eventType: 'attachment_added',
      entityType,
      entityId,
      userId: req.user.id,
      newValue: { attachmentId: attachment.id, filename: attachment.filename }
    });

    const uploader = splitName(req.user.name);

    return res.status(201).json({
      id: attachment.id,
      entityType: attachment.entity_type,
      entityId: attachment.entity_id,
      filename: attachment.filename,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
      uploadedBy: {
        id: req.user.id,
        firstName: uploader.firstName,
        lastName: uploader.lastName
      },
      uploadedAt: toIso(attachment.uploaded_at)
    });
  } catch (err) {
    // Clean up file on error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return next(err);
  }
});

// GET /api/attachments - List attachments by entity
router.get('/', async (req, res, next) => {
  const { entityType, entityId } = req.query;

  if (!entityType || !ALLOWED_ENTITY_TYPES.has(entityType)) {
    return next(new AppError('Invalid entity type', 400, 'VALIDATION_ERROR'));
  }

  if (!entityId) {
    return next(new AppError('Entity ID is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    // Verify entity exists
    const { exists } = await verifyEntityAccess(entityType, entityId, req.user.id, req.user.role);
    if (!exists) {
      return next(new AppError('Entity not found', 404, 'NOT_FOUND'));
    }

    const result = await query(
      `SELECT a.id, a.filename, a.file_type, a.file_size, a.uploaded_at,
              u.id AS uploader_id, u.name AS uploader_name
       FROM attachments a
       JOIN users u ON u.id = a.uploaded_by
       WHERE a.entity_type = $1 AND a.entity_id = $2
       ORDER BY a.uploaded_at DESC`,
      [entityType, entityId]
    );

    const attachments = result.rows.map(row => {
      const uploader = splitName(row.uploader_name);
      return {
        id: row.id,
        filename: row.filename,
        fileType: row.file_type,
        fileSize: row.file_size,
        uploadedBy: {
          id: row.uploader_id,
          firstName: uploader.firstName,
          lastName: uploader.lastName
        },
        uploadedAt: toIso(row.uploaded_at)
      };
    });

    return res.json({ attachments });
  } catch (err) {
    return next(err);
  }
});

// GET /api/attachments/:id/download - Download an attachment
router.get('/:id/download', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT id, entity_type, entity_id, filename, file_type, storage_path
       FROM attachments WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Attachment not found', 404, 'NOT_FOUND'));
    }

    const attachment = result.rows[0];

    // Verify user has access to the parent entity
    const { exists, hasAccess } = await verifyEntityAccess(
      attachment.entity_type,
      attachment.entity_id,
      req.user.id,
      req.user.role
    );

    if (!exists) {
      return next(new AppError('Parent entity not found', 404, 'NOT_FOUND'));
    }

    // For downloads, we allow access if user can view the entity (not just upload)
    // Workers can view their own incidents and assigned actions
    // All users can view inspections
    let canView = hasAccess;
    if (!canView && attachment.entity_type === 'inspection') {
      canView = true; // All authenticated users can view inspections
    }

    if (!canView) {
      return next(new AppError('Not allowed to access this attachment', 403, 'FORBIDDEN'));
    }

    const filePath = path.join(uploadsDir, attachment.storage_path);

    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on disk', 404, 'NOT_FOUND'));
    }

    // Set headers and send file
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', attachment.file_type);

    return res.sendFile(filePath);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
