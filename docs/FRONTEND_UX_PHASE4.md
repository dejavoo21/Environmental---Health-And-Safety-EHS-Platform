# Frontend UX Specification – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

Phase 4 adds a notification centre to the EHS Portal, enabling users to stay informed about actions, incidents, and escalations. The UX focuses on non-intrusive but accessible notifications that don't disrupt workflow.

### 1.1 Design Principles

1. **Non-intrusive**: Notifications don't interrupt current work
2. **Accessible**: Always visible in header, one click away
3. **Actionable**: Each notification leads to the relevant item
4. **Configurable**: Users control what they receive

---

## 2. Component Specifications

### 2.1 Notification Bell Icon (Header)

**Location:** Header, right side, before user profile dropdown

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]    Dashboard   Incidents   Inspections   Actions   Reports  │
│                                                    🔔⁵   [User ▼]   │
└─────────────────────────────────────────────────────────────────────┘
                                                      ↑
                                              Bell with badge
```

**States:**

| State | Visual |
|-------|--------|
| No unread | Bell icon, grey, no badge |
| 1-99 unread | Bell icon, primary color, red badge with number |
| 100+ unread | Bell icon, primary color, badge shows "99+" |
| Hovering | Bell icon, slight highlight |

**Badge Design:**
- Position: Top-right corner of bell icon
- Size: 18px diameter minimum
- Color: Red (#dc3545)
- Font: Bold, white, 10-11px
- Border: 2px white border (for contrast)

**Interaction:**
- Click → Opens notification dropdown
- Badge updates via polling (every 30 seconds)

---

### 2.2 Notification Dropdown

**Trigger:** Click on bell icon

**Visual Design:**

```
┌──────────────────────────────────────┐
│ Notifications            [Mark all ✓]│
├──────────────────────────────────────┤
│ 🔴 New action assigned               │
│    Review fire extinguisher...       │
│    5 minutes ago                     │
├──────────────────────────────────────┤
│ ⚠️ Action overdue                    │
│    Safety audit follow-up            │
│    2 hours ago                       │
├──────────────────────────────────────┤
│ ⚪ Incident created                  │
│    Minor slip in warehouse           │
│    Yesterday                         │
├──────────────────────────────────────┤
│ ... (up to 10 items)                 │
├──────────────────────────────────────┤
│         View all notifications →     │
└──────────────────────────────────────┘
```

**Specifications:**

| Property | Value |
|----------|-------|
| Width | 360px |
| Max height | 450px (scrollable if more) |
| Items shown | Last 10 notifications |
| Position | Aligned right, below bell icon |
| Shadow | Medium drop shadow |
| Border radius | 8px |

**Notification Item Design:**

| Element | Style |
|---------|-------|
| Icon | Type-specific (action, incident, escalation) |
| Unread indicator | Blue dot (●) left of icon |
| Title | Bold, 14px, primary text color |
| Message | Regular, 13px, secondary text color, 1-line truncate |
| Time | Light grey, 12px, relative format |
| Hover | Light grey background |

**Priority Indicators:**

| Priority | Icon/Style |
|----------|------------|
| High | Red indicator dot, red icon |
| Normal | Blue indicator dot (if unread) |
| Low | No special indicator |

**Actions:**
- Click item → Navigate to related entity, mark as read
- Click "Mark all ✓" → Mark all as read, clear badge
- Click "View all notifications" → Navigate to /notifications

---

### 2.3 Notifications Page (/notifications)

**Route:** `/notifications`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Notifications                                │
├─────────────────────────────────────────────────────────────────────┤
│ Filters:                                                            │
│ [Type ▼] [Status ▼] [Date Range ▼]           [Mark all as read]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 New action assigned                           5 minutes ago  │ │
│ │    Review fire extinguisher compliance at Site A                │ │
│ │    Source: Incident #INC-001                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Action overdue (ESCALATED)                    2 hours ago    │ │
│ │    Safety audit follow-up - 3 days overdue                      │ │
│ │    Assigned to: John Smith                                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⚪ High-severity incident reported               Yesterday      │ │
│ │    Critical equipment failure in Building C                     │ │
│ │    Severity: Critical                                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ... more notifications ...                                          │
│                                                                      │
│ ◄ Previous    Page 1 of 3    Next ►                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Filter Options:**

| Filter | Options |
|--------|---------|
| Type | All, Actions, Incidents, System |
| Status | All, Unread, Read |
| Date Range | Last 7 days, Last 30 days, Custom range |

**Notification Card (Full Page):**

| Element | Description |
|---------|-------------|
| Icon | Type-specific icon |
| Title | Notification title (bold) |
| Message | Full message (not truncated) |
| Metadata | Source link, assignee, severity (if applicable) |
| Timestamp | Relative time (e.g., "5 minutes ago") |
| Actions | Click to navigate |

**Pagination:**
- 20 items per page
- Standard pagination controls

---

### 2.4 Notification Preferences Page

**Location:** Settings → Notification Settings
**Route:** `/settings/notifications`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Notification Settings                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Email Notifications                                                  │
│ ──────────────────                                                   │
│ Choose which events trigger email notifications.                     │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [✓] Action assigned to me                                       │ │
│ │     Get notified when someone assigns an action to you          │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ [✓] My actions become overdue                                   │ │
│ │     Get reminded when your assigned actions pass their due date │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ [✓] High-severity incidents in my organisation                  │ │
│ │     Get alerted immediately when critical incidents are reported│ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ [ ] Inspections with failed items                               │ │
│ │     Get notified when inspections have failed items             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Digest Emails                                                        │
│ ────────────                                                         │
│ Receive a summary email with recent incidents and upcoming actions.  │
│                                                                      │
│ Frequency:    [Daily ▼]                                              │
│ Delivery time: [07:00 ▼]                                             │
│ Day (weekly):  [Monday ▼]  (only shown if Weekly selected)           │
│                                                                      │
│ In-App Notifications                                                 │
│ ────────────────────                                                 │
│ [✓] Enable in-app notifications                                      │
│     Show notifications in the bell icon dropdown                     │
│                                                                      │
│                                          [Cancel]  [Save Changes]    │
└─────────────────────────────────────────────────────────────────────┘
```

