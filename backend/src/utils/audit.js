const { query } = require('../config/db');

const recordAudit = async (
  {
    eventType,
    entityType,
    entityId,
    userId,
    oldValue = null,
    newValue = null,
    metadata = null,
    ipAddress = null,
    userAgent = null,
    organisationId = null
  },
  client = null
) => {
  const runner = client ? client.query.bind(client) : query;
  return runner(
    `INSERT INTO audit_log (event_type, entity_type, entity_id, user_id, old_value, new_value, metadata, ip_address, user_agent, organisation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [eventType, entityType, entityId, userId, oldValue, newValue, metadata, ipAddress, userAgent, organisationId]
  );
};

module.exports = { recordAudit };
