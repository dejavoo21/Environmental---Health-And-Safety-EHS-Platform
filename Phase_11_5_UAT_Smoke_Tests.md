# Phase 11.5 UAT Smoke Tests - Final Validation

**Date:** February 11, 2026  
**Scope:** Validate all Phase 11.5 refinements (12 problems resolved)  
**Test Duration:** 15-20 minutes per user role

---

## 1. Admin User Role Tests

### 1.1 Sites Management (Problem 1: AdminSitesPage Layout)
- [ ] **Login as Admin** (email: `admin@ehs.local`, password: `Admin123!`)
- [ ] Navigate to **Admin → Sites**
- [ ] Verify **horizontal layout** with form on left, table on right
- [ ] **Create new site:**
  - [ ] Fill Name: "Test Manchester"
  - [ ] Fill Code: "TEST-MCR"
  - [ ] Select Country: "United Kingdom"
  - [ ] Fill City: "Manchester"
  - [ ] Select Timezone: "Europe/London"
  - [ ] Enter Latitude: "53.4808"
  - [ ] Enter Longitude: "-2.2426"
  - [ ] Click "Save Site"
  - [ ] Verify site appears in table with **Location** column showing "Manchester, GB"
  - [ ] Verify **Timezone** column shows "Europe/London"
- [ ] **Edit existing site:**
  - [ ] Click "Edit" on any site
  - [ ] Verify form populates with existing data
  - [ ] Change City to "Liverpool"
  - [ ] Click "Save"
  - [ ] Verify table updates immediately
- [ ] Verify **form is sticky** on scroll (stays visible on left)
- [ ] Test **dark theme:**
  - [ ] Toggle to dark theme (if theme switcher available)
  - [ ] Verify form is readable (not dark-on-dark)
  - [ ] Verify form buttons are visible

### 1.2 Training Management (Problem 2: Demo Data Seeding)
- [ ] Navigate to **Admin → Training**
- [ ] Verify 3 demo courses appear with validity periods:
  - [ ] "Fire Safety Awareness" (0.5h, 12 months)
  - [ ] "First Aid Basics" (1h, 24 months)
  - [ ] "Manual Handling & Ergonomics" (0.75h, 24 months)
- [ ] Create new training course:
  - [ ] Name: "Test Safety Course"
  - [ ] Validity: 12 months
  - [ ] Save and verify in list

