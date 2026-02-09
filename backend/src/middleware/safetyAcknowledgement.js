/**
 * Safety Acknowledgement Middleware - Phase 11
 *
 * Enforces safety acknowledgement for high-risk workflows.
 * BR-11-18a (C-287a)
 */

const { checkSafetyAcknowledgement } = require('../services/safetyAdvisorService');
const { AppError } = require('../utils/appError');

/**
 * Middleware to require safety acknowledgement for high-risk operations
 *
 * @param {string} entityType - Type of entity (incident, inspection, permit, action, training)
 * @param {Function} getEntityId - Function to extract entity ID from request
 * @param {Function} [checkIsHighRisk] - Optional function to determine if operation is high-risk
 */
const requireSafetyAcknowledgement = (entityType, getEntityId, checkIsHighRisk) => {
  return async (req, res, next) => {
    try {
      const entityId = getEntityId(req);
      const { organisationId, id: userId } = req.user;

      if (!entityId) {
        return next();
      }

      // Check acknowledgement status
      const status = await checkSafetyAcknowledgement(organisationId, userId, entityType, entityId);

      // If high-risk and not acknowledged, block the action
      if (status.requiresAcknowledgement && !status.acknowledged) {
        // Check if custom high-risk check is provided
        if (checkIsHighRisk) {
          const isHighRisk = await checkIsHighRisk(req, entityId);
          if (!isHighRisk) {
            return next();
          }
        }

        throw new AppError(
          'Safety Advisor acknowledgement is required before proceeding with high-risk work',
          403,
          'SAFETY_ACK_REQUIRED',
          {
            entityType,
            entityId,
            isHighRisk: status.isHighRisk,
            requiresAcknowledgement: status.requiresAcknowledgement
          }
        );
      }

      // Add status to request for downstream use
      req.safetyAcknowledgementStatus = status;
      next();
    } catch (err) {
      if (err.code === 'SAFETY_ACK_REQUIRED') {
        return next(err);
      }
      // Log error but don't block for non-critical failures
      console.error('[SafetyAcknowledgement] Error checking status:', err.message);
      next();
    }
  };
};

/**
 * Middleware for incident status updates - requires acknowledgement for closing high-severity incidents
 */
const requireSafetyAckForIncidentClose = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const incidentId = parseInt(req.params.id);

    // Only enforce for status changes to 'closed'
    if (status !== 'closed') {
      return next();
    }

    const { organisationId, id: userId } = req.user;
    const { query } = require('../config/db');

    // Check if this is a high-severity incident
    const result = await query(`
      SELECT i.severity, it.requires_safety_acknowledgement
      FROM incidents i
      LEFT JOIN incident_types it ON it.id = i.type_id
      WHERE i.id = $1
    `, [incidentId]);

    if (result.rowCount === 0) {
      return next();
    }

    const { severity, requires_safety_acknowledgement } = result.rows[0];
    const isHighRisk = ['high', 'critical'].includes(severity) || requires_safety_acknowledgement;

    if (!isHighRisk) {
      return next();
    }

    // Check for acknowledgement
    const ackStatus = await checkSafetyAcknowledgement(organisationId, userId, 'incident', incidentId);

    if (!ackStatus.acknowledged) {
      throw new AppError(
        'Safety Advisor acknowledgement is required before closing high-severity incidents',
        403,
        'SAFETY_ACK_REQUIRED',
        {
          entityType: 'incident',
          entityId: incidentId,
          isHighRisk: true,
          severity,
          requiresAcknowledgement: true
        }
      );
    }

    req.safetyAcknowledgementStatus = ackStatus;
    next();
  } catch (err) {
    if (err.code === 'SAFETY_ACK_REQUIRED') {
      return next(err);
    }
    console.error('[SafetyAcknowledgement] Error in incident close check:', err.message);
    next();
  }
};

module.exports = {
  requireSafetyAcknowledgement,
  requireSafetyAckForIncidentClose
};
