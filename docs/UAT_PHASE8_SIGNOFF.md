# UAT Sign-Off Document – EHS Portal Phase 8
## Training & Competence Management

---

| Item | Detail |
|------|--------|
| **Document Title** | Phase 8 – Training & Competence Management UAT Sign-off |
| **Document Version** | 1.0 |
| **Date** | [To be completed] |
| **Prepared By** | [Name, Role] |
| **Reviewed By** | [Name, Role] |
| **Classification** | Internal / Confidential |

---

## 1. Executive Summary

This document records the formal User Acceptance Testing (UAT) sign-off for **Phase 8 – Training & Competence Management** of the EHS Portal. Upon signature, the undersigned stakeholders confirm that Phase 8 functionality has been tested, verified, and is approved (or not approved) for deployment to Production.

---

## 2. Scope of UAT

### 2.1 Phase 8 Functional Scope

Phase 8 delivers the following capabilities:

| Capability | Description |
|------------|-------------|
| **Training Catalogue** | Manage training courses with categories, delivery types, validity periods, prerequisites, and refresher links |
| **Training Sessions** | Schedule instructor-led sessions with capacity management and enrollment tracking |
| **Training Assignments** | Assign training individually or in bulk by role/site, with due dates and priority |
| **My Training** | Personal dashboard for workers to view assigned training, enroll in sessions, and track completions |
| **Completions & Evidence** | Record training completions with pass/fail, scores, expiry dates, and evidence uploads |
| **Training Matrix** | Visualise user × course compliance with gap analysis and filtering |
| **Reports & Exports** | Generate PDF compliance reports and Excel exports for audits |
| **Notifications** | Automated alerts for assignments, reminders, session updates, and expiry warnings |
| **Role/Site Requirements** | Configure mandatory training requirements per role and site |
| **Security & RBAC** | Role-based access control for all training features |
| **Integration** | Link training to Actions (corrective actions) and Analytics dashboards |

### 2.2 UAT Basis

UAT testing was conducted based on:

| Source Document | Location |
|-----------------|----------|
| UAT Execution Plan | `docs/UAT_PHASE8_EXECUTION_PLAN.md` |
| UAT Test Cases | `EHS_UAT_Phase8_Training.xlsx` |
| Detailed Test Cases | `Checklist/test_cases_phase8.csv` |
| Business Requirements | `docs/BRD_EHS_PORTAL_PHASE8.md` |
| API Specification | `docs/API_SPEC_PHASE8.md` |
| Frontend/UX Specification | `docs/FRONTEND_UX_PHASE8.md` |
| Test Strategy | `docs/TEST_STRATEGY_PHASE8.md` |

---

## 3. UAT Environment

### 3.1 Environment Details

