# User Workflows Document
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
| **Document Title** | User Workflows Document - EHS Portal Phase 1 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Author** | Claude (Senior Architect) |
| **Date** | January 2025 |
| **Related Documents** | BRD_EHS_PORTAL_PHASE1.md, USER_STORIES.md, USER_JOURNEYS.md |

---

## 1. Overview

This document describes the key user workflows for Phase 1 of the EHS Portal. Each workflow includes:
- Actor(s) involved
- Preconditions and postconditions
- Step-by-step flow diagram
- Exception handling

---

## 2. Authentication Workflows

### 2.1 User Login Flow

**Actor:** All Users (Worker, Manager, Admin)

**Preconditions:**
- User has valid account
- User is not already logged in

**Postconditions:**
- User is authenticated
- JWT token stored in browser
- User redirected to Dashboard

```mermaid
flowchart TD
    Start([User Opens App]) --> CheckAuth{Already<br/>Logged In?}

    CheckAuth -->|Yes| Dashboard[Go to Dashboard]
    CheckAuth -->|No| LoginPage[Show Login Page]

    LoginPage --> EnterCreds[Enter Email & Password]
    EnterCreds --> Submit[Click Login]
    Submit --> Validate{Valid<br/>Credentials?}

    Validate -->|Yes| StoreToken[Store JWT Token]
    StoreToken --> Dashboard

    Validate -->|No| ShowError[Show Error Message]
    ShowError --> EnterCreds

    Dashboard --> End([User Authenticated])

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style ShowError fill:#FFB6C1
```

### 2.2 Session Expiry Flow

```mermaid
flowchart TD
    Action([User Takes Action]) --> APICall[Make API Request]
    APICall --> CheckToken{Token<br/>Valid?}

    CheckToken -->|Yes| ProcessRequest[Process Request]
    ProcessRequest --> Response[Return Response]
    Response --> Continue([Continue Working])

    CheckToken -->|No/Expired| Return401[Return 401 Unauthorized]
    Return401 --> ClearToken[Clear Stored Token]
    ClearToken --> RedirectLogin[Redirect to Login]
    RedirectLogin --> ShowMessage[Show Session Expired Message]
    ShowMessage --> LoginFlow([Login Flow])

    style Continue fill:#90EE90
    style ShowMessage fill:#FFE4B5
```

---

## 3. Incident Management Workflows

### 3.1 Create Incident Flow

**Actor:** Worker, Manager, Admin

**Preconditions:**
- User is logged in
- At least one site exists
- At least one incident type exists

**Postconditions:**
- New incident created with status "Open"
- Incident visible in incident list
- Dashboard metrics updated

```mermaid
flowchart TD
    Start([User on Incidents Page]) --> ClickNew[Click 'New Incident']
    ClickNew --> ShowForm[Display Incident Form]

    ShowForm --> FillForm[Fill Required Fields]

    subgraph FormFields["Required Fields"]
        Title[Title]
        Type[Incident Type]
        Site[Site]
        Severity[Severity]
        Date[Date & Time]
        Desc[Description]
    end

    FillForm --> Title
    FillForm --> Type
    FillForm --> Site
    FillForm --> Severity
    FillForm --> Date
    FillForm --> Desc

    Title --> ValidateForm{All Fields<br/>Valid?}
    Type --> ValidateForm
    Site --> ValidateForm
    Severity --> ValidateForm
    Date --> ValidateForm
    Desc --> ValidateForm

    ValidateForm -->|No| ShowErrors[Highlight Invalid Fields]
    ShowErrors --> FillForm

    ValidateForm -->|Yes| Submit[Submit Form]
    Submit --> SaveDB[(Save to Database)]
    SaveDB --> ShowSuccess[Show Success Message]
    ShowSuccess --> RedirectList[Redirect to Incident List]
    RedirectList --> End([Incident Created])

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style ShowErrors fill:#FFB6C1
    style FormFields fill:#E6F3FF
```

### 3.2 Incident Status Workflow

**Actor:** Manager, Admin

**Preconditions:**
- Incident exists
- User has manager or admin role

**Business Rules:**
- Status can only progress forward: Open ' Under Investigation ' Closed
- Workers cannot change status

