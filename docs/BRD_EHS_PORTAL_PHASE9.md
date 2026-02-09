# Business Requirements Document – EHS Portal Phase 9
## Risk Register & Enterprise Risk Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 9 – Risk Register & Enterprise Risk Management |

---

## 1. Executive Summary

Phase 9 introduces comprehensive Risk Register and Enterprise Risk Management (ERM) capabilities to the EHS Portal. This module enables organisations to systematically identify, assess, control, and monitor safety and environmental risks in alignment with ISO 31000 principles.

### 1.1 Business Context

With Phases 1-8 complete, the EHS Portal manages incidents, inspections, actions, chemicals, permits, and training. However, a strategic gap exists:

- **No formal risk register:** Risks are implied through site risk scores (Phase 5) but not explicitly documented
- **Missing risk-incident linkage:** Cannot connect incidents to underlying hazards and root causes
- **No control documentation:** Controls exist (actions, training, permits) but not linked to risks
- **Audit gaps:** No structured evidence of risk assessments and reviews for compliance audits
- **Reactive posture:** Focus is on managing events rather than proactively managing risk

Phase 9 addresses these gaps with a complete Risk Register integrated into the EHS ecosystem.

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P9-01 | Centralise risk documentation | 100% of significant EHS risks documented in register |
| G-P9-02 | Enable proactive risk management | Risk assessments reviewed on schedule (95% compliance) |
| G-P9-03 | Link risks to operational data | All high/extreme risks linked to controls and events |
| G-P9-04 | Improve audit readiness | < 10 minutes to generate risk audit pack |
| G-P9-05 | Support risk-based decision making | Risk heatmap available for all sites |
| G-P9-06 | Demonstrate control effectiveness | Measurable reduction in residual vs inherent risk |

### 1.3 Scope

**In Scope:**
- Risk Register with full CRUD operations
- Hazard, cause, consequence documentation (bowtie-aligned)
- Inherent risk scoring (5×5 likelihood × impact matrix)
- Control documentation and linking
- Residual risk scoring and tolerance comparison
- Links to: incidents, actions, inspections, training, chemicals, permits
- Risk review workflow with scheduled reviews
- Risk dashboards (heatmap, top risks, trends)
- Integration with Phase 5 analytics
- PDF/Excel exports for audits
- Notification integration for review reminders

**Out of Scope:**
- Full bow-tie diagram editor (simplified view only)
- Monte Carlo simulation or quantitative risk analysis
- External GRC/ERM platform integration
- AI-powered risk identification
- Mobile offline risk assessments
- Multi-currency financial impact quantification

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Workers | Risk awareness | View risks relevant to their role/site |
| Supervisors | Risk contributors | Report hazards, suggest controls |
| Managers | Risk owners | Own and review risks, implement controls |
| Admins | System configuration | Configure categories, scoring matrices |
| Compliance Lead | Risk governance | Audit risk assessments, ensure coverage |
| HSE Director | Executive sponsor | Strategic risk oversight, tolerance decisions |
| External Auditors | Assurance | Verify risk management process |

---

## 3. Business Requirements

### 3.1 Risk Register (BR-RISK-REG)

#### BR-RISK-REG-01: Risk Record Management
**Priority:** Must Have

The system shall support a comprehensive risk register with the following attributes:

**Core Fields:**
1. **Reference Number:** Auto-generated unique identifier (e.g., RISK-2026-001)
2. **Title:** Short descriptive name (max 200 chars)
3. **Description:** Detailed risk description
4. **Category:** Configurable categories (Safety, Environmental, Compliance, Operational, etc.)
5. **Site(s):** One or more sites where risk applies
6. **Risk Owner:** Assigned user responsible for the risk

**Risk Statement (Bowtie-Aligned):**
7. **Hazard:** The source of potential harm (e.g., "Working at height")
8. **Cause:** What could lead to the event (e.g., "Ladder instability")
9. **Consequence:** Potential outcome (e.g., "Fall resulting in serious injury")

