# System Architecture Document
# EHS Portal - Phase 1: Core Operational MVP

---

> **How to Use Diagrams in This Document**
>
> This document contains Mermaid diagram definitions enclosed in triple backticks with `mermaid` syntax.
> To convert these to images for Microsoft Word:
> 1. Copy the Mermaid code block (without the backticks)
> 2. Paste into [Mermaid Live Editor](https://mermaid.live/) or [draw.io](https://app.diagrams.net/)
> 3. Export as PNG or SVG
> 4. Insert the image into your Word document
>
> Alternatively, use VS Code with a Mermaid preview extension, or Markdown editors that support Mermaid rendering.

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | System Architecture Document - EHS Portal Phase 1 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Author** | Claude (Senior Architect) |
| **Date** | January 2025 |
| **Related Documents** | BRD_EHS_PORTAL_PHASE1.md, DATA_MODEL_PHASE1.md, API_SPEC_PHASE1.md |

---

## 1. Overview

### 1.1 Purpose

This document describes the technical architecture for Phase 1 of the EHS Portal. It covers:
- High-level system architecture
- Component interactions
- Technology stack
- Security architecture
- Deployment considerations

### 1.2 Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Simplicity** | Minimal viable architecture for Phase 1 |
| **Separation of Concerns** | Clear boundaries between frontend, backend, and database |
| **Security by Design** | Authentication and authorization built into every layer |
| **Scalability Ready** | Design allows for future horizontal scaling |
| **Maintainability** | Clean code structure with clear responsibilities |

---

## 2. High-Level System Architecture

### 2.1 System Context Diagram

```mermaid
flowchart TB
    subgraph Users["Users"]
        W[Worker]
        M[Manager]
        A[Admin]
    end

    subgraph EHS["EHS Portal"]
        FE[React Frontend<br/>Vite + JavaScript]
        BE[Node.js Backend<br/>Express API]
        DB[(PostgreSQL<br/>Database)]
    end

    W -->|HTTPS| FE
    M -->|HTTPS| FE
    A -->|HTTPS| FE

    FE -->|REST API<br/>JSON + JWT| BE
    BE -->|SQL| DB

    style FE fill:#61DAFB
    style BE fill:#68A063
    style DB fill:#336791
```

### 2.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.x | UI library |
| | Vite | 5.x | Build tool |
| | JavaScript | ES2022 | Programming language |
| | React Router | 6.x | Client-side routing |
| | Axios | 1.x | HTTP client |
| **Backend** | Node.js | 20.x LTS | Runtime environment |
| | Express | 4.x | Web framework |
| | pg | 8.x | PostgreSQL client |
| | bcrypt | 5.x | Password hashing |
| | jsonwebtoken | 9.x | JWT handling |
| **Database** | PostgreSQL | 15.x | Relational database |
| **Testing** | Playwright | Latest | E2E testing |
| | Jest | 29.x | Unit testing |

---

## 3. Component Architecture

### 3.1 Three-Tier Architecture

```mermaid
flowchart TB
    subgraph Presentation["Presentation Tier"]
        direction TB
        Browser[Web Browser]
        subgraph ReactApp["React Application"]
            Pages[Pages/Routes]
            Components[UI Components]
            State[State Management]
            APIClient[API Client]
        end
    end

    subgraph Application["Application Tier"]
        direction TB
        subgraph Express["Express Server"]
            Middleware[Middleware Layer]
            Routes[Route Handlers]
            Services[Business Logic]
            Validators[Input Validation]
        end
    end

    subgraph Data["Data Tier"]
        direction TB
        subgraph Postgres["PostgreSQL"]
            Tables[Tables]
            Indexes[Indexes]
            Constraints[Constraints]
        end
    end

    Browser --> ReactApp
    Pages --> Components
    Components --> State
    State --> APIClient

    APIClient -->|HTTP/JSON| Middleware
    Middleware --> Routes
    Routes --> Services
    Services --> Validators

    Services -->|pg client| Tables

    style Browser fill:#f5f5f5
    style ReactApp fill:#61DAFB
    style Express fill:#68A063
    style Postgres fill:#336791
```

### 3.2 Frontend Component Structure

```mermaid
flowchart TB
    subgraph App["React Application"]
        Router[React Router]

        subgraph PublicRoutes["Public Routes"]
            Login[LoginPage]
        end

        subgraph ProtectedRoutes["Protected Routes"]
            Layout[AppLayout]

            Dashboard[DashboardPage]
            Incidents[IncidentsPage]
            IncidentForm[IncidentFormPage]
            IncidentDetail[IncidentDetailPage]
            Inspections[InspectionsPage]
            InspectionForm[InspectionFormPage]
            InspectionDetail[InspectionDetailPage]

            subgraph AdminRoutes["Admin Only"]
                Sites[SitesPage]
                Templates[TemplatesPage]
            end
        end

        subgraph SharedComponents["Shared Components"]
            Header[Header]
            Sidebar[Sidebar]
            Cards[KPI Cards]
            Charts[Charts]
            Forms[Form Components]
            Tables[Data Tables]
        end
    end

    Router --> PublicRoutes
    Router --> ProtectedRoutes
    Layout --> Dashboard
    Layout --> Incidents
    Layout --> Inspections
    Layout --> AdminRoutes

    style App fill:#61DAFB
    style AdminRoutes fill:#DDA0DD
```

### 3.3 Backend Component Structure

```mermaid
flowchart TB
    subgraph Server["Express Server"]
        Entry[server.js<br/>Entry Point]

        subgraph MiddlewareStack["Middleware"]
            CORS[CORS]
            JSON[JSON Parser]
            Auth[Auth Middleware]
            ErrorHandler[Error Handler]
        end

        subgraph RouteHandlers["Routes"]
            AuthRoutes[/api/auth]
            SiteRoutes[/api/sites]
            TypeRoutes[/api/incident-types]
            IncidentRoutes[/api/incidents]
            TemplateRoutes[/api/inspection-templates]
            InspectionRoutes[/api/inspections]
            DashboardRoutes[/api/dashboard]
        end

        subgraph BusinessLayer["Services"]
            AuthService[AuthService]
            SiteService[SiteService]
            IncidentService[IncidentService]
            InspectionService[InspectionService]
            DashboardService[DashboardService]
        end

        subgraph DataLayer["Data Access"]
            DBPool[Connection Pool]
            Queries[SQL Queries]
        end
    end

    Entry --> MiddlewareStack
    MiddlewareStack --> RouteHandlers
    RouteHandlers --> BusinessLayer
    BusinessLayer --> DataLayer

    style Server fill:#68A063
    style MiddlewareStack fill:#FFE4B5
    style RouteHandlers fill:#98FB98
    style BusinessLayer fill:#87CEEB
    style DataLayer fill:#DDA0DD
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant BE as Express Backend
    participant DB as PostgreSQL

    U->>FE: Enter credentials
    FE->>BE: POST /api/auth/login
    BE->>DB: SELECT user WHERE email
    DB-->>BE: User record (hashed password)
    BE->>BE: bcrypt.compare(password, hash)

    alt Valid credentials
        BE->>BE: Generate JWT (24h expiry)
        BE-->>FE: 200 OK + JWT token
        FE->>FE: Store token (localStorage)
        FE-->>U: Redirect to Dashboard
    else Invalid credentials
        BE-->>FE: 401 Unauthorized
        FE-->>U: Show error message
    end
```

### 4.2 Authorization Model

```mermaid
flowchart TB
    subgraph Request["Incoming Request"]
        Token[JWT Token in Header]
    end

    subgraph AuthMiddleware["Auth Middleware"]
        Verify[Verify JWT Signature]
        Decode[Decode Payload]
        Extract[Extract User + Role]
    end

    subgraph RouteGuard["Route Authorization"]
        CheckRole{Check Role}
    end

    subgraph Actions["Allowed Actions"]
        Worker[Worker Actions<br/>Create incidents<br/>View own incidents<br/>View dashboard]
        Manager[Manager Actions<br/>+ View all incidents<br/>+ Update status<br/>+ Perform inspections]
        Admin[Admin Actions<br/>+ Manage sites<br/>+ Manage templates]
    end

    Token --> Verify
    Verify --> Decode
    Decode --> Extract
    Extract --> CheckRole

    CheckRole -->|role = worker| Worker
    CheckRole -->|role = manager| Manager
    CheckRole -->|role = admin| Admin

    style Worker fill:#90EE90
    style Manager fill:#87CEEB
    style Admin fill:#DDA0DD
```

### 4.3 Security Controls

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Transport** | HTTPS | TLS 1.3 encryption |
| **Authentication** | JWT | 24-hour expiry, HS256 signing |
| **Password Storage** | bcrypt | Cost factor  10 |
| **Input Validation** | Server-side | Express validators |
| **SQL Injection** | Parameterised queries | pg client placeholders |
| **XSS Prevention** | React escaping | Default JSX behaviour |
| **CORS** | Whitelist | Configured origins only |
| **Rate Limiting** | API throttling | (Phase 2) |

---

## 5. API Architecture

### 5.1 RESTful API Structure

```mermaid
flowchart LR
    subgraph Endpoints["API Endpoints"]
        direction TB
        Auth["/api/auth<br/>POST /login<br/>GET /me"]
        Sites["/api/sites<br/>GET /<br/>POST /<br/>PUT /:id"]
        Types["/api/incident-types<br/>GET /"]
        Incidents["/api/incidents<br/>GET /<br/>POST /<br/>GET /:id<br/>PUT /:id"]
        Templates["/api/inspection-templates<br/>GET /<br/>POST /<br/>GET /:id"]
        Inspections["/api/inspections<br/>GET /<br/>POST /<br/>GET /:id"]
        Dashboard["/api/dashboard<br/>GET /summary"]
    end

    Client[API Client] --> Auth
    Client --> Sites
    Client --> Types
    Client --> Incidents
    Client --> Templates
    Client --> Inspections
    Client --> Dashboard

    style Client fill:#61DAFB
    style Auth fill:#90EE90
    style Incidents fill:#FFB6C1
    style Inspections fill:#FFA07A
    style Dashboard fill:#DDA0DD
```

### 5.2 Request/Response Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant R as Route Handler
    participant S as Service
    participant D as Database

    C->>M: HTTP Request + JWT
    M->>M: Validate JWT
    M->>M: Check Permissions

    alt Authorized
        M->>R: Forward Request
        R->>R: Validate Input
        R->>S: Call Service Method
        S->>D: Execute Query
        D-->>S: Query Result
        S-->>R: Business Object
        R-->>C: 200 JSON Response
    else Unauthorized
        M-->>C: 401/403 Error
    end
```

---

## 6. Folder Structure

### 6.1 Project Structure

```
ehs-portal/
""" frontend/
"   """ public/
"   -   """" index.html
"   """ src/
"   -   """ api/
"   -   -   """" client.js           # Axios instance + interceptors
"   -   """ components/
"   -   -   """ common/             # Shared UI components
"   -   -   """ dashboard/          # Dashboard widgets
"   -   -   """ incidents/          # Incident components
"   -   -   """ inspections/        # Inspection components
"   -   -   """" layout/             # Header, Sidebar, Footer
"   -   """ contexts/
"   -   -   """" AuthContext.jsx     # Auth state management
"   -   """ hooks/
"   -   -   """" useAuth.js          # Auth custom hook
"   -   """ pages/
"   -   -   """ Dashboard.jsx
"   -   -   """ Incidents.jsx
"   -   -   """ Inspections.jsx
"   -   -   """ Login.jsx
"   -   -   """ Sites.jsx
"   -   -   """" Templates.jsx
"   -   """ utils/
"   -   -   """" helpers.js
"   -   """ App.jsx
"   -   """" main.jsx
"   """ package.json
"   """" vite.config.js
"
""" backend/
"   """ src/
"   -   """ config/
"   -   -   """" database.js         # DB connection config
"   -   """ middleware/
"   -   -   """ auth.js             # JWT verification
"   -   -   """" errorHandler.js     # Global error handling
"   -   """ routes/
"   -   -   """ auth.js
"   -   -   """ dashboard.js
"   -   -   """ incidentTypes.js
"   -   -   """ incidents.js
"   -   -   """ inspections.js
"   -   -   """ inspectionTemplates.js
"   -   -   """" sites.js
"   -   """ services/
"   -   -   """ authService.js
"   -   -   """ dashboardService.js
"   -   -   """ incidentService.js
"   -   -   """" inspectionService.js
"   -   """" server.js               # Entry point
"   """ migrations/
"   -   """ 001_create_users.sql
"   -   """ 002_create_sites.sql
"   -   """ 003_create_incidents.sql
"   -   """" 004_create_inspections.sql
"   """ seeds/
"   -   """" seed.sql
"   """" package.json
"
""" tests/
"   """ e2e/                        # Playwright tests
"   """" unit/                       # Jest tests
"
"""" docs/                           # Documentation
```

---

## 7. Deployment Architecture

### 7.1 Development Environment

```mermaid
flowchart LR
    subgraph Dev["Developer Machine"]
        Code[VS Code]
        Vite[Vite Dev Server<br/>:5173]
        Node[Node.js<br/>:3000]
        PG[PostgreSQL<br/>:5432]
    end

    Code --> Vite
    Code --> Node
    Vite -->|proxy /api| Node
    Node --> PG

    style Vite fill:#61DAFB
    style Node fill:#68A063
    style PG fill:#336791
```

### 7.2 Production Deployment (Conceptual)

```mermaid
flowchart TB
    subgraph Internet
        Users[Users]
    end

    subgraph Cloud["Cloud Infrastructure"]
        LB[Load Balancer]

        subgraph WebTier["Web Tier"]
            CDN[CDN / Static Hosting]
        end

        subgraph AppTier["Application Tier"]
            API1[Node.js Instance 1]
            API2[Node.js Instance 2]
        end

        subgraph DataTier["Data Tier"]
            DB[(PostgreSQL<br/>Primary)]
        end
    end

    Users --> LB
    LB --> CDN
    LB --> API1
    LB --> API2
    API1 --> DB
    API2 --> DB

    style CDN fill:#61DAFB
    style API1 fill:#68A063
    style API2 fill:#68A063
    style DB fill:#336791
```

---

## 8. Integration Points

### 8.1 Phase 1 Integrations

| Integration | Type | Description |
|-------------|------|-------------|
| Frontend - Backend | REST API | JSON over HTTPS |
| Backend - Database | pg client | Connection pooling |

### 8.2 Future Integration Points (Phase 2+)

| Phase | Integration | Purpose |
|-------|-------------|---------|
| Phase 2 | File Storage | Attachment uploads |
| Phase 3 | Export Service | CSV/PDF generation |
| Phase 5 | Email Service | Notifications |
| Phase 5 | SSO Provider | Enterprise authentication |

---

## 9. Non-Functional Considerations

### 9.1 Performance

| Metric | Target | Approach |
|--------|--------|----------|
| Page Load | < 3s | Code splitting, lazy loading |
| API Response | < 500ms | Connection pooling, indexes |
| Dashboard | < 2s | Optimised aggregation queries |

### 9.2 Scalability

| Component | Scaling Strategy |
|-----------|------------------|
| Frontend | CDN distribution |
| Backend | Horizontal pod scaling |
| Database | Read replicas (future) |

### 9.3 Reliability

| Concern | Mitigation |
|---------|------------|
| Server Crash | Process manager (PM2) |
| DB Connection | Connection pooling |
| Data Loss | Regular backups |

---

## 10. Appendices

### Appendix A: Environment Variables

| Variable | Layer | Description |
|----------|-------|-------------|
| PORT | Backend | Server port (default: 3000) |
| DATABASE_URL | Backend | PostgreSQL connection string |
| JWT_SECRET | Backend | JWT signing secret |
| JWT_EXPIRY | Backend | Token expiry (default: 24h) |
| VITE_API_URL | Frontend | Backend API base URL |

### Appendix B: Related Documents

- BRD_EHS_PORTAL_PHASE1.md - Business requirements
- DATA_MODEL_PHASE1.md - Database schema
- API_SPEC_PHASE1.md - API specification
- WORKFLOWS_PHASE1.md - User workflows