```mermaid
stateDiagram-v2
    [*] --> Open: Incident Created

    Open --> UnderInvestigation: Manager starts investigation
    Open --> Closed: Manager closes directly

    UnderInvestigation --> Closed: Investigation complete

    Closed --> [*]

    note right of Open
        Initial status for all
        new incidents
    end note

    note right of UnderInvestigation
        Incident being
        actively reviewed
    end note

    note right of Closed
        No further action
        required
    end note
```

### 3.3 View Incidents Flow (Role-Based)

```mermaid
flowchart TD
    Start([User Views Incidents]) --> CheckRole{User Role?}

    CheckRole -->|Worker| FilterOwn[Filter: reported_by = current_user]
    CheckRole -->|Manager| ShowAll[Show All Incidents]
    CheckRole -->|Admin| ShowAll

    FilterOwn --> LoadList[Load Incident List]
    ShowAll --> LoadList

    LoadList --> ApplyFilters[Apply User Filters]

    subgraph Filters["Available Filters"]
        StatusFilter[Status Filter]
        SiteFilter[Site Filter]
    end

    ApplyFilters --> StatusFilter
    ApplyFilters --> SiteFilter

    StatusFilter --> DisplayResults[Display Filtered Results]
    SiteFilter --> DisplayResults

    DisplayResults --> ClickRow{User Clicks<br/>Row?}
    ClickRow -->|Yes| ViewDetail[Show Incident Detail]
    ClickRow -->|No| End([Continue Browsing])

    ViewDetail --> End

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style Filters fill:#E6F3FF
```

---

## 4. Inspection Management Workflows

### 4.1 Create Inspection Template Flow

**Actor:** Admin only

**Preconditions:**
- User is logged in as Admin

**Postconditions:**
- New template available for inspections
- Template items created in order

```mermaid
flowchart TD
    Start([Admin on Templates Page]) --> ClickNew[Click 'New Template']
    ClickNew --> ShowForm[Display Template Form]

    ShowForm --> EnterName[Enter Template Name]
    EnterName --> EnterDesc[Enter Description]
    EnterDesc --> AddItems[Add Checklist Items]

    subgraph ItemEntry["For Each Item"]
        ItemLabel[Enter Item Label]
        ItemCategory[Select Category]
        ItemOrder[Set Sort Order]
    end

    AddItems --> ItemLabel
    ItemLabel --> ItemCategory
    ItemCategory --> ItemOrder
    ItemOrder --> MoreItems{Add More<br/>Items?}
    MoreItems -->|Yes| AddItems
    MoreItems -->|No| ValidateTemplate{Template<br/>Valid?}

    ValidateTemplate -->|No| ShowError[Show Validation Error]
    ShowError --> AddItems

    ValidateTemplate -->|Yes| SaveTemplate[Save Template]
    SaveTemplate --> SaveItems[Save Template Items]
    SaveItems --> ShowSuccess[Show Success Message]
    ShowSuccess --> RedirectList[Redirect to Template List]
    RedirectList --> End([Template Created])

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style ShowError fill:#FFB6C1
    style ItemEntry fill:#F0E68C
```

### 4.2 Perform Inspection Flow

**Actor:** Manager, Admin

**Preconditions:**
- User has manager or admin role
- At least one template exists
- At least one site exists

**Postconditions:**
- Inspection record created
- All item responses recorded
- Overall result calculated (Pass/Fail)