**Status & Lifecycle:**
10. **Status:** Emerging, Active, Under Review, Closed, Accepted
11. **Created Date:** When risk was first identified
12. **Last Reviewed Date:** Most recent review date
13. **Next Review Date:** Scheduled review date
14. **Review Frequency:** Monthly, Quarterly, Annually, Custom

**Acceptance Criteria:**
- Admins and Managers can create/edit risks
- Workers can view risks for their site
- All fields are searchable and filterable
- Reference numbers are unique per organisation
- Audit trail captures all changes

**Capability ID:** C-240

---

#### BR-RISK-REG-02: Risk Categories
**Priority:** Must Have

The system shall support configurable risk categories:

**System Categories:**
- Health & Safety
- Environmental
- Regulatory Compliance
- Operational
- Reputational
- Financial (EHS-related)

**Acceptance Criteria:**
- System categories seeded on deployment
- Admins can add/edit custom categories
- Categories used in filtering and reporting
- Category cannot be deleted if risks exist

**Capability ID:** C-241

---

#### BR-RISK-REG-03: Risk Search & Filter
**Priority:** Must Have

The system shall support advanced search and filtering:
- Free-text search across title, description, hazard, cause, consequence
- Filter by: category, site, owner, status, risk level (inherent/residual)
- Filter by: overdue for review, review due within X days
- Sort by: risk score, next review date, created date, title

**Acceptance Criteria:**
- Filters persist during session
- URL updates to reflect filters (shareable)
- Results paginated (configurable page size)
- Export respects current filters

**Capability ID:** C-242

---

### 3.2 Risk Scoring (BR-RISK-SCORE)

#### BR-RISK-SCORE-01: Inherent Risk Assessment
**Priority:** Must Have

The system shall calculate inherent risk (risk before controls) using:

**Likelihood Scale (1-5):**
| Score | Level | Definition |
|-------|-------|------------|
| 1 | Rare | May occur only in exceptional circumstances (<1% annually) |
| 2 | Unlikely | Could occur at some time (1-10% annually) |
| 3 | Possible | Might occur at some time (10-50% annually) |
| 4 | Likely | Will probably occur in most circumstances (50-90% annually) |
| 5 | Almost Certain | Expected to occur (>90% annually) |

**Impact Scale (1-5):**
| Score | Level | Safety Impact | Environmental Impact |
|-------|-------|---------------|---------------------|
| 1 | Negligible | First aid only | No environmental impact |
| 2 | Minor | Medical treatment, no lost time | Minor, contained on-site |
| 3 | Moderate | Lost time injury | Moderate, localised impact |
| 4 | Major | Serious injury, hospitalisation | Significant off-site impact |
| 5 | Catastrophic | Fatality or permanent disability | Major environmental damage |

**Risk Level Calculation:**
```
Inherent Risk Score = Likelihood × Impact

Risk Level Matrix:
         Impact
         1    2    3    4    5
    5    5   10   15   20   25
L   4    4    8   12   16   20
    3    3    6    9   12   15
    2    2    4    6    8   10
    1    1    2    3    4    5
```

| Score Range | Risk Level | Colour |
|-------------|------------|--------|
| 1-4 | Low | Green |
| 5-9 | Medium | Yellow |
| 10-16 | High | Orange |
| 17-25 | Extreme | Red |

**Acceptance Criteria:**
- User selects likelihood and impact from dropdowns
- Risk score auto-calculated on selection
- Risk level colour displayed immediately
- Scoring scales are configurable per organisation

**Capability ID:** C-243

---

#### BR-RISK-SCORE-02: Residual Risk Assessment
**Priority:** Must Have

After controls are documented, the system shall calculate residual risk:
- Same likelihood and impact scales as inherent
- Residual likelihood: Expected likelihood after controls
- Residual impact: Expected impact after controls
- Residual risk score and level calculated identically

**Acceptance Criteria:**
- Residual assessment available after at least one control documented
- Clear visual comparison of inherent vs residual risk
- Trend of residual risk tracked over reviews

**Capability ID:** C-244

---

#### BR-RISK-SCORE-03: Risk Tolerance
**Priority:** Should Have

The system shall compare residual risk to defined tolerance thresholds:

| Residual Level | Tolerance Status | Required Action |
|----------------|------------------|-----------------|
| Low | Acceptable | Monitor during reviews |
| Medium | Tolerable | Additional controls optional |
| High | Unacceptable (ALARP) | Reduce to ALARP or justify |
| Extreme | Intolerable | Immediate action required |

**Acceptance Criteria:**
- Tolerance thresholds configurable per organisation
- Visual indicator when risk exceeds tolerance
- Risks above tolerance highlighted in dashboards
- Justification required for accepted high/extreme risks

**Capability ID:** C-245

---

### 3.3 Risk Controls (BR-RISK-CTRL)

#### BR-RISK-CTRL-01: Control Documentation
**Priority:** Must Have

The system shall support documenting controls for each risk:

**Control Fields:**
1. **Description:** What the control is
2. **Control Type:** Prevention (reduces likelihood) or Mitigation (reduces impact)
3. **Control Category:** Elimination, Substitution, Engineering, Administrative, PPE
4. **Effectiveness Rating:** Effective, Partially Effective, Ineffective, Unknown
5. **Owner:** Person responsible for maintaining control
6. **Verification Method:** How control is verified (inspection, audit, etc.)
7. **Last Verified Date:** When control was last checked

**Acceptance Criteria:**
- Multiple controls per risk
- Controls can be reordered by hierarchy
- Controls linked to verification evidence

**Capability ID:** C-246

---

#### BR-RISK-CTRL-02: Control Linking
**Priority:** Must Have

Controls can be linked to existing portal entities:
- **Actions:** Link to corrective/preventive actions from Phase 2
- **Training Courses:** Link to required training from Phase 8
- **Inspection Templates:** Link to inspections that verify control
- **Permits:** Link to permits that implement control (Phase 7)

**Acceptance Criteria:**
- Bidirectional navigation (risk → entity, entity → risk)
- Control status updated if linked action is completed
- Gap identification if linked training is expired

**Capability ID:** C-247

---

### 3.4 Risk Linking (BR-RISK-LINK)

#### BR-RISK-LINK-01: Link to Operational Data
**Priority:** Must Have

Risks can be linked to operational entities to show where risks have materialised or are being managed:

| Entity Type | Link Purpose |
|-------------|--------------|
| Incidents | Risk materialised in this incident |
| Inspections | Inspection verified risk controls |
| Actions | Action addresses this risk |
| Training Courses | Training mitigates this risk |
| Chemicals | Chemical presents this risk |
| Permits | Permit controls this risk |

**Acceptance Criteria:**
- Many-to-many relationships (risk can link to multiple incidents, etc.)
- Links created from risk detail or from entity detail
- Link history maintained (who linked, when)
- Aggregate statistics on risk page (e.g., "3 related incidents")

**Capability ID:** C-248

---

#### BR-RISK-LINK-02: Create Risk from Incident
**Priority:** Should Have

Users can promote an incident to create a new risk:
- Pre-populate fields from incident data
- Auto-link incident to new risk
- Suggest similar existing risks to link instead

**Acceptance Criteria:**
- "Create Risk" button on incident detail
- Field mapping: incident type → category, description → consequence
- Duplicate check shows similar risks

**Capability ID:** C-249

---

### 3.5 Risk Review Workflow (BR-RISK-REV)

#### BR-RISK-REV-01: Scheduled Reviews
**Priority:** Must Have

Each risk shall have a scheduled review cycle:
- **Review Frequency:** Monthly, Quarterly, Semi-annually, Annually, Custom days
- **Next Review Date:** Calculated from last review + frequency
- **Review Reminder:** Notification sent X days before due

**Acceptance Criteria:**
- Review frequency set on risk creation
- Next review date auto-calculated
- Overdue reviews highlighted in red
- Dashboard widget shows upcoming reviews

**Capability ID:** C-250

---

#### BR-RISK-REV-02: Review Recording
**Priority:** Must Have