**Form Elements:**

| Field | Type | Options |
|-------|------|---------|
| Email toggles | Checkbox | On/Off |
| Digest frequency | Select | Daily, Weekly, None |
| Digest time | Select | 00:00 - 23:00 (hourly) |
| Digest day | Select | Sunday - Saturday (only for Weekly) |
| In-app enabled | Checkbox | On/Off |

**Behaviour:**
- Save button only active when changes exist
- Success toast on save: "Notification preferences saved"
- Cancel reverts unsaved changes

---

### 2.5 Escalation Settings (Admin Only)

**Location:** Admin → Organisation → Escalation Settings
**Route:** `/admin/organisation` (existing page, new section)

**Layout (Section):**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Escalation Settings                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Configure automatic escalation for overdue actions.                  │
│                                                                      │
│ [✓] Enable escalations                                               │
│                                                                      │
│ Days overdue before escalation:  [3 ▼]                               │
│                                                                      │
│ Notify:                                                              │
│ [✓] All organisation managers                                        │
│ [ ] Custom email address:  [safety-team@company.com    ]             │
│                                                                      │
│                                                   [Save Changes]     │
└─────────────────────────────────────────────────────────────────────┘
```

**Visibility:** Admin role only

**Validation:**
- Days: 1-30
- Custom email: Valid email format (if checked)

---

## 3. Navigation Updates

### 3.1 Header Changes

Add bell icon to header component:

```jsx
// Header.jsx
<header className="header">
  <nav>{/* existing nav items */}</nav>

  <div className="header-right">
    <NotificationBell />  {/* NEW */}
    <UserDropdown />
  </div>