```mermaid
flowchart TD
    Start([User on Inspections Page]) --> ClickNew[Click 'New Inspection']
    ClickNew --> ShowForm[Display Inspection Form]

    ShowForm --> SelectSite[Select Site]
    SelectSite --> SelectTemplate[Select Template]
    SelectTemplate --> LoadItems[Load Template Items]

    LoadItems --> DisplayChecklist[Display Checklist]

    subgraph Checklist["For Each Item"]
        ShowItem[Display Item Label]
        SelectResult[Select: OK / Not OK / N/A]
        AddComment[Optional: Add Comment]
    end

    DisplayChecklist --> ShowItem
    ShowItem --> SelectResult
    SelectResult --> AddComment
    AddComment --> NextItem{More<br/>Items?}
    NextItem -->|Yes| ShowItem
    NextItem -->|No| CheckComplete{All Items<br/>Answered?}

    CheckComplete -->|No| HighlightMissing[Highlight Missing Items]
    HighlightMissing --> ShowItem

    CheckComplete -->|Yes| AddNotes[Optional: Add Inspector Notes]
    AddNotes --> Submit[Submit Inspection]
    Submit --> CalcResult{Any Item<br/>= Not OK?}

    CalcResult -->|Yes| SetFail[Set Result = FAIL]
    CalcResult -->|No| SetPass[Set Result = PASS]

    SetFail --> SaveInspection[(Save Inspection)]
    SetPass --> SaveInspection

    SaveInspection --> SaveResponses[(Save Responses)]
    SaveResponses --> ShowResult[Display Result]
    ShowResult --> End([Inspection Complete])

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style SetFail fill:#FFB6C1
    style SetPass fill:#90EE90
    style Checklist fill:#FFA07A
```

### 4.3 View Inspection History Flow

```mermaid
flowchart TD
    Start([User on Inspections Page]) --> LoadList[Load Inspection List]
    LoadList --> ApplyFilters[Apply Filters]

    subgraph Filters["Available Filters"]
        SiteFilter[Site Filter]
        TemplateFilter[Template Filter]
        ResultFilter[Result Filter]
        DateFilter[Date Range]
    end

    ApplyFilters --> SiteFilter
    ApplyFilters --> TemplateFilter
    ApplyFilters --> ResultFilter
    ApplyFilters --> DateFilter

    SiteFilter --> DisplayList[Display Filtered List]
    TemplateFilter --> DisplayList
    ResultFilter --> DisplayList
    DateFilter --> DisplayList

    DisplayList --> ClickInspection{Click<br/>Inspection?}
    ClickInspection -->|No| End([Continue Browsing])
    ClickInspection -->|Yes| LoadDetail[Load Inspection Detail]

    LoadDetail --> ShowHeader[Show Header Info]
    ShowHeader --> ShowResponses[Show All Item Responses]
    ShowResponses --> ShowNotes[Show Inspector Notes]
    ShowNotes --> End

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style Filters fill:#E6F3FF
```

---

## 5. Site Management Workflows

### 5.1 Manage Sites Flow

**Actor:** Admin only

```mermaid
flowchart TD
    Start([Admin on Sites Page]) --> LoadSites[Load Sites List]
    LoadSites --> DisplaySites[Display Sites Table]

    DisplaySites --> Action{User Action?}

    Action -->|Add| ShowAddForm[Show Add Site Form]
    ShowAddForm --> EnterName[Enter Site Name]
    EnterName --> EnterCode[Enter Site Code]
    EnterCode --> ValidateAdd{Valid?}
    ValidateAdd -->|No| ShowAddError[Show Validation Error]
    ShowAddError --> EnterName
    ValidateAdd -->|Yes| SaveNew[(Save New Site)]
    SaveNew --> RefreshList[Refresh Sites List]

    Action -->|Edit| ShowEditForm[Show Edit Site Form]
    ShowEditForm --> ModifyFields[Modify Fields]
    ModifyFields --> ValidateEdit{Valid?}
    ValidateEdit -->|No| ShowEditError[Show Validation Error]
    ShowEditError --> ModifyFields
    ValidateEdit -->|Yes| SaveEdit[(Save Changes)]
    SaveEdit --> RefreshList

    Action -->|Deactivate| ConfirmDeactivate{Confirm<br/>Deactivate?}
    ConfirmDeactivate -->|No| DisplaySites
    ConfirmDeactivate -->|Yes| SetInactive[(Set is_active = false)]
    SetInactive --> RefreshList

    RefreshList --> DisplaySites
    DisplaySites --> End([Done])

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style ShowAddError fill:#FFB6C1
    style ShowEditError fill:#FFB6C1
```

---

## 6. Dashboard Workflows

### 6.1 View Dashboard Flow

**Actor:** All Users