When a review is performed, the system shall capture:
1. **Review Date:** When review was conducted
2. **Reviewer:** Who performed the review
3. **Review Outcome:** Confirmed, Updated, Escalated, Closed
4. **Notes:** Free-text review notes
5. **Decisions:** Specific decisions made
6. **Score Snapshot:** Inherent and residual scores at time of review

**Acceptance Criteria:**
- Review creates immutable history record
- Previous reviews viewable in timeline
- Scores at each review point trackable
- Review triggers next review date calculation

**Capability ID:** C-251

---

#### BR-RISK-REV-03: Risk Status Transitions
**Priority:** Must Have

Risk status workflow:
```
Emerging → Active → Under Review → Active (updated)
                                 → Closed
                                 → Accepted

Active → Closed (risk eliminated)
Active → Accepted (risk formally accepted above tolerance)
```

**Acceptance Criteria:**
- Status change requires justification
- Only Managers/Admins can close or accept risks
- Accepted risks require documented justification
- Closed risks can be reopened

**Capability ID:** C-252

---

### 3.6 Risk Dashboards & Reporting (BR-RISK-DASH)

#### BR-RISK-DASH-01: Risk Heatmap
**Priority:** Must Have

Visual 5×5 matrix showing risk distribution:
- Cells coloured by risk level (green/yellow/orange/red)
- Cell shows count of risks at that position
- Click cell to drill down to risk list
- Toggle between inherent and residual view
- Filter by site, category, owner

**Acceptance Criteria:**
- Responsive layout for different screen sizes
- Interactive tooltips showing risk titles
- Export heatmap as image

**Capability ID:** C-253

---

#### BR-RISK-DASH-02: Top Risks Widget
**Priority:** Must Have

Dashboard widget showing highest priority risks:
- Top 10 risks by residual risk score
- Shows: reference, title, residual level, owner, next review
- Colour-coded by risk level
- Link to full risk detail

**Acceptance Criteria:**
- Configurable count (5, 10, 20)
- Filter by site
- Visible on main analytics dashboard

**Capability ID:** C-254

---

#### BR-RISK-DASH-03: Risk Trends
**Priority:** Should Have

Charts showing risk metrics over time:
- Total risks by status over time
- Average residual risk score trend
- Risk reduction (inherent vs residual) trend
- Review compliance rate over time

**Acceptance Criteria:**
- Data from review history
- Granularity: monthly, quarterly
- 12-month default view

**Capability ID:** C-255

---

#### BR-RISK-DASH-04: Risks by Dimension
**Priority:** Must Have

Charts and tables showing:
- Risks by category (pie/bar chart)
- Risks by site (bar chart)
- Risks by owner (table)
- Risks by status (pie chart)
- Overdue reviews by owner (table)

**Acceptance Criteria:**
- Drill-down to filtered risk list
- Respect active filters
- Export underlying data

**Capability ID:** C-256

---

#### BR-RISK-DASH-05: Risk Register Export
**Priority:** Must Have

Export full risk register for audits:

**Excel Export:**
- All risk fields including linked controls
- Current scores and levels
- Review history (separate sheet)
- Linked entities (separate sheet)

**PDF Export:**
- Formatted risk register report
- Heatmap visualisation
- Summary statistics
- Individual risk detail pages (optional)

**Acceptance Criteria:**
- Export respects current filters
- Date/time stamp on export
- Audit-ready formatting with headers/footers
- Configurable columns for Excel

**Capability ID:** C-257

---

### 3.7 Governance & Compliance (BR-RISK-GOV)

#### BR-RISK-GOV-01: Audit Trail
**Priority:** Must Have

All risk register activities shall be logged:
- Risk creation, update, deletion
- Score changes (before/after)
- Status changes with justification
- Link/unlink operations
- Review recordings

**Acceptance Criteria:**
- Immutable audit log
- Viewable in risk history tab
- Filterable by user, action, date
- Exportable for audits

**Capability ID:** C-258

---

#### BR-RISK-GOV-02: ISO 31000 Alignment
**Priority:** Should Have

The system shall support ISO 31000:2018 risk management principles:
- Context establishment (scope, criteria)
- Risk identification (hazard-cause-consequence)
- Risk analysis (likelihood, impact, level)
- Risk evaluation (tolerance comparison)
- Risk treatment (controls)
- Communication and consultation (reviews, notifications)
- Monitoring and review (scheduled reviews, trends)

