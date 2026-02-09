# Phase 11 Architecture

## Overview
Phase 11 extends the EHS Portal with Safety Advisor & Site Intelligence features. It introduces new services and entities, integrating with existing notification and audit systems.

## New Services
- WeatherService: Fetches and caches weather data for sites.
- SafetyAdvisorService: Provides safety intelligence, recommendations, and pre-task guidance.
- LegislationService: Maps site locations to relevant legislation and compliance requirements.

## Data Flow
- WeatherService updates weather_cache for site_locations.
- SafetyAdvisorService aggregates safety_moments, ppe_recommendations, and site_legislation_refs.
- LegislationService links site_locations to legislation.

## Integration
- NotificationService: Sends alerts based on weather, legislation, or safety moments.
- AuditService: Logs safety advisor actions and compliance events.

## Security
- All new endpoints require authentication and audit logging.

---

See DATA_MODEL_PHASE11.md and API_SPEC_PHASE11.md for details.