# Phase 7 Implementation Checklist
## Chemical & Permit Management

| Item | Detail |
|------|--------|
| Phase | 7 – Chemical & Permit Management |
| Created | 2026-02-04 |
| Status | Not Started |

---

## Summary

| Category | Total | Complete | In Progress | Not Started |
|----------|-------|----------|-------------|-------------|
| Data Model | 14 | 0 | 0 | 14 |
| Backend - Chemicals | 18 | 0 | 0 | 18 |
| Backend - Permits | 24 | 0 | 0 | 24 |
| Frontend - Chemicals | 12 | 0 | 0 | 12 |
| Frontend - Permits | 16 | 0 | 0 | 16 |
| Testing | 10 | 0 | 0 | 10 |
| Documentation | 6 | 0 | 0 | 6 |
| **TOTAL** | **100** | **0** | **0** | **100** |

---

## 1. Data Model

### 1.1 Tables

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| DM-01 | Create `chemicals` table | ⬜ Not Started | | |
| DM-02 | Create `chemical_ghs_hazards` table | ⬜ Not Started | | |
| DM-03 | Create `chemical_locations` table | ⬜ Not Started | | |
| DM-04 | Create `chemical_inventory` table | ⬜ Not Started | | |
| DM-05 | Create `incident_chemicals` table | ⬜ Not Started | | |
| DM-06 | Create `action_chemicals` table | ⬜ Not Started | | |
| DM-07 | Create `permit_types` table | ⬜ Not Started | | |
| DM-08 | Create `permit_type_controls` table | ⬜ Not Started | | |
| DM-09 | Create `permits` table | ⬜ Not Started | | |
| DM-10 | Create `permit_controls` table | ⬜ Not Started | | |
| DM-11 | Create `permit_workers` table | ⬜ Not Started | | |
| DM-12 | Create `permit_state_history` table | ⬜ Not Started | | |
| DM-13 | Create `incident_permits` table | ⬜ Not Started | | |
| DM-14 | Create `inspection_permits` table | ⬜ Not Started | | |

### 1.2 Seeds

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| DM-15 | Seed GHS hazard classes | ⬜ Not Started | | 9 classes |
| DM-16 | Seed system permit types | ⬜ Not Started | | Hot Work, CSE, WAH, Electrical |
| DM-17 | Seed permit type controls | ⬜ Not Started | | Default controls per type |

---

## 2. Backend - Chemical Management

### 2.1 Models & Repositories

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| BE-CHEM-01 | Chemical model | ⬜ Not Started | | |
| BE-CHEM-02 | Chemical repository | ⬜ Not Started | | |
| BE-CHEM-03 | ChemicalGhsHazard model | ⬜ Not Started | | |
| BE-CHEM-04 | ChemicalLocation model | ⬜ Not Started | | |
| BE-CHEM-05 | ChemicalLocation repository | ⬜ Not Started | | |
| BE-CHEM-06 | ChemicalInventory model | ⬜ Not Started | | |

### 2.2 Services

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| BE-CHEM-07 | ChemicalService - create | ⬜ Not Started | | |
| BE-CHEM-08 | ChemicalService - read/list | ⬜ Not Started | | |
| BE-CHEM-09 | ChemicalService - update | ⬜ Not Started | | |
| BE-CHEM-10 | ChemicalService - status change | ⬜ Not Started | | |
| BE-CHEM-11 | ChemicalService - search/filter | ⬜ Not Started | | |
| BE-CHEM-12 | ChemicalService - GHS hazard mgmt | ⬜ Not Started | | |
| BE-CHEM-13 | ChemicalLocationService | ⬜ Not Started | | |
| BE-CHEM-14 | SDS upload integration | ⬜ Not Started | | Uses AttachmentService |
| BE-CHEM-15 | SDS version management | ⬜ Not Started | | |
| BE-CHEM-16 | SDS expiry notifications | ⬜ Not Started | | |