**Acceptance Criteria:**
- Terminology aligned with ISO 31000
- Process flow supports standard workflow
- Documentation references standard

**Capability ID:** C-259

---

### 3.8 Integration (BR-RISK-INT)

#### BR-RISK-INT-01: Analytics Integration
**Priority:** Must Have

Risk data shall feed into Phase 5 analytics:
- Risk KPIs on analytics dashboard
- Risk heatmap widget
- Risk-aware site scoring (enhance existing site risk scores)
- Risk reduction trends

**Acceptance Criteria:**
- New analytics widgets for risk
- Existing site risk scores consider formal risks
- Unified reporting

**Capability ID:** C-260

---

#### BR-RISK-INT-02: Notification Integration
**Priority:** Must Have

Risk events shall trigger Phase 4 notifications:
- Review due reminder (7, 3, 1 days before)
- Review overdue alert
- Risk assigned as owner
- Risk escalated to extreme
- Control verification due

**Acceptance Criteria:**
- Configurable notification preferences
- In-app and email notifications
- Digest support

**Capability ID:** C-261

---

## 4. Success Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| Risk coverage | % of sites with documented risks | 100% |
| Review compliance | % of reviews completed on time | 95% |
| Risk reduction | Avg residual vs inherent score | >30% reduction |
| Control documentation | % of high/extreme risks with controls | 100% |
| Export generation time | Time to generate audit pack | < 30 seconds |
| User adoption | Active users accessing risk register weekly | 80% of managers |

---

## 5. Capability ID Summary

| C-ID | Capability | Priority |
|------|------------|----------|
| C-240 | Risk Record Management | Must Have |
| C-241 | Risk Categories | Must Have |
| C-242 | Risk Search & Filter | Must Have |
| C-243 | Inherent Risk Assessment | Must Have |
| C-244 | Residual Risk Assessment | Must Have |
| C-245 | Risk Tolerance | Should Have |
| C-246 | Control Documentation | Must Have |
| C-247 | Control Linking | Must Have |
| C-248 | Link to Operational Data | Must Have |
| C-249 | Create Risk from Incident | Should Have |
| C-250 | Scheduled Reviews | Must Have |
| C-251 | Review Recording | Must Have |
| C-252 | Risk Status Transitions | Must Have |
| C-253 | Risk Heatmap | Must Have |
| C-254 | Top Risks Widget | Must Have |
| C-255 | Risk Trends | Should Have |
| C-256 | Risks by Dimension | Must Have |
| C-257 | Risk Register Export | Must Have |
| C-258 | Audit Trail | Must Have |
| C-259 | ISO 31000 Alignment | Should Have |
| C-260 | Analytics Integration | Must Have |
| C-261 | Notification Integration | Must Have |

---

## 6. Out of Scope / Future Considerations

| Item | Rationale | Future Phase |
|------|-----------|--------------|
| Full bow-tie diagram editor | Complex UI, limited initial value | Phase 10+ |
| Quantitative risk analysis (Monte Carlo) | Requires specialised expertise | Phase 11+ |
| External GRC platform integration | API standards vary by vendor | Phase 11+ |
| AI-powered risk identification | Requires ML model development | Phase 12+ |
| Mobile offline risk assessments | Requires offline-first architecture | Phase 10+ |
| Multi-currency financial impact | Currency conversion complexity | Phase 10+ |
| Risk appetite modelling | Strategic feature for mature orgs | Phase 11+ |

---

## 7. Dependencies

| Dependency | Phase | Impact on Phase 9 |
|------------|-------|-------------------|
| Actions | Phase 2 | Control linking |
| Analytics | Phase 5 | Dashboard widgets, site risk integration |
| Notifications | Phase 4 | Review reminders |
| Chemicals | Phase 7 | Risk-chemical linking |
| Permits | Phase 7 | Risk-permit linking |
| Training | Phase 8 | Control linking to courses |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 9 BRD |