```mermaid
flowchart TD
    Start([User Accesses Dashboard]) --> LoadKPIs[Load KPI Data]
    LoadKPIs --> DisplayCards[Display KPI Cards]

    subgraph KPICards["KPI Cards"]
        Total[Total Incidents]
        Open[Open Incidents]
        Inc30[Incidents Last 30 Days]
        Insp30[Inspections Last 30 Days]
        Failed[Failed Inspections 30 Days]
    end

    DisplayCards --> Total
    DisplayCards --> Open
    DisplayCards --> Inc30
    DisplayCards --> Insp30
    DisplayCards --> Failed

    Total --> LoadCharts[Load Chart Data]
    Open --> LoadCharts
    Inc30 --> LoadCharts
    Insp30 --> LoadCharts
    Failed --> LoadCharts

    LoadCharts --> DisplayCharts[Display Charts]

    subgraph Charts["Dashboard Charts"]
        TypeChart[Incidents by Type<br/>Bar Chart]
        TrendChart[Severity Trend<br/>Line Chart]
    end

    DisplayCharts --> TypeChart
    DisplayCharts --> TrendChart

    TypeChart --> LoadRecent[Load Recent Activity]
    TrendChart --> LoadRecent

    LoadRecent --> DisplayRecent[Display Recent Lists]

    subgraph RecentLists["Recent Activity"]
        RecentInc[Recent Incidents]
        RecentInsp[Recent Inspections]
    end

    DisplayRecent --> RecentInc
    DisplayRecent --> RecentInsp

    RecentInc --> ClickItem{Click<br/>Item?}
    RecentInsp --> ClickItem

    ClickItem -->|Yes| NavigateDetail[Navigate to Detail Page]
    ClickItem -->|No| End([Dashboard Loaded])

    NavigateDetail --> End

    style Start fill:#f5f5f5
    style End fill:#90EE90
    style KPICards fill:#DDA0DD
    style Charts fill:#87CEEB
    style RecentLists fill:#F0E68C
```

### 6.2 Dashboard Data Refresh

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant API as Backend API
    participant DB as Database

    U->>D: Navigate to Dashboard
    D->>API: GET /api/dashboard/summary
    API->>DB: Query incident counts
    API->>DB: Query inspection counts
    API->>DB: Query incidents by type
    API->>DB: Query severity trends
    API->>DB: Query recent items
    DB-->>API: Aggregated data
    API-->>D: Dashboard summary JSON
    D-->>U: Render KPIs, Charts, Lists

    Note over D: Auto-refresh every 5 minutes
    D->>API: GET /api/dashboard/summary
    API-->>D: Updated data
    D-->>U: Update displays
```

---

## 7. Complete User Journey Overview

### 7.1 Worker Journey

```mermaid
flowchart LR
    subgraph WorkerJourney["Worker Daily Journey"]
        direction TB
        Login[Login] --> ViewDash[View Dashboard]
        ViewDash --> CheckKPIs[Review Safety KPIs]
        CheckKPIs --> Decision{Event<br/>Occurred?}
        Decision -->|Yes| Report[Report Incident]
        Report --> Fill[Fill Incident Form]
        Fill --> Submit[Submit]
        Submit --> ViewOwn[View Own Incidents]
        Decision -->|No| ViewOwn
        ViewOwn --> Logout[Logout]
    end

    style Login fill:#90EE90
    style Logout fill:#f5f5f5
    style Report fill:#FFB6C1
```

### 7.2 Manager Journey

```mermaid
flowchart LR
    subgraph ManagerJourney["Manager Daily Journey"]
        direction TB
        Login[Login] --> ViewDash[View Dashboard]
        ViewDash --> CheckOpen[Check Open Incidents]
        CheckOpen --> Review{Incidents<br/>to Review?}
        Review -->|Yes| UpdateStatus[Update Status]
        UpdateStatus --> CheckInsp{Inspection<br/>Due?}
        Review -->|No| CheckInsp
        CheckInsp -->|Yes| Perform[Perform Inspection]
        Perform --> Record[Record Results]
        Record --> ViewHistory[View History]
        CheckInsp -->|No| ViewHistory
        ViewHistory --> Logout[Logout]
    end

    style Login fill:#90EE90
    style Logout fill:#f5f5f5
    style UpdateStatus fill:#87CEEB
    style Perform fill:#FFA07A