### 1.3 Risk Register Text Visibility (Problem 3: CSS Fixes)
- [ ] Navigate to **Risk Register** (Risk → Risks)
- [ ] Verify **pagination info text is readable** (not faint #666)
  - [ ] Text should be dark in light theme
  - [ ] Text should be light in dark theme
- [ ] Check **sidebar empty message** is visible (not faint #999)
- [ ] Verify **top risks title** text is readable (bold #1a1a1a light / #e0e0e0 dark)
- [ ] Check **review dates** are visible (not faint, font-weight: 500)
- [ ] Test in **both light and dark themes**
- [ ] Scroll page - verify pagination buttons and info remain visible

### 1.4 Access Requests API Fix (Problem 4: Endpoint Paths)
- [ ] Navigate to **Admin → Access Requests**
- [ ] Verify page loads without blank screen
- [ ] Verify pending/approved/rejected counts display
- [ ] **Open a request:**
  - [ ] Click on any access request
  - [ ] Verify full request details load
  - [ ] Click "Approve" → verify success message (no 404 errors)
  - [ ] Test "Reject" button → verify success
- [ ] Check **browser console** (F12) - no 404 errors on `/admin/access-requests`

### 1.5 User Menu Dropdown (Problem 5: Width Expansion)
- [ ] Click **user menu** (top-right avatar)
- [ ] Verify menu shows all items clearly:
  - [ ] "Profile Settings" - fully visible
  - [ ] "Notification Settings" - **fully visible (not cropped)**
  - [ ] "Security" - fully visible
  - [ ] "Logout" - visible
- [ ] Menu width should be **240px minimum**
- [ ] Test **dark theme menu:**
  - [ ] Switch to dark theme
  - [ ] Click user menu again
  - [ ] Verify text is readable (#f6f1e7 on #2c313a)
  - [ ] Verify hover state works (background #3a414d)
  - [ ] Verify logout button styling (#ff6b6b red text)

### 1.6 Security Centre Layout (Problem 6: Full-Width Design)
- [ ] Navigate to **Security Centre** (Admin → Security)
- [ ] Verify page uses **full width** (not centered with max-width)
- [ ] Verify stats grid spans full page width
- [ ] Verify all sections and tables use full width
- [ ] Compare with **Integrations page** - should have similar full-width layout

### 1.7 Safety Advisor Enhancements (Problem 7: Debugging)
- [ ] Open any **high-risk task/incident/inspection**
- [ ] Verify **Safety Advisor panel** displays
- [ ] Open **browser console** (F12 → Console tab)
- [ ] Acknowledge a safety message if prompted
- [ ] Check console logs:
  - [ ] Should see: `[SafetyAdvisor] Attempting to acknowledge {entityType}/{entityId}`
  - [ ] Should see: `[SafetyAdvisor] Acknowledgement result:` with success flag
  - [ ] No `[ERROR]` messages about undefined entity

---

## 2. Manager User Role Tests

### 2.1 Access Requests Management
- [ ] Login as **Manager** (email: `manager@ehs.local`, password: `Manager123!`)
- [ ] Navigate to **Admin → Access Requests** (if manager has access)
- [ ] Verify can view pending requests
- [ ] Test filter buttons (Pending, Approved, Rejected)
- [ ] Verify API paths work (no console errors)

### 2.2 Risk Register Visibility
- [ ] Navigate to **Risk Register**
- [ ] Verify text is readable in manager view
- [ ] Test pagination - verify numbers are visible
- [ ] Check sidebar (top risks, upcoming reviews) text is readable

### 2.3 User Menu Dark Theme
- [ ] Click user menu
- [ ] Toggle to dark theme (if available)
- [ ] Verify menu remains readable
- [ ] Verify all menu items accessible

### 2.4 Permit Type Modal
- [ ] Navigate to **Permits → Types** (if available to manager)
- [ ] Click **"Edit"** on any permit type
- [ ] Modal should open with proper styling:
  - [ ] Inputs should be readable
  - [ ] Icon selector should be usable
  - [ ] Form fields should have good contrast
- [ ] Test **dark theme modal:**
  - [ ] Switch to dark theme
  - [ ] Click "Edit" again
  - [ ] Verify all inputs are readable
  - [ ] Verify scrolling works if form is long
  - [ ] Verify buttons are visible and clickable

---

## 3. Worker User Role Tests

### 3.1 Navigation & Access
- [ ] Login as **Worker** (email: `worker@ehs.local`, password: `Worker123!`)
- [ ] Verify cannot access Admin pages (should redirect)
- [ ] Verify can access dashboard and main features

### 3.2 Risk Register Access
- [ ] If worker can access Risk Register:
  - [ ] Navigate to **Risks**
  - [ ] Verify text is readable
  - [ ] Verify pagination info visible
  - [ ] Test pagination controls work

### 3.3 User Menu
- [ ] Click user menu (top-right)
- [ ] Verify menu shows only appropriate items for worker
- [ ] Test dark/light theme toggle
- [ ] Verify menu width is adequate (no text cropping)

### 3.4 Safety Advisor
- [ ] If worker encounters safety advisor (during incident/inspection):
  - [ ] Verify panel displays correctly
  - [ ] Verify can acknowledge if required
  - [ ] Check for console errors

---

## 4. Cross-Cutting Tests (All Roles)

### 4.1 Theme Consistency
- [ ] **Light Theme:**
  - [ ] Text colors should be dark (#1a1a1a, #4a4a4a)
  - [ ] Backgrounds should be light/white
  - [ ] All pages should be readable
- [ ] **Dark Theme:**
  - [ ] Text colors should be light (#f6f1e7, #e0e0e0, #b0b0b0)
  - [ ] Backgrounds should be dark (#2c313a, #3a414d)
  - [ ] All pages should be readable
  - [ ] Scrollbars should be visible

### 4.2 WCAG AA Compliance
- [ ] Text contrast should meet 7:1 minimum
- [ ] No text should be hard to read due to color
- [ ] All interactive elements should be keyboard accessible
- [ ] Focus indicators should be visible

### 4.3 Browser Console
- [ ] Press F12 to open DevTools → Console tab
- [ ] Navigate through all updated pages
- [ ] Verify no `404` errors for:
  - [ ] `/api/access-requests/admin` endpoints
  - [ ] `/api/sites` endpoints
- [ ] Verify no `TypeError` or `undefined` errors
- [ ] Expected logs should be present (SafetyAdvisor logs)

### 4.4 Performance
- [ ] Pages should load in < 3 seconds
- [ ] Forms should respond immediately to input
- [ ] Modals should appear without lag
- [ ] Scrolling should be smooth

### 4.5 Data Integrity
- [ ] Created sites should persist on page reload
- [ ] Form data should be saved correctly
- [ ] Location coordinates should be stored and retrieved
- [ ] Training course data should display with correct validity periods

---

## 5. Test Results Summary

### Passed Tests
- [ ] AdminSitesPage horizontal layout
- [ ] Training demo data (3 courses)
- [ ] Risk Register text visibility (4 classes fixed)
- [ ] Access Requests API paths
- [ ] User menu dropdown width
- [ ] Security Centre full-width layout
- [ ] Safety Advisor debugging logs
- [ ] Permit Type Modal dark theme
- [ ] Theme consistency (light + dark)
- [ ] WCAG AA contrast compliance
- [ ] No console errors

### Issues Found
*(List any issues discovered during testing)*

---

## 6. Sign-Off

**Tested By:** ________________  
**Date:** ________________  
**All Tests Passed:** ☐ Yes ☐ No  
**Approved for Production:** ☐ Yes ☐ No  

**Notes/Comments:**
```
[Add any comments or known issues]
```

---

## Test Execution Commands

If running automated tests:

```bash
# Run all Phase 11.5 tests
npm test -- --testPathPattern="phase11\.5|Phase11\.5"

# Run specific test suites
npm test AdminSitesPage.test.jsx
npm test PermitTypesPage.test.jsx
npm test RisksListPage.test.jsx
npm test AdminAccessRequestsPage.test.jsx
```

---

**End of UAT Smoke Tests Document**