| Component | Value |
|-----------|-------|
| **UAT Frontend URL** | [To be completed, e.g., https://uat.ehs-portal.example.com] |
| **UAT API URL** | [To be completed, e.g., https://uat-api.ehs-portal.example.com] |
| **Database Name** | [To be completed, e.g., ehs_portal_uat] |
| **Application Version** | [To be completed, e.g., v8.0.0] |
| **Git Commit Hash** | [To be completed, e.g., abc123def456] |
| **Deployment Date** | [To be completed] |
| **UAT Start Date** | [To be completed] |
| **UAT End Date** | [To be completed] |

### 3.2 Browser/Device Testing

| Browser/Device | Version | Tested |
|----------------|---------|--------|
| Chrome (Desktop) | [Version] | ☐ Yes / ☐ No |
| Edge (Desktop) | [Version] | ☐ Yes / ☐ No |
| Firefox (Desktop) | [Version] | ☐ Yes / ☐ No |
| Safari (Desktop) | [Version] | ☐ Yes / ☐ No |
| Mobile (Chrome/Safari) | [Version] | ☐ Yes / ☐ No |

---

## 4. Test Summary

### 4.1 Overall Metrics

| Metric | Value |
|--------|-------|
| **Total UAT Scenarios (Phase 8)** | [To be completed] |
| **Passed** | [To be completed] |
| **Failed** | [To be completed] |
| **Blocked / Not Run** | [To be completed] |
| **Pass Rate** | [To be calculated, e.g., 95%] |
| **Total Defects Raised (Phase 8)** | [To be completed] |
| **Critical Defects Outstanding** | [To be completed] |
| **High Defects Outstanding** | [To be completed] |

### 4.2 Results by Wave

| Wave | Scope | Total | Pass | Fail | Blocked | Pass Rate |
|------|-------|-------|------|------|---------|-----------|
| Wave 1 | Catalogue, Sessions, Assignments, My Training | [#] | [#] | [#] | [#] | [%] |
| Wave 2 | Completions, Evidence, Matrix | [#] | [#] | [#] | [#] | [%] |
| Wave 3 | Reporting, Exports, Notifications | [#] | [#] | [#] | [#] | [%] |
| Wave 4 | Integration, Security | [#] | [#] | [#] | [#] | [%] |
| **Total** | — | [#] | [#] | [#] | [#] | [%] |

---

## 5. UAT Coverage

### 5.1 Coverage by Feature Area

| Area | UAT IDs | Key Capabilities Tested | Status |
|------|---------|-------------------------|--------|
| **Catalogue** | P8-UAT-CAT-01, P8-UAT-CAT-02, P8-UAT-CAT-03 | Course CRUD, categories, search, filtering | ☐ Complete |
| **Sessions** | P8-UAT-SES-01, P8-UAT-SES-02, P8-UAT-SES-03 | Session scheduling, enrollment, capacity, waitlist | ☐ Complete |
| **Assignments** | P8-UAT-ASN-01, P8-UAT-ASN-02, P8-UAT-ASN-03 | Individual & bulk assignment, due dates, waiving | ☐ Complete |
| **My Training** | P8-UAT-MYT-01, P8-UAT-MYT-02, P8-UAT-MYT-03 | Personal dashboard, self-enrollment, history | ☐ Complete |
| **Completions** | P8-UAT-CMP-01, P8-UAT-CMP-02, P8-UAT-CMP-03, P8-UAT-CMP-04 | Manual/session completion, evidence, external training | ☐ Complete |
| **Matrix** | P8-UAT-MTX-01, P8-UAT-MTX-02, P8-UAT-MTX-03 | Matrix view, filtering, gap analysis, export | ☐ Complete |
| **Reporting** | P8-UAT-RPT-01, P8-UAT-RPT-02, P8-UAT-RPT-03 | Compliance PDF, Excel exports, filtering | ☐ Complete |
| **Notifications** | P8-UAT-NOT-01 | Assignment, reminder, expiry, session alerts | ☐ Complete |
| **Integration** | P8-UAT-INT-01 | Actions linkage, Analytics metrics | ☐ Complete |
| **Security** | P8-UAT-SEC-01, P8-UAT-SEC-02 | RBAC enforcement, multi-tenancy isolation | ☐ Complete |

### 5.2 Business Requirements Traceability

| Requirement ID | Description | UAT Coverage | Status |
|----------------|-------------|--------------|--------|
| BR-TRAIN-CAT-01 | Course Management | P8-UAT-CAT-* | ☐ Verified |
| BR-TRAIN-CAT-02 | Course Categories | P8-UAT-CAT-* | ☐ Verified |
| BR-TRAIN-SESS-01 | Session Scheduling | P8-UAT-SES-* | ☐ Verified |
| BR-TRAIN-SESS-02 | Session Enrollment | P8-UAT-SES-* | ☐ Verified |
| BR-TRAIN-ASSIGN-01 | Training Assignments | P8-UAT-ASN-* | ☐ Verified |
| BR-TRAIN-COMP-01 | Completion Recording | P8-UAT-CMP-* | ☐ Verified |
| BR-TRAIN-MATRIX-01 | Training Matrix | P8-UAT-MTX-* | ☐ Verified |
| BR-TRAIN-REPORT-01 | Reports & Exports | P8-UAT-RPT-* | ☐ Verified |
| BR-TRAIN-NOTIFY-01 | Notifications | P8-UAT-NOT-* | ☐ Verified |
| BR-TRAIN-SEC-01 | Security & RBAC | P8-UAT-SEC-* | ☐ Verified |

---

## 6. Defect Summary

### 6.1 Defects by Severity

| Severity | Total Raised | Closed | Open | Accepted |
|----------|--------------|--------|------|----------|
| Critical | [#] | [#] | [#] | [#] |
| High | [#] | [#] | [#] | [#] |
| Medium | [#] | [#] | [#] | [#] |
| Low | [#] | [#] | [#] | [#] |
| **Total** | [#] | [#] | [#] | [#] |

### 6.2 Defect Log

| ID | Severity | UAT ID(s) | Summary | Status | Resolution |
|----|----------|-----------|---------|--------|------------|
| BUG-P8-001 | [Sev] | [UAT-ID] | [Brief description] | ☐ Open / ☐ Closed / ☐ Accepted | [Fix/Workaround] |
| BUG-P8-002 | [Sev] | [UAT-ID] | [Brief description] | ☐ Open / ☐ Closed / ☐ Accepted | [Fix/Workaround] |
| BUG-P8-003 | [Sev] | [UAT-ID] | [Brief description] | ☐ Open / ☐ Closed / ☐ Accepted | [Fix/Workaround] |
| ... | ... | ... | ... | ... | ... |

> **Sign-off Requirement:** All Critical and High severity defects must be Closed or formally Accepted before sign-off can proceed.

### 6.3 Accepted Defects

If any High/Medium defects are accepted for go-live, document justification:

| ID | Severity | Summary | Business Justification | Workaround | Target Fix Date |
|----|----------|---------|------------------------|------------|-----------------|
| [ID] | [Sev] | [Summary] | [Why accepted] | [Workaround] | [Date] |

---

## 7. Risks & Known Issues

### 7.1 Known Issues at Go-Live

| # | Issue Description | Impact | Mitigation | Owner |
|---|-------------------|--------|------------|-------|
| 1 | [Description] | [Impact to users/business] | [Workaround or fix plan] | [Name] |
| 2 | [Description] | [Impact to users/business] | [Workaround or fix plan] | [Name] |
| 3 | [Description] | [Impact to users/business] | [Workaround or fix plan] | [Name] |

### 7.2 Residual Risks

| # | Risk Description | Likelihood | Impact | Mitigation |
|---|------------------|------------|--------|------------|
| 1 | [Risk] | Low/Med/High | Low/Med/High | [Mitigation] |
| 2 | [Risk] | Low/Med/High | Low/Med/High | [Mitigation] |

---

## 8. UAT Participants

### 8.1 Testing Team

| Name | Role | Organisation | Contribution |
|------|------|--------------|--------------|
| [Name] | UAT Lead | [Org] | UAT coordination, test execution |
| [Name] | Business Tester | [Org] | Functional testing |
| [Name] | Business Tester | [Org] | Functional testing |
| [Name] | Technical Tester | [Org] | Integration & security testing |

### 8.2 Support Team

| Name | Role | Organisation | Contribution |
|------|------|--------------|--------------|
| [Name] | Dev Lead | [Org] | Defect resolution |
| [Name] | DevOps | [Org] | Environment support |
| [Name] | BA | [Org] | Requirements clarification |

---

## 9. Conclusion

Based on the execution of the UAT scenarios defined in `EHS_UAT_Phase8_Training.xlsx` and the detailed test cases in `test_cases_phase8.csv`:

- **[#]** test scenarios were executed
- **[#]** passed ([%] pass rate)
- **[#]** defects were raised
- **[#]** Critical/High defects remain outstanding: **[0 / #]**

### UAT Outcome

☐ **READY FOR PRODUCTION DEPLOYMENT**
> All Critical and High defects have been resolved. The functionality meets business requirements and is approved for production release.

☐ **NOT READY FOR PRODUCTION DEPLOYMENT**
> Outstanding Critical/High defects or significant functionality gaps prevent approval. Remediation required before re-testing.

☐ **CONDITIONAL APPROVAL**
> Approved with accepted known issues as documented in Section 6.3 and Section 7. Post-go-live remediation plan in place.

---

## 10. Sign-Off

By signing below, the undersigned stakeholders confirm that:

1. They have reviewed the UAT results for Phase 8 – Training & Competence Management
2. All Critical and High defects have been resolved or formally accepted
3. They approve (or do not approve) the release of Phase 8 to Production

### 10.1 Approval Signatures

| Name | Role | Organisation | Decision | Date | Signature |
|------|------|--------------|----------|------|-----------|
| [Name] | Business Owner / EHS Lead | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | IT / Systems Owner | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | Security / Compliance | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | Project Manager | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |
| [Name] | Quality Assurance Lead | [Org] | ☐ Approve / ☐ Reject | [Date] | _______________ |

### 10.2 Rejection Notes

If any stakeholder rejects the sign-off, document the reason below:

| Stakeholder | Reason for Rejection | Required Remediation |
|-------------|----------------------|----------------------|
| [Name] | [Reason] | [What must be fixed] |

---

## 11. Attachments

The following documents support this sign-off:

| # | Document | Location |
|---|----------|----------|
| 1 | UAT Execution Plan | `docs/UAT_PHASE8_EXECUTION_PLAN.md` |
| 2 | Completed UAT Test Sheet | `EHS_Portal_Phase8_UAT/02_Test_Cases/EHS_UAT_Phase8_Training.xlsx` |
| 3 | Evidence Pack | `EHS_Portal_Phase8_UAT/03_Evidence/` |
| 4 | Defect Log | `EHS_Portal_Phase8_UAT/04_Defects/` |
| 5 | Sample Reports (generated during UAT) | `EHS_Portal_Phase8_UAT/05_Reports/` |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | [Author] | Initial UAT Sign-off document for Phase 8 |
| | | | |

---

## 13. Document Control

| Item | Detail |
|------|--------|
| **Document Owner** | [Name, Role] |
| **Distribution** | Project Team, Stakeholders, Audit File |
| **Retention Period** | 7 years (or per organisational policy) |
| **Storage Location** | [SharePoint/File Server path] |

---

*End of Document*