</header>
```

### 3.2 User Dropdown Addition

Add "Notification Settings" link:

```
┌────────────────────────┐
│ John Smith             │
│ admin@company.com      │
├────────────────────────┤
│ My Profile             │
│ Notification Settings  │  ← NEW
│ ───────────────────    │
│ Log Out                │
└────────────────────────┘
```

### 3.3 Routes

| Route | Component | Access |
|-------|-----------|--------|
| /notifications | NotificationsPage | All users |
| /settings/notifications | NotificationPreferencesPage | All users |

---

## 4. Component Hierarchy

```
src/
├── components/
│   ├── layout/
│   │   └── Header.jsx  (updated)
│   │
│   └── notifications/
│       ├── NotificationBell.jsx       # Bell icon with badge
│       ├── NotificationDropdown.jsx   # Dropdown panel
│       ├── NotificationItem.jsx       # Single notification row
│       ├── NotificationCard.jsx       # Full-page card
│       └── NotificationFilters.jsx    # Filter controls
│
├── pages/
│   ├── NotificationsPage.jsx          # Full notifications page
│   └── settings/
│       └── NotificationPreferencesPage.jsx
│
├── hooks/
│   ├── useNotifications.js            # Fetch notifications
│   ├── useNotificationCount.js        # Poll unread count
│   └── useNotificationPreferences.js  # Preferences CRUD
│
└── context/
    └── NotificationContext.jsx        # Global notification state
```

---

## 5. State Management

### 5.1 NotificationContext

```jsx
const NotificationContext = createContext({
  unreadCount: 0,
  notifications: [],
  loading: false,
  markAsRead: (id) => {},
  markAllAsRead: () => {},
  refreshCount: () => {}
});
```

### 5.2 Polling Strategy

```javascript
// useNotificationCount.js
const POLL_INTERVAL = 30000; // 30 seconds

useEffect(() => {
  const fetchCount = async () => {
    const { data } = await api.get('/notifications/unread-count');
    setCount(data.count);
  };

  fetchCount();
  const interval = setInterval(fetchCount, POLL_INTERVAL);

  return () => clearInterval(interval);
}, []);
```

---

## 6. Notification Types & Icons

| Type | Icon | Color |
|------|------|-------|
| action_assigned | 📋 (clipboard) | Blue |
| action_overdue | ⏰ (clock) | Orange |
| action_escalated | ⚠️ (warning) | Red |
| incident_high_severity | 🚨 (siren) | Red |
| inspection_failed | ❌ (x-mark) | Orange |
| system | ℹ️ (info) | Grey |

---

## 7. Responsive Design

### 7.1 Mobile (< 768px)

**Bell Icon:**
- Same position in header
- Badge positioned same

**Dropdown:**
- Full width on mobile
- Slides up from bottom as a sheet

**Notifications Page:**
- Single column layout
- Cards stack vertically
- Filters collapse to single row

### 7.2 Tablet (768px - 1024px)

- Dropdown: 320px width
- Page: Same as desktop

---

## 8. Accessibility

| Element | Requirement |
|---------|-------------|
| Bell icon | `aria-label="Notifications, X unread"` |
| Badge | `role="status"`, `aria-live="polite"` |
| Dropdown | `role="menu"`, keyboard navigable |
| Notification item | `role="menuitem"`, focus visible |
| Checkboxes | Proper labels, keyboard accessible |

---

## 9. Toast Notifications

For immediate feedback on actions:

| Action | Toast Message | Duration |
|--------|---------------|----------|
| Mark as read | (no toast) | - |
| Mark all as read | "All notifications marked as read" | 3s |
| Save preferences | "Notification preferences saved" | 3s |
| Save escalation | "Escalation settings saved" | 3s |
| Error | "Failed to load notifications" | 5s |

---

## 10. Loading States

| Component | Loading State |
|-----------|---------------|
| Bell badge | Spinner replacing number |
| Dropdown | Skeleton items (3 rows) |
| Full page | Skeleton cards |
| Preferences | Form disabled, spinner on save button |

---

## 11. Empty States

**Dropdown (no notifications):**
```
┌──────────────────────────────────────┐
│ Notifications                        │
├──────────────────────────────────────┤
│                                      │
│     📭 No notifications yet          │
│                                      │
│     You're all caught up!            │
│                                      │
└──────────────────────────────────────┘
```

**Full Page (filtered, no results):**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│              📭 No notifications match your filters                  │
│                                                                      │
│              Try adjusting your filters or check back later.         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Animation & Transitions

| Element | Animation |
|---------|-----------|
| Dropdown open | Fade in + slide down (200ms) |
| Dropdown close | Fade out + slide up (150ms) |
| Badge count change | Subtle pulse (300ms) |
| Mark as read | Fade unread indicator (200ms) |
| New notification | Highlight flash (500ms) |
