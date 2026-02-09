/**
 * RiskReviewService - Phase 9
 * Handles risk review recording, scheduling, and history
 */

const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/appError');
const { recordAudit } = require('../utils/audit');
const riskService = require('./riskService');

// =====================================================
// REVIEW FUNCTIONS
// =====================================================

/**
 * List reviews for a risk
 */
const listReviews = async (riskId, organisationId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const countResult = await query(
    'SELECT COUNT(*) FROM risk_reviews WHERE risk_id = $1',
    [riskId]
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);
  
  const result = await query(
    `SELECT rr.*, u.name AS reviewer_name
     FROM risk_reviews rr
     LEFT JOIN users u ON rr.reviewer_user_id = u.id
     WHERE rr.risk_id = $1
     ORDER BY rr.reviewed_at DESC
     LIMIT $2 OFFSET $3`,
    [riskId, limit, (page - 1) * limit]
  );
  
  return {
    reviews: result.rows.map(mapReviewRow),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

/**
 * Get review by ID
 */
const getReviewById = async (reviewId, riskId, organisationId) => {
  // Verify risk belongs to org
  const riskCheck = await query(
    'SELECT id FROM risks WHERE id = $1 AND organisation_id = $2',
    [riskId, organisationId]
  );
  
  if (riskCheck.rows.length === 0) {
    throw new AppError('Risk not found', 404, 'RISK_NOT_FOUND');
  }
  
  const result = await query(
    `SELECT rr.*, u.name AS reviewer_name
     FROM risk_reviews rr
     LEFT JOIN users u ON rr.reviewer_user_id = u.id
     WHERE rr.id = $1 AND rr.risk_id = $2`,
    [reviewId, riskId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }
  
  return mapReviewRow(result.rows[0]);
};

/**
 * Record a new risk review
 */
const recordReview = async (riskId, organisationId, data, userId) => {
  const risk = await riskService.getRiskById(riskId, organisationId);
  
  // Accept both naming conventions from frontend
  const outcome = data.outcome;
  const notes = data.notes;
  const decisions = data.decisions;
  const newResidualLikelihood = data.newResidualLikelihood || data.residual_likelihood;
  const newResidualImpact = data.newResidualImpact || data.residual_impact;
  const newStatus = data.newStatus || data.status;
  const controlReviews = data.controlReviews || data.controls_reviewed || [];
  
  // Calculate new residual level if scores changed
  let residualLevel = risk.residualLevel;
  let residualScore = risk.residualScore;
  
  if (newResidualLikelihood && newResidualImpact) {
    residualScore = newResidualLikelihood * newResidualImpact;
    residualLevel = riskService.calculateLevel(residualScore);
  }
  
  // Determine outcome based on score changes
  let finalOutcome = outcome;
  if (!finalOutcome) {
    if (residualScore < risk.residualScore) {
      finalOutcome = 'updated';
    } else if (residualScore > risk.residualScore) {
      finalOutcome = 'escalated';
    } else {
      finalOutcome = 'confirmed';
    }
  }
  
  const finalStatus = newStatus || risk.status;
  if (finalStatus === 'closed') {
    finalOutcome = 'closed';
  }
  
  const review = await withTransaction(async (client) => {
    // Insert review with snapshots
    const reviewResult = await client.query(
      `INSERT INTO risk_reviews 
       (risk_id, reviewed_at, reviewer_user_id, outcome, notes, decisions,
        inherent_likelihood_snapshot, inherent_impact_snapshot, inherent_score_snapshot, inherent_level_snapshot,
        residual_likelihood_snapshot, residual_impact_snapshot, residual_score_snapshot, residual_level_snapshot,
        previous_status, new_status)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        riskId, userId, finalOutcome, notes, decisions,
        risk.inherentLikelihood, risk.inherentImpact, risk.inherentScore, risk.inherentLevel,
        newResidualLikelihood || risk.residualLikelihood,
        newResidualImpact || risk.residualImpact,
        residualScore, residualLevel,
        risk.status, finalStatus
      ]
    );
    
    // Update risk with new scores and next review date
    const nextReviewDate = riskService.calculateNextReviewDate(risk.reviewFrequency, risk.reviewFrequencyDays);
    
    await client.query(
      `UPDATE risks SET
         residual_likelihood = COALESCE($1, residual_likelihood),
         residual_impact = COALESCE($2, residual_impact),
         residual_level = $3,
         status = $4,
         last_reviewed_at = NOW(),
         last_reviewed_by = $5,
         next_review_date = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        newResidualLikelihood, newResidualImpact, residualLevel,
        finalStatus, userId, nextReviewDate, riskId
      ]
    );
    
    // Process control verifications
    // Support both array of IDs (from frontend) and array of objects
    for (const ctrl of controlReviews) {
      // If it's just an ID string, treat as verified
      const controlId = typeof ctrl === 'string' ? ctrl : ctrl.controlId;
      const isVerified = typeof ctrl === 'string' ? true : ctrl.verified;
      const effectiveness = typeof ctrl === 'object' ? ctrl.effectiveness : null;
      
      if (controlId && isVerified) {
        await client.query(
          `UPDATE risk_controls SET
             effectiveness = COALESCE($1, effectiveness),
             last_verified_at = NOW(),
             updated_at = NOW()
           WHERE id = $2 AND risk_id = $3`,
          [effectiveness, controlId, riskId]
        );
      }
    }
    
    return reviewResult.rows[0];
  });
  
  await recordAudit({
    eventType: 'created',
    entityType: 'risk_review',
    entityId: review.id,
    userId,
    newValue: { riskId, outcome: finalOutcome }
  });
  
  return {
    id: review.id,
    reviewDate: review.reviewed_at,
    outcome: review.outcome,
    previousResidualScore: risk.residualScore,
    newResidualScore: residualScore,
    newResidualLevel: residualLevel,
    nextReviewDate: riskService.calculateNextReviewDate(risk.reviewFrequency, risk.reviewFrequencyDays)
  };
};

// =====================================================
// SCHEDULED REVIEW FUNCTIONS
// =====================================================

/**
 * Get upcoming reviews
 */
const getUpcomingReviews = async (organisationId, days = 30, options = {}) => {
  const { limit = 20, page = 1 } = options;
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const result = await query(
    `SELECT r.id, r.reference_number, r.title, r.residual_level, r.next_review_date,
            r.owner_user_id, u.name AS owner_name,
            (r.next_review_date - CURRENT_DATE) AS days_until_due
     FROM risks r
     LEFT JOIN users u ON r.owner_user_id = u.id
     WHERE r.organisation_id = $1
       AND r.status NOT IN ('closed', 'accepted')
       AND r.next_review_date <= $2
       AND r.next_review_date >= CURRENT_DATE
     ORDER BY r.next_review_date ASC
     LIMIT $3 OFFSET $4`,
    [organisationId, futureDate, limit, (page - 1) * limit]
  );
  
  return {
    reviews: result.rows.map(row => ({
      id: row.id,
      reference: row.reference_number,
      title: row.title,
      residualLevel: row.residual_level,
      nextReviewDate: row.next_review_date,
      daysUntilDue: parseInt(row.days_until_due, 10),
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name || null
    }))
  };
};

/**
 * Get overdue reviews
 */
const getOverdueReviews = async (organisationId, options = {}) => {
  const { limit = 50 } = options;
  
  const result = await query(
    `SELECT r.id, r.reference_number, r.title, r.residual_level, r.next_review_date,
            r.owner_user_id, u.name AS owner_name,
            (CURRENT_DATE - r.next_review_date) AS days_overdue
     FROM risks r
     LEFT JOIN users u ON r.owner_user_id = u.id
     WHERE r.organisation_id = $1
       AND r.status NOT IN ('closed', 'accepted')
       AND r.next_review_date < CURRENT_DATE
     ORDER BY r.next_review_date ASC
     LIMIT $2`,
    [organisationId, limit]
  );
  
  // Group by overdue ranges
  const byDaysOverdue = {
    '1-7': 0,
    '8-30': 0,
    '30+': 0
  };
  
  result.rows.forEach(row => {
    const days = parseInt(row.days_overdue, 10);
    if (days <= 7) byDaysOverdue['1-7']++;
    else if (days <= 30) byDaysOverdue['8-30']++;
    else byDaysOverdue['30+']++;
  });
  
  return {
    reviews: result.rows.map(row => ({
      id: row.id,
      reference: row.reference_number,
      title: row.title,
      residualLevel: row.residual_level,
      nextReviewDate: row.next_review_date,
      daysOverdue: parseInt(row.days_overdue, 10),
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name || null
    })),
    summary: {
      totalOverdue: result.rows.length,
      byDaysOverdue
    }
  };
};

// =====================================================
// MAPPING FUNCTIONS
// =====================================================

const mapReviewRow = (row) => ({
  id: row.id,
  riskId: row.risk_id,
  reviewedAt: row.reviewed_at,
  reviewedBy: {
    id: row.reviewer_user_id,
    name: row.reviewer_name
  },
  outcome: row.outcome,
  notes: row.notes,
  decisions: row.decisions,
  inherentScoreSnapshot: row.inherent_score_snapshot,
  inherentLevelSnapshot: row.inherent_level_snapshot,
  residualScoreSnapshot: row.residual_score_snapshot,
  residualLevelSnapshot: row.residual_level_snapshot,
  previousStatus: row.previous_status,
  newStatus: row.new_status,
  createdAt: row.created_at
});

module.exports = {
  listReviews,
  getReviewById,
  recordReview,
  getUpcomingReviews,
  getOverdueReviews
};