```

### 7.3 Admin Journey

```mermaid
flowchart LR
    subgraph AdminJourney["Admin Setup Journey"]
        direction TB
        Login[Login] --> Config{System<br/>Setup?}
        Config -->|Sites| ManageSites[Manage Sites]
        ManageSites --> AddSite[Add/Edit Sites]
        Config -->|Templates| ManageTemplates[Manage Templates]
        ManageTemplates --> CreateTemplate[Create Template]
        CreateTemplate --> AddItems[Add Checklist Items]
        AddSite --> ViewDash[View Dashboard]
        AddItems --> ViewDash
        Config -->|No| ViewDash
        ViewDash --> AllTasks[Perform Manager Tasks]
        AllTasks --> Logout[Logout]
    end

    style Login fill:#90EE90
    style Logout fill:#f5f5f5
    style ManageSites fill:#DDA0DD
    style ManageTemplates fill:#DDA0DD
```

---

## 8. Exception Handling

### 8.1 Common Error Scenarios

| Workflow | Error Scenario | System Response |
|----------|----------------|-----------------|
| Login | Invalid credentials | Show error, allow retry |
| Login | Account locked | Show contact admin message |
| Create Incident | Required field missing | Highlight field, show message |
| Create Incident | Server error | Show error, preserve form data |
| Perform Inspection | Connection lost mid-inspection | Save draft locally (future) |
| Dashboard Load | API timeout | Show cached data with warning |
| Any Action | Session expired | Redirect to login with message |

### 8.2 Error Flow Diagram

```mermaid
flowchart TD
    Action([User Action]) --> APICall[Make API Call]
    APICall --> CheckResponse{Response<br/>Status?}

    CheckResponse -->|200-299| Success[Process Success]
    Success --> UpdateUI[Update UI]
    UpdateUI --> Continue([Continue])

    CheckResponse -->|400| BadRequest[Show Validation Errors]
    BadRequest --> FixInput[User Fixes Input]
    FixInput --> Action

    CheckResponse -->|401| Unauthorized[Session Expired]
    Unauthorized --> ClearAuth[Clear Auth State]
    ClearAuth --> Login([Redirect to Login])

    CheckResponse -->|403| Forbidden[Show Access Denied]
    Forbidden --> GoBack([Navigate Back])

    CheckResponse -->|404| NotFound[Show Not Found Message]
    NotFound --> GoBack

    CheckResponse -->|500| ServerError[Show Server Error]
    ServerError --> Retry{Retry?}
    Retry -->|Yes| Action
    Retry -->|No| GoBack

    style Continue fill:#90EE90
    style Login fill:#FFE4B5
    style BadRequest fill:#FFB6C1
    style ServerError fill:#FFB6C1
```

---

## 9. Appendices

### Appendix A: Workflow to User Story Mapping

| Workflow | User Stories | Test Cases |
|----------|--------------|------------|
| User Login | US-AUTH-01, US-AUTH-02 | TC-AUTH-01 to TC-AUTH-06 |
| Create Incident | US-INC-01 | TC-INC-01, TC-INC-02 |
| View Incidents | US-INC-02, US-INC-03 | TC-INC-03, TC-INC-04 |
| Update Incident Status | US-INC-04 | TC-INC-05, TC-INC-06 |
| Create Template | US-INSP-01, US-INSP-02 | TC-INSP-01, TC-INSP-02 |
| Perform Inspection | US-INSP-03 | TC-INSP-03, TC-INSP-04 |
| View Inspection History | US-INSP-04 | TC-INSP-05, TC-INSP-06 |
| Manage Sites | US-SITE-01, US-SITE-02 | TC-SITE-01, TC-SITE-02 |
| View Dashboard | US-DASH-01 to US-DASH-04 | TC-DASH-01 to TC-DASH-04 |

### Appendix B: Role Permissions Summary

| Workflow | Worker | Manager | Admin |
|----------|--------|---------|---------------|
| Login | - | - | - |
| View Dashboard | - | - | - |
| Create Incident | - | - | - |
| View Own Incidents | - | - | - |
| View All Incidents | - | - | - |
| Update Incident Status | - | - | - |
| Perform Inspection | - | - | - |
| View Inspection History | Read-only | - | - |
| Manage Sites | - | - | - |
| Manage Templates | - | - | - |



