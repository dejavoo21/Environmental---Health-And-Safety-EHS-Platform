# Phase 11 Test Strategy

## Scope
- Safety Advisor panel
- Weather integration
- Site legislation & PPE mapping
- Safety Moments workflows
- Pre-task safety view

- **High-Risk Workflows: Mandatory Safety Advisor Acknowledgement**
	- Enforcement of acknowledgement for high-risk permits, incidents, inspections, etc.
	- UI disables main action until acknowledgement.
	- API blocks main action if not acknowledged.
	- Audit logging of acknowledgement events.
	- Traceability to C-IDs, BR-IDs, TC-IDs.

## Approach
- Unit tests for new services
- Integration tests for API endpoints
- End-to-end tests for Safety Advisor workflows
- Accessibility tests (WCAG 2.1 AA)
- Performance tests for weather and advisor panels

## Tools
- Jest, Supertest, Cypress, Axe

## Traceability
- TC-IDs mapped to C-IDs and US-IDs

---

See qa/test_cases_phase11.csv for test cases.