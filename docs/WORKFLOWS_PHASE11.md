# Phase 11 Workflows

## Safety Moments
- Users submit safety moments.
- Moments reviewed and shared via SafetyAdvisorService.
- NotificationService alerts relevant users.

## Safety Advisor Panel
- Aggregates site intelligence, weather, PPE, and legislation.
- Provides pre-task safety guidance.

## Weather Integration
- WeatherService fetches and caches weather for site_locations.
- Alerts generated for hazardous conditions.

## Site Legislation & PPE Mapping
- LegislationService maps sites to compliance requirements.
- PPE recommendations generated for tasks/sites.

## Pre-task Safety View
- SafetyAdvisorService provides contextual safety guidance before tasks.

---

See API_SPEC_PHASE11.md and IMPLEMENTATION_PLAN_PHASE11.md for details.