### 2.3 Controllers & Routes

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| BE-CHEM-17 | Chemical controller | ⬜ Not Started | | |
| BE-CHEM-18 | Chemical routes | ⬜ Not Started | | |

---

## 3. Backend - Permit Management

### 3.1 Models & Repositories

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| BE-PERM-01 | PermitType model | ⬜ Not Started | | |
| BE-PERM-02 | PermitType repository | ⬜ Not Started | | |
| BE-PERM-03 | PermitTypeControl model | ⬜ Not Started | | |
| BE-PERM-04 | Permit model | ⬜ Not Started | | |
| BE-PERM-05 | Permit repository | ⬜ Not Started | | |
| BE-PERM-06 | PermitControl model | ⬜ Not Started | | |
| BE-PERM-07 | PermitWorker model | ⬜ Not Started | | |
| BE-PERM-08 | PermitStateHistory model | ⬜ Not Started | | |

### 3.2 Services

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| BE-PERM-09 | PermitTypeService | ⬜ Not Started | | |
| BE-PERM-10 | PermitService - create | ⬜ Not Started | | |
| BE-PERM-11 | PermitService - read/list | ⬜ Not Started | | |
| BE-PERM-12 | PermitService - update | ⬜ Not Started | | |
| BE-PERM-13 | PermitService - submit | ⬜ Not Started | | |
| BE-PERM-14 | PermitService - approve/reject | ⬜ Not Started | | |
| BE-PERM-15 | PermitService - activate | ⬜ Not Started | | |
| BE-PERM-16 | PermitService - suspend/resume | ⬜ Not Started | | |
| BE-PERM-17 | PermitService - close | ⬜ Not Started | | |
| BE-PERM-18 | PermitService - cancel | ⬜ Not Started | | |
| BE-PERM-19 | PermitControlService | ⬜ Not Started | | |
| BE-PERM-20 | PermitWorkerService | ⬜ Not Started | | |
| BE-PERM-21 | PermitNumberService | ⬜ Not Started | | Auto-generate |
| BE-PERM-22 | PermitConflictService | ⬜ Not Started | | |
| BE-PERM-23 | Permit board query | ⬜ Not Started | | |
| BE-PERM-24 | Permit expiry cron job | ⬜ Not Started | | |
| BE-PERM-25 | Permit PDF generation | ⬜ Not Started | | |
| BE-PERM-26 | Permit notifications | ⬜ Not Started | | |

### 3.3 Controllers & Routes

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| BE-PERM-27 | PermitType controller | ⬜ Not Started | | |
| BE-PERM-28 | PermitType routes | ⬜ Not Started | | |
| BE-PERM-29 | Permit controller | ⬜ Not Started | | |
| BE-PERM-30 | Permit routes | ⬜ Not Started | | |

---

## 4. Frontend - Chemical Management

### 4.1 Pages

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| FE-CHEM-01 | ChemicalRegisterPage | ⬜ Not Started | | List view |
| FE-CHEM-02 | ChemicalDetailPage | ⬜ Not Started | | |
| FE-CHEM-03 | ChemicalCreatePage | ⬜ Not Started | | |
| FE-CHEM-04 | ChemicalEditPage | ⬜ Not Started | | |

### 4.2 Components

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| FE-CHEM-05 | GHSHazardIcons | ⬜ Not Started | | Pictogram display |
| FE-CHEM-06 | GHSClassificationSelector | ⬜ Not Started | | Multi-select |
| FE-CHEM-07 | SDSUploadModal | ⬜ Not Started | | |
| FE-CHEM-08 | SDSDocumentList | ⬜ Not Started | | |
| FE-CHEM-09 | SDSStatusBadge | ⬜ Not Started | | Valid/Expiring/Expired |
| FE-CHEM-10 | StorageLocationModal | ⬜ Not Started | | |
| FE-CHEM-11 | StorageLocationTable | ⬜ Not Started | | |
| FE-CHEM-12 | ChemicalStatusBadge | ⬜ Not Started | | Active/Phase Out/Banned |

