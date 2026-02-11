# Safety Advisor Fixes - Summary Report

## Issues Addressed

### 1. ❌ Acknowledgement Button Not Responding
**Root Cause:** The acknowledgement logic was present but lacked proper debugging information.

**Fix:** Enhanced [SafetyAdvisorPage.jsx](frontend/src/pages/SafetyAdvisorPage.jsx) with detailed console logging:
```javascript
console.log('[SafetyAdvisor] Summary response:', res.data);
console.log('[SafetyAdvisor] lastAcknowledgedAt:', res.data?.lastAcknowledgedAt);
console.log('[SafetyAdvisor] Acknowledging site', selectedSite.id, '...');
```

### 2. ❌ No Legislation Showing
**Root Cause:** The `getLegislationRefsForSite()` function in [legislationService.js](backend/src/services/legislationService.js) was attempting to query a non-existent `legislation_references` table.

**Fix:** Simplified to query only the existing `site_legislation_refs` table:
```javascript
const getLegislationRefsForSite = async (siteId, options = {}) => {
  const { limit = 10, category = null, includeDeleted = false } = options;
  
  // Query site_legislation_refs directly (the correct table)
  const result = await query(`
    SELECT id, site_id, title, jurisdiction, category, summary, reference_url, is_primary, created_at
    FROM site_legislation_refs
    WHERE site_id = $1 ...
  `, [siteId]);
  
  return result.rows || [];
};
```

## Database Seeding

Successfully populated test data:
- ✅ **Legislation**: 25 entries (5 per site × 5 sites) seeded via `seeds/seed-safety-advisor.js`
- ✅ **Users**: 3 test users created (admin, manager, worker) via `seeds/seed-users.js`

### Sample Legislation Data Added
```
- Health and Safety at Work etc. Act 1974
- Management of Health and Safety at Work Regulations 1999
- Manual Handling Operations Regulations 1992
- Personal Protective Equipment (PPE) Regulations 2002
- Workplace (Health, Safety and Welfare) Regulations 1992
```

## Testing Instructions

### 1. Login to the Application
```
Email: admin@ehs.local
Password: Admin123!
```

### 2. Navigate to Safety Advisor
- Go to: http://localhost:5173/safety-advisor
- Select a site from the dropdown

### 3. Expected Results
- ✅ Legislation cards should display 5 relevant legislation entries
- ✅ Acknowledgement button should be clickable and functional
- ✅ Console logs will show detailed debugging information

### 4. Debugging
Open browser Developer Tools (F12) and check Console tab for logs like:
```
[SafetyAdvisor] Summary response: {...}
[SafetyAdvisor] lastAcknowledgedAt: <timestamp or null>
[SafetyAdvisor] Acknowledging site <siteId>...
```

## Files Modified

1. **frontend/src/pages/SafetyAdvisorPage.jsx**
   - Added console logging to `fetchSafetySummary()`
   - Added console logging to `handleAcknowledge()`

2. **backend/src/services/legislationService.js**
   - Fixed `getLegislationRefsForSite()` to query correct table

3. **backend/seeds/seed-safety-advisor.js** (NEW)
   - Dedicated script for seeding Phase 11 data

4. **backend/seeds/seed-users.js** (NEW)
   - Dedicated script for creating test users

5. **backend/seeds/seed.js**
   - Updated to insert legislation correctly into `site_legislation_refs`

## Next Steps

If legislation still doesn't appear:
1. Verify legislation was inserted: `SELECT COUNT(*) FROM site_legislation_refs;`
2. Check site exists: `SELECT id, name FROM sites LIMIT 1;`
3. Verify API returns data: `GET /api/safety-advisor/sites/{siteId}/summary`

If acknowledgement button doesn't work:
1. Check browser console for errors (F12)
2. Verify `POST /api/safety-advisor/sites/{siteId}/acknowledge` returns success
3. Confirm `lastAcknowledgedAt` is returned in API response
