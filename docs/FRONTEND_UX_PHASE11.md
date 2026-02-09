# FRONTEND UX – Phase 11: Safety Advisor & Site Intelligence

This document defines the **frontend UX** for Phase 11, focusing on the Safety Advisor, Safety Moments, weather integration, PPE recommendations, and site legislation surfaces.

The goal is to provide a **consistent, lightweight, and non-intrusive** experience that:

- Gives users **essential safety intelligence** at a glance.
- Integrates smoothly into **existing pages** (no jarring new layouts).
- Works in both **light and dark themes**.
- Aligns with the design system from Phases 5–10 (cards, panels, typography).

---

## 1. UX Principles

1. **Contextual First, Never Blocking (for Phase 11)**  
   - Safety Advisor surfaces **information and recommendations**, not hard blocks.  
   - “Acknowledge” is encouraged but not required to proceed (for now).

2. **Consistent Placement**  
   - Safety Advisor appears in a **predictable location** on each page:  
     typically **right-hand side** on desktop, or **top section** on mobile.

3. **Single Panel, Multiple Signals**  
   - Weather, Safety Moment, PPE advice, and legislation references are grouped into one coherent panel instead of scattered widgets.

4. **Readable at a Glance**  
   - One main highlight line for each section (Weather, PPE, Legislation, Safety Moment).  
   - Detail available on expand/click.

5. **Non-Disruptive**  
   - No modals for Safety Advisor by default.  
   - Uses standard **card/panel** style already defined in Phases 6–10.

---

## 1.1 Navigation

The global sidebar is now **grouped and collapsible** to reduce admin-page length. The **Admin** group is role-gated and includes Phase 11 admin destinations:

- **Admin:** Safety Moments, Site Legislation, PPE Rules (visible to `admin`/`manager` as permitted).

This keeps Safety Advisor surfaces discoverable without overwhelming non-admin users.

---

## 2. Core Components

### 2.1 `<SafetyAdvisorPanel />`

#### Phase 11: High-Risk Workflows – Mandatory Acknowledgement

**New for Phase 11:**

- For any workflow flagged as **high-risk** (e.g., high-risk permits, incidents, or inspections), the Safety Advisor panel must enforce **mandatory acknowledgement** before the user can proceed.
  - The **Acknowledge** button is **required** and must be clicked to enable the main action (e.g., submit, approve, close, etc.).
  - The main action button (e.g., "Submit Permit", "Close Incident") is **disabled** until acknowledgement is complete.
  - A helper text must be shown: _"You must review and acknowledge the Safety Advisor before proceeding with high-risk work."_
  - The acknowledgement event must be traceable (see API and audit requirements).
  - This enforcement applies only to workflows/entities marked as high-risk by backend/config.

**UI/UX Acceptance Criteria:**

- The Safety Advisor panel visually indicates when acknowledgement is required (e.g., warning color, icon, or badge).
- The Acknowledge button is prominent and accessible.
- The main action button is disabled with a tooltip or helper text until acknowledgement.
- Helper text is clear and visible near the disabled action.
- On acknowledgement, the main action button is enabled and the event is logged.

**Traceability:**

- All requirements are traceable to C-IDs, BR-IDs, and TC-IDs in the BRD and test cases.

**See also:** [API_SPEC_PHASE11.md], [BRD_EHS_PORTAL_PHASE11.md], [test_cases_phase11.csv]

**Location:** `src/components/safety/SafetyAdvisorPanel.jsx` (or similar)  
**Usage:** Shared, reusable component.

**Props (expected shape):**

```ts
type SafetyAdvisorProps = {
  siteId: string;
  entityType?: 'incident' | 'inspection' | 'permit' | 'action' | 'training';
  entityId?: string;
  // optional pre-fetched summary to avoid duplicate calls
  safetySummary?: SafetySummary;
  // optional callback when user acknowledges
  onAcknowledge?: (details: { entityType?: string; entityId?: string }) => void;
};

type SafetySummary = {
  siteName: string;
  siteLocation?: string; // e.g. "Cape Town, ZA"
  weather?: {
    status: 'ok' | 'loading' | 'error';
    tempC?: number;
    condition?: string; // e.g. "Clear", "Heavy Rain"
    feelsLikeC?: number;
    windKph?: number;
    icon?: string; // provider condition icon or mapped icon name
    updatedAt?: string; // ISO time
    summaryText?: string;
  };
  safetyMoment?: {
    id: string;
    title: string;
    body: string;
    category?: string;
    acknowledged?: boolean;
  };
  ppeAdvice?: {
    summary: string;
    items: string[]; // ["Hard hat", "Hi-vis vest", ...]
  };
  legislation?: {
    title: string;
    refCode?: string;
    category?: 'safety' | 'environmental' | 'medical' | 'other';
    linkUrl?: string;
  }[];
  lastAcknowledgedAt?: string | null;
};