---

## 5. Frontend - Permit Management

### 5.1 Pages

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| FE-PERM-01 | PermitBoardPage | ⬜ Not Started | | Real-time board |
| FE-PERM-02 | PermitListPage | ⬜ Not Started | | |
| FE-PERM-03 | PermitDetailPage | ⬜ Not Started | | |
| FE-PERM-04 | PermitCreatePage | ⬜ Not Started | | Multi-step wizard |
| FE-PERM-05 | PermitTypesPage | ⬜ Not Started | | Admin only |

### 5.2 Components

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| FE-PERM-06 | PermitCard | ⬜ Not Started | | Board card |
| FE-PERM-07 | PermitStatusBadge | ⬜ Not Started | | |
| FE-PERM-08 | CountdownTimer | ⬜ Not Started | | Real-time |
| FE-PERM-09 | PermitFormWizard | ⬜ Not Started | | 3-step form |
| FE-PERM-10 | WorkerSelector | ⬜ Not Started | | User search + manual |
| FE-PERM-11 | ControlChecklistTabs | ⬜ Not Started | | Pre/During/Post |
| FE-PERM-12 | ControlChecklistItem | ⬜ Not Started | | |
| FE-PERM-13 | ConflictWarning | ⬜ Not Started | | |
| FE-PERM-14 | StateHistoryTimeline | ⬜ Not Started | | |
| FE-PERM-15 | PermitApprovalModal | ⬜ Not Started | | Approve/Reject |
| FE-PERM-16 | PermitActivationModal | ⬜ Not Started | | |
| FE-PERM-17 | PermitCloseModal | ⬜ Not Started | | |
| FE-PERM-18 | PermitSuspendModal | ⬜ Not Started | | |

---

## 6. Testing

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| TEST-01 | Chemical model unit tests | ⬜ Not Started | | |
| TEST-02 | Permit model unit tests | ⬜ Not Started | | |
| TEST-03 | Permit state machine tests | ⬜ Not Started | | Critical |
| TEST-04 | Chemical API integration tests | ⬜ Not Started | | |
| TEST-05 | Permit API integration tests | ⬜ Not Started | | |
| TEST-06 | Conflict detection tests | ⬜ Not Started | | |
| TEST-07 | E2E - Chemical creation flow | ⬜ Not Started | | |
| TEST-08 | E2E - Permit full lifecycle | ⬜ Not Started | | |
| TEST-09 | E2E - Permit board | ⬜ Not Started | | |
| TEST-10 | Performance - Board with 50 permits | ⬜ Not Started | | Target <2s |

---

## 7. Documentation

| ID | Task | Status | Owner | Notes |
|----|------|--------|-------|-------|
| DOC-01 | API documentation (Swagger) | ⬜ Not Started | | |
| DOC-02 | User guide - Chemicals | ⬜ Not Started | | |
| DOC-03 | User guide - Permits | ⬜ Not Started | | |
| DOC-04 | Admin guide - Permit types | ⬜ Not Started | | |
| DOC-05 | Update ARCHITECTURE.md | ⬜ Not Started | | |
| DOC-06 | Update DATA_MODEL.md | ⬜ Not Started | | |

---

## 8. Sign-off

| Milestone | Target Date | Actual Date | Sign-off |
|-----------|-------------|-------------|----------|
| Data Model Complete | Week 1 | | |
| Backend APIs Complete | Week 4 | | |
| Frontend Complete | Week 6 | | |
| Testing Complete | Week 7 | | |
| UAT Sign-off | Week 8 | | |
| Production Deploy | Week 8 | | |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not Started |
| 🔄 | In Progress |
| ✅ | Complete |
| ❌ | Blocked |
| ⏸️ | On Hold |
