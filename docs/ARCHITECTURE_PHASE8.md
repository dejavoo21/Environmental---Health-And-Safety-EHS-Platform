# Architecture – EHS Portal Phase 8
## Training & Competence Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 8 – Training & Competence Management |

---

## 1. Overview

Phase 8 adds Training & Competence Management through:

1. **Training API Layer** - Endpoints for courses, sessions, assignments, completions, matrix
2. **Training Services** - Business logic for assignment rules, expiry, matrix calculation
3. **Background Jobs** - Expiry checks, reminder notifications, auto-assignments
4. **Training Frontend** - Course catalogue, My Training, Training Matrix, Admin views
5. **Integration Points** - Actions, Incidents, Analytics, Notifications

---

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                                  │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐               │
│  │  CourseCatalog │  │   MyTraining   │  │  TrainingMatrix │               │
│  │  - CourseList  │  │  - Assigned    │  │  - UserCourse   │               │
│  │  - CourseDetail│  │  - History     │  │  - RoleCourse   │               │
│  │  - CourseForm  │  │  - Sessions    │  │  - SiteCourse   │               │
│  └───────┬────────┘  └───────┬────────┘  └────────┬────────┘               │
│          │                   │                    │                         │
│  ┌───────┴──────┐  ┌─────────┴───────┐  ┌────────┴────────┐                │
│  │SessionManager│  │AssignmentManager│  │ CompletionForm  │                │
│  │- Calendar    │  │- Bulk Assign   │  │ - RecordResult  │                │
│  │- Enrollment  │  │- Rule Config   │  │ - Evidence      │                │
│  └──────────────┘  └────────────────┘  └─────────────────┘                │
│                                                                             │
│                    ┌────────────────────────┐                               │
│                    │     TrainingContext    │                               │
│                    │   (State Management)   │                               │
│                    └───────────┬────────────┘                               │
│                                │                                            │
│                    ┌───────────▼────────────┐                               │
│                    │       API Client       │                               │
│                    │    (Axios + Auth)      │                               │
│                    └───────────┬────────────┘                               │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js/Express)                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                           API Routes                                   │ │
│  │  /api/training/categories         - Category CRUD                     │ │
│  │  /api/training/courses            - Course catalogue CRUD             │ │
│  │  /api/training/courses/:id/sessions - Course sessions                 │ │
│  │  /api/training/sessions           - Session management                │ │
│  │  /api/training/sessions/:id/enrollments - Enrollment management       │ │
│  │  /api/training/assignments        - Assignment management             │ │
│  │  /api/training/assignments/bulk   - Bulk assignment                   │ │
│  │  /api/training/assignment-rules   - Auto-assignment rules             │ │
│  │  /api/training/completions        - Completion recording              │ │
│  │  /api/training/my-training        - User's training view              │ │
│  │  /api/training/matrix             - Training matrix data              │ │
│  │  /api/training/reports            - Report exports                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                  │                                          │
│  ┌───────────────────────────────┼───────────────────────────────────────┐ │
│  │                        Services Layer                                  │ │
│  │                               │                                        │ │
│  │  ┌─────────────────┐  ┌──────▼──────────┐  ┌─────────────────────────┐ │ │
│  │  │ CourseService   │  │AssignmentService│  │ CompletionService       │ │ │
│  │  │ - CRUD          │  │ - create        │  │ - record                │ │ │
│  │  │ - search        │  │ - bulkAssign    │  │ - verify                │ │ │
│  │  │ - prerequisites │  │ - applyRules    │  │ - calculateExpiry       │ │ │
│  │  └─────────────────┘  │ - updateStatus  │  │ - fromSession           │ │ │
│  │                       └─────────────────┘  └─────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │ SessionService  │  │ MatrixService   │  │ TrainingReportService   │ │ │
│  │  │ - schedule      │  │ - userMatrix    │  │ - userHistory           │ │ │
│  │  │ - enroll        │  │ - roleMatrix    │  │ - courseCompletions     │ │ │
│  │  │ - attendance    │  │ - siteMatrix    │  │ - matrixSnapshot        │ │ │
│  │  │ - complete      │  │ - gapAnalysis   │  │ - generatePDF           │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │               TrainingNotificationService                        │   │ │
│  │  │  - sendAssignmentNotification()                                  │   │ │
│  │  │  - sendReminderNotification()                                    │   │ │
│  │  │  - sendExpiryWarning()                                           │   │ │
│  │  │  - sendOverdueEscalation()                                       │   │ │
│  │  └────────────────────────────────────────────┬────────────────────┘   │ │
│  │                                               │                        │ │
│  │  ┌────────────────────────────────────────────▼────────────────────┐   │ │
│  │  │                Integration Services                              │   │ │
│  │  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐  │   │ │
│  │  │  │ActionService │  │IncidentService│  │AnalyticsAggregation  │  │   │ │
│  │  │  │(Phase 2)     │  │(Phase 1)      │  │(Phase 5)             │  │   │ │
│  │  │  │- training    │  │- training gap │  │- training KPIs       │  │   │ │
│  │  │  │  actions     │  │  analysis     │  │- compliance rates    │  │   │ │
│  │  │  └──────────────┘  └───────────────┘  └──────────────────────┘  │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Scheduled Jobs (node-cron)                         │ │
│  │  ┌─────────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │ │
│  │  │ExpiryCheckJob   │  │ReminderJob        │  │AutoAssignmentJob     │  │ │
│  │  │ 01:00 UTC       │  │ 06:00 UTC         │  │ 02:00 UTC            │  │ │
│  │  │ - check expires │  │ - due date remind │  │ - new user rules     │  │ │
│  │  │ - update status │  │ - expiry warning  │  │ - role change rules  │  │ │
│  │  │ - create refresh│  │ - overdue notify  │  │                      │  │ │
│  │  └─────────────────┘  └───────────────────┘  └──────────────────────┘  │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │ TrainingAnalyticsAggregationJob - 03:00 UTC                       │  │ │
│  │  │ - Calculate compliance rates per org/site                         │  │ │
│  │  │ - Count assignments, completions, overdue                         │  │ │
│  │  │ - Update analytics_daily_summary                                  │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL Database                               │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Training Tables                                  │   │
│  │  training_categories, training_courses, training_course_prerequisites│   │
│  │  training_sessions, training_session_enrollments                     │   │
│  │  training_assignments, training_assignment_rules                     │   │
│  │  training_completions                                                │   │
│  │  training_role_requirements, training_site_requirements              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Modified Tables                                  │   │
│  │  attachments (+ training_course_id, training_completion_id)          │   │
│  │  actions (+ training_course_id)                                      │   │
│  │  analytics_daily_summary (+ training metrics)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Descriptions

### 3.1 CourseService

Manages the training course catalogue.

```typescript
interface CourseService {
  // CRUD
  createCourse(orgId: UUID, data: CreateCourseDTO): Promise<Course>;
  getCourse(courseId: UUID): Promise<CourseWithDetails>;
  updateCourse(courseId: UUID, data: UpdateCourseDTO): Promise<Course>;
  archiveCourse(courseId: UUID): Promise<void>;
  
  // Queries
  listCourses(orgId: UUID, filters: CourseFilters): Promise<PaginatedCourses>;
  searchCourses(orgId: UUID, query: string): Promise<Course[]>;
  getCoursesByCategory(orgId: UUID, categoryId: UUID): Promise<Course[]>;
  
  // Prerequisites
  setPrerequisites(courseId: UUID, prereqIds: UUID[]): Promise<void>;
  checkPrerequisites(userId: UUID, courseId: UUID): Promise<PrerequisiteStatus>;
  
  // Refresher linking
  linkRefresherCourse(initialId: UUID, refresherId: UUID): Promise<void>;
}
```

### 3.2 SessionService

Manages instructor-led training sessions.

```typescript
interface SessionService {
  // CRUD
  createSession(courseId: UUID, data: CreateSessionDTO): Promise<Session>;
  getSession(sessionId: UUID): Promise<SessionWithEnrollments>;
  updateSession(sessionId: UUID, data: UpdateSessionDTO): Promise<Session>;
  cancelSession(sessionId: UUID, reason: string): Promise<void>;
  
  // Enrollment
  enrollUser(sessionId: UUID, userId: UUID, enrolledBy: UUID): Promise<Enrollment>;
  bulkEnroll(sessionId: UUID, userIds: UUID[], enrolledBy: UUID): Promise<Enrollment[]>;
  cancelEnrollment(enrollmentId: UUID): Promise<void>;
  getWaitlist(sessionId: UUID): Promise<Enrollment[]>;
  
  // Attendance
  recordAttendance(sessionId: UUID, attendance: AttendanceRecord[]): Promise<void>;
  completeSession(sessionId: UUID): Promise<CompletionSummary>;
  
  // Queries
  listSessions(orgId: UUID, filters: SessionFilters): Promise<PaginatedSessions>;
  getUpcomingSessions(courseId: UUID): Promise<Session[]>;
  getUserSessions(userId: UUID): Promise<Session[]>;
}
```

### 3.3 AssignmentService

Manages training assignments and rules.

```typescript
interface AssignmentService {
  // Individual assignments
  createAssignment(data: CreateAssignmentDTO): Promise<Assignment>;
  getAssignment(assignmentId: UUID): Promise<AssignmentWithDetails>;
  updateAssignment(assignmentId: UUID, data: UpdateAssignmentDTO): Promise<Assignment>;
  cancelAssignment(assignmentId: UUID, reason: string): Promise<void>;
  waiveAssignment(assignmentId: UUID, reason: string, approvedBy: UUID): Promise<void>;
  
  // Bulk operations
  bulkAssignByUsers(courseId: UUID, userIds: UUID[], options: AssignmentOptions): Promise<Assignment[]>;
  bulkAssignByRole(courseId: UUID, roleName: string, options: AssignmentOptions): Promise<Assignment[]>;
  bulkAssignBySite(courseId: UUID, siteId: UUID, options: AssignmentOptions): Promise<Assignment[]>;
  
  // Rules
  createRule(data: CreateRuleDTO): Promise<AssignmentRule>;
  updateRule(ruleId: UUID, data: UpdateRuleDTO): Promise<AssignmentRule>;
  deactivateRule(ruleId: UUID): Promise<void>;
  applyRulesForNewUser(userId: UUID): Promise<Assignment[]>;
  applyRulesForRoleChange(userId: UUID, newRole: string): Promise<Assignment[]>;
  
  // Status management
  markInProgress(assignmentId: UUID): Promise<void>;
  updateOverdueStatus(): Promise<number>; // Returns count updated
  
  // Queries
  getUserAssignments(userId: UUID, filters: AssignmentFilters): Promise<PaginatedAssignments>;
  getCourseAssignments(courseId: UUID, filters: AssignmentFilters): Promise<PaginatedAssignments>;
  getOverdueAssignments(orgId: UUID): Promise<Assignment[]>;
}
```

### 3.4 CompletionService

Records and manages training completions.

```typescript
interface CompletionService {
  // Recording
  recordCompletion(data: CreateCompletionDTO): Promise<Completion>;
  recordFromSession(sessionId: UUID, attendance: AttendanceRecord[]): Promise<Completion[]>;
  recordExternalTraining(data: ExternalCompletionDTO): Promise<Completion>;
  
  // Verification
  submitForVerification(completionId: UUID, evidence: UUID[]): Promise<void>;
  verifyCompletion(completionId: UUID, verifiedBy: UUID): Promise<void>;
  rejectCompletion(completionId: UUID, reason: string, rejectedBy: UUID): Promise<void>;
  
  // Expiry
  calculateExpiry(courseId: UUID, completionDate: Date): Promise<Date | null>;
  getExpiringCompletions(orgId: UUID, withinDays: number): Promise<Completion[]>;
  getExpiredCompletions(orgId: UUID): Promise<Completion[]>;
  
  // Queries
  getUserCompletions(userId: UUID, filters: CompletionFilters): Promise<PaginatedCompletions>;
  getCourseCompletions(courseId: UUID, filters: CompletionFilters): Promise<PaginatedCompletions>;
  getLatestCompletion(userId: UUID, courseId: UUID): Promise<Completion | null>;
  
  // Evidence
  attachEvidence(completionId: UUID, attachmentId: UUID): Promise<void>;
  getEvidence(completionId: UUID): Promise<Attachment[]>;
}
```

### 3.5 MatrixService

Calculates and provides training matrix data.

```typescript
interface MatrixService {
  // Matrix views
  getUserCourseMatrix(orgId: UUID, filters: MatrixFilters): Promise<UserCourseMatrix>;
  getRoleCourseMatrix(orgId: UUID, filters: MatrixFilters): Promise<RoleCourseMatrix>;
  getSiteCourseMatrix(orgId: UUID, filters: MatrixFilters): Promise<SiteCourseMatrix>;
  
  // Gap analysis
  getUserGaps(userId: UUID): Promise<TrainingGap[]>;
  getRoleGaps(orgId: UUID, roleName: string): Promise<TrainingGap[]>;
  getSiteGaps(siteId: UUID): Promise<TrainingGap[]>;
  
  // Requirements
  getRoleRequirements(orgId: UUID, roleName: string): Promise<Course[]>;
  getSiteRequirements(siteId: UUID): Promise<Course[]>;
  setRoleRequirement(orgId: UUID, roleName: string, courseId: UUID, mandatory: boolean): Promise<void>;
  setSiteRequirement(siteId: UUID, courseId: UUID, mandatory: boolean): Promise<void>;
  
  // Cell status
  getCellStatus(userId: UUID, courseId: UUID): Promise<TrainingStatus>;
}

// Matrix cell status enum
type TrainingStatus = 
  | 'not_required'   // No requirement for this user/course
  | 'not_assigned'   // Required but not assigned
  | 'assigned'       // Assigned, not started
  | 'in_progress'    // Started
  | 'completed'      // Valid completion exists
  | 'expiring_soon'  // Completion expiring within threshold
  | 'expired'        // Completion expired
  | 'overdue'        // Assignment overdue
  | 'failed';        // Completed but failed
```

### 3.6 TrainingNotificationService

Handles training-related notifications.

```typescript
interface TrainingNotificationService {
  // Assignment notifications
  notifyAssignment(assignment: Assignment): Promise<void>;
  notifyBulkAssignment(assignments: Assignment[]): Promise<void>;
  
  // Reminder notifications
  sendDueDateReminders(daysBefore: number): Promise<number>;
  sendExpiryWarnings(daysBefore: number): Promise<number>;
  
  // Escalation
  sendOverdueNotifications(): Promise<number>;
  sendManagerEscalation(managerId: UUID, overdueAssignments: Assignment[]): Promise<void>;
  
  // Session notifications
  notifySessionEnrollment(enrollment: Enrollment): Promise<void>;
  notifySessionReminder(session: Session, daysBefore: number): Promise<number>;
  notifySessionCancellation(session: Session): Promise<void>;
  
  // Completion notifications
  notifyCompletionRecorded(completion: Completion): Promise<void>;
  notifyVerificationRequired(completion: Completion): Promise<void>;
}
```

### 3.7 TrainingReportService

Generates training reports and exports.

```typescript
interface TrainingReportService {
  // User reports
  generateUserHistoryPDF(userId: UUID): Promise<Buffer>;
  generateUserHistoryExcel(userId: UUID): Promise<Buffer>;
  
  // Course reports
  generateCourseCompletionReport(courseId: UUID, filters: ReportFilters): Promise<Buffer>;
  generateAttendanceReport(sessionId: UUID): Promise<Buffer>;
  
  // Matrix reports
  generateMatrixSnapshot(orgId: UUID, matrixType: MatrixType, filters: MatrixFilters): Promise<Buffer>;
  
  // Compliance reports
  generateComplianceReport(orgId: UUID, filters: ReportFilters): Promise<Buffer>;
  generateGapAnalysisReport(orgId: UUID, scope: 'role' | 'site' | 'all'): Promise<Buffer>;
  
  // Audit reports
  generateAuditTrainingRecord(orgId: UUID, dateRange: DateRange): Promise<Buffer>;
}
```

---

## 4. Integration Points

### 4.1 Action Integration

Training as a corrective action type.

```typescript
// When creating an action with training type
interface TrainingActionData {
  actionType: 'training';
  trainingCourseId: UUID;
  assignToUserId: UUID;
  dueDate: Date;
  autoAssign: boolean; // If true, create assignment automatically
}

// ActionService integration
async createTrainingAction(incidentId: UUID, data: TrainingActionData): Promise<Action> {
  const action = await this.createAction({
    incidentId,
    type: 'training',
    description: `Complete training: ${course.title}`,
    assignedTo: data.assignToUserId,
    dueDate: data.dueDate,
    trainingCourseId: data.trainingCourseId
  });
  
  if (data.autoAssign) {
    await assignmentService.createAssignment({
      userId: data.assignToUserId,
      courseId: data.trainingCourseId,
      dueDate: data.dueDate,
      sourceType: 'action',
      sourceId: action.id
    });
  }
  
  return action;
}

// When training is completed, update action
completionService.on('completion:created', async (completion) => {
  const relatedAction = await actionService.findByTrainingCourse(
    completion.userId,
    completion.courseId
  );
  if (relatedAction && completion.result === 'passed') {
    await actionService.closeAction(relatedAction.id, 'Training completed');
  }
});
```

### 4.2 Incident Integration

Training gap analysis for incidents.

```typescript
// Show training status of involved persons
async getIncidentTrainingContext(incidentId: UUID): Promise<IncidentTrainingContext> {
  const incident = await incidentService.getIncident(incidentId);
  const involvedUsers = await incidentService.getInvolvedPersons(incidentId);
  
  const trainingStatuses = await Promise.all(
    involvedUsers.map(async (user) => ({
      user,
      requiredCourses: await matrixService.getUserGaps(user.id),
      recentCompletions: await completionService.getUserCompletions(user.id, { limit: 5 }),
      overdueAssignments: await assignmentService.getUserOverdue(user.id)
    }))
  );
  
  return {
    incidentId,
    involvedPersons: trainingStatuses,
    recommendedTraining: await getRecommendedTraining(incident.type)
  };
}
```

### 4.3 Analytics Integration

Training KPIs for Phase 5 analytics.

```typescript
// Daily aggregation job
async aggregateTrainingMetrics(date: Date): Promise<void> {
  const orgs = await organisationService.getAllActive();
  
  for (const org of orgs) {
    const metrics = {
      training_assignments_count: await countAssignments(org.id, date),
      training_completions_count: await countCompletions(org.id, date),
      training_overdue_count: await countOverdue(org.id),
      training_expiring_30d_count: await countExpiring(org.id, 30),
      training_compliance_rate: await calculateComplianceRate(org.id)
    };
    
    await analyticsService.updateDailySummary(org.id, date, metrics);
  }
}

// Training compliance rate calculation
async calculateComplianceRate(orgId: UUID): Promise<number> {
  const totalRequirements = await countTotalRequirements(orgId);
  const metRequirements = await countMetRequirements(orgId);
  return totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 100;
}
```

### 4.4 Notification Integration

Using Phase 4 notification system.

```typescript
// Notification templates for training
const TRAINING_NOTIFICATION_TEMPLATES = {
  ASSIGNMENT_CREATED: {
    type: 'training_assigned',
    title: 'New Training Assigned',
    template: 'You have been assigned training: {{courseName}}. Due by {{dueDate}}.'
  },
  DUE_REMINDER: {
    type: 'training_reminder',
    title: 'Training Due Soon',
    template: 'Reminder: {{courseName}} is due in {{daysRemaining}} days.'
  },
  OVERDUE: {
    type: 'training_overdue',
    title: 'Training Overdue',
    template: 'Your training {{courseName}} is now overdue. Please complete immediately.'
  },
  EXPIRY_WARNING: {
    type: 'training_expiring',
    title: 'Training Expiring Soon',
    template: 'Your {{courseName}} certification expires on {{expiryDate}}. Refresher training required.'
  },
  SESSION_REMINDER: {
    type: 'session_reminder',
    title: 'Training Session Tomorrow',
    template: 'Reminder: {{courseName}} session tomorrow at {{time}}, {{location}}.'
  }
};

// Using Phase 4 NotificationService
async sendAssignmentNotification(assignment: Assignment): Promise<void> {
  const template = TRAINING_NOTIFICATION_TEMPLATES.ASSIGNMENT_CREATED;
  
  await notificationService.create({
    userId: assignment.userId,
    type: template.type,
    title: template.title,
    message: renderTemplate(template.template, {
      courseName: assignment.course.title,
      dueDate: formatDate(assignment.dueDate)
    }),
    entityType: 'training_assignment',
    entityId: assignment.id,
    link: `/my-training?highlight=${assignment.id}`
  });
}
```

---

## 5. Sequence Diagrams

### 5.1 Assign Training to Users/Roles

```
┌─────────┐     ┌─────────────┐     ┌──────────────────┐     ┌────────────┐     ┌──────────────┐
│ Manager │     │   API       │     │AssignmentService │     │  Database  │     │Notification  │
└────┬────┘     └──────┬──────┘     └────────┬─────────┘     └─────┬──────┘     └──────┬───────┘
     │                 │                     │                     │                   │
     │  POST /training/assignments/bulk      │                     │                   │
     │  { courseId, type: 'role',           │                     │                   │
     │    roleName: 'Site Supervisor',      │                     │                   │
     │    dueDate, priority }               │                     │                   │
     ├────────────────►│                     │                     │                   │
     │                 │  bulkAssignByRole() │                     │                   │
     │                 ├────────────────────►│                     │                   │
     │                 │                     │  Find users by role │                   │
     │                 │                     ├────────────────────►│                   │
     │                 │                     │◄────────────────────┤                   │
     │                 │                     │  [{user1}, {user2}] │                   │
     │                 │                     │                     │                   │
     │                 │                     │  Check existing     │                   │
     │                 │                     │  assignments        │                   │
     │                 │                     ├────────────────────►│                   │
     │                 │                     │◄────────────────────┤                   │
     │                 │                     │                     │                   │
     │                 │                     │  Create assignments │                   │
     │                 │                     │  (skip duplicates)  │                   │
     │                 │                     ├────────────────────►│                   │
     │                 │                     │◄────────────────────┤                   │
     │                 │                     │                     │                   │
     │                 │                     │  Create/update rule │                   │
     │                 │                     │  if auto-assign set │                   │
     │                 │                     ├────────────────────►│                   │
     │                 │                     │◄────────────────────┤                   │
     │                 │                     │                     │                   │
     │                 │                     │  notifyBulkAssignment()                 │
     │                 │                     ├─────────────────────────────────────────►
     │                 │                     │                     │                   │
     │                 │◄────────────────────┤                     │    Send email/    │
     │  { assignments: [...],               │                     │    in-app notif   │
     │    created: 5, skipped: 1 }          │                     │    to each user   │
     │◄────────────────┤                     │                     │                   │
     │                 │                     │                     │                   │
```

### 5.2 User Completing Training

```
┌─────────┐     ┌────────────┐     ┌─────────────────┐     ┌────────────────┐     ┌──────────────┐
│Supervisor│    │    API     │     │CompletionService│     │AssignmentService│    │ Analytics    │
└────┬─────┘    └─────┬──────┘     └────────┬────────┘     └───────┬────────┘     └──────┬───────┘
     │                │                     │                      │                     │
     │  POST /training/completions          │                      │                     │
     │  { userId, courseId, date,          │                      │                     │
     │    result: 'passed', score: 85,     │                      │                     │
     │    trainerId, evidenceIds }         │                      │                     │
     ├───────────────►│                     │                      │                     │
     │                │  recordCompletion() │                      │                     │
     │                ├────────────────────►│                      │                     │
     │                │                     │                      │                     │
     │                │                     │  Get course validity │                     │
     │                │                     ├──────────────────────┤                     │
     │                │                     │                      │                     │
     │                │                     │  Calculate expiry    │                     │
     │                │                     │  (date + validity)   │                     │
     │                │                     │                      │                     │
     │                │                     │  Create completion   │                     │
     │                │                     │  record              │                     │
     │                │                     ├──────────────────────┤                     │
     │                │                     │                      │                     │
     │                │                     │  Link evidence       │                     │
     │                │                     │  attachments         │                     │
     │                │                     ├──────────────────────┤                     │
     │                │                     │                      │                     │
     │                │                     │  Update assignment   │                     │
     │                │                     │  status → completed  │                     │
     │                │                     ├─────────────────────►│                     │
     │                │                     │◄─────────────────────┤                     │
     │                │                     │                      │                     │
     │                │                     │  Check linked action │                     │
     │                │                     │  (close if training) │                     │
     │                │                     ├─────────────────────►│                     │
     │                │                     │                      │                     │
     │                │                     │  Update analytics    │                     │
     │                │                     ├─────────────────────────────────────────────►
     │                │◄────────────────────┤                      │                     │
     │  { completion: {...},               │                      │                     │
     │    expiresAt: '2027-02-05' }        │                      │                     │
     │◄───────────────┤                     │                      │                     │
```

### 5.3 Manager Viewing Training Matrix

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐     ┌────────────┐
│ Manager │     │    API      │     │  MatrixService  │     │  Database  │
└────┬────┘     └──────┬──────┘     └────────┬────────┘     └─────┬──────┘
     │                 │                     │                    │
     │  GET /training/matrix                 │                    │
     │  ?type=user_course                    │                    │
     │  &siteId=xxx                          │                    │
     │  &mandatory=true                      │                    │
     ├────────────────►│                     │                    │
     │                 │  getUserCourseMatrix()                   │
     │                 ├────────────────────►│                    │
     │                 │                     │                    │
     │                 │                     │  Get users (site)  │
     │                 │                     ├───────────────────►│
     │                 │                     │◄───────────────────┤
     │                 │                     │                    │
     │                 │                     │  Get courses       │
     │                 │                     │  (mandatory only)  │
     │                 │                     ├───────────────────►│
     │                 │                     │◄───────────────────┤
     │                 │                     │                    │
     │                 │                     │  Get completions   │
     │                 │                     │  (latest per user/ │
     │                 │                     │   course pair)     │
     │                 │                     ├───────────────────►│
     │                 │                     │◄───────────────────┤
     │                 │                     │                    │
     │                 │                     │  Get assignments   │
     │                 │                     │  (active ones)     │
     │                 │                     ├───────────────────►│
     │                 │                     │◄───────────────────┤
     │                 │                     │                    │
     │                 │                     │  Calculate cell    │
     │                 │                     │  statuses          │
     │                 │                     │                    │
     │                 │◄────────────────────┤                    │
     │  {                                    │                    │
     │    rows: [users...],                  │                    │
     │    columns: [courses...],             │                    │
     │    cells: [                           │                    │
     │      { userId, courseId,              │                    │
     │        status: 'completed',           │                    │
     │        expiresAt, completionDate }    │                    │
     │    ],                                 │                    │
     │    summary: {                         │                    │
     │      compliant: 45, overdue: 3,       │                    │
     │      expiring: 5, notAssigned: 2      │                    │
     │    }                                  │                    │
     │  }                                    │                    │
     │◄────────────────┤                     │                    │
```

---

## 6. Background Jobs

### 6.1 Expiry Check Job

```typescript
// Runs daily at 01:00 UTC
@Cron('0 1 * * *')
async checkTrainingExpiry(): Promise<void> {
  const orgs = await organisationService.getAllActive();
  
  for (const org of orgs) {
    // 1. Update expired completions status
    const expiredCompletions = await db.query(`
      UPDATE training_completions 
      SET updated_at = NOW()
      WHERE organisation_id = $1
        AND expires_at < CURRENT_DATE
        AND expires_at IS NOT NULL
      RETURNING *
    `, [org.id]);
    
    logger.info(`Marked ${expiredCompletions.length} completions as expired for org ${org.id}`);
    
    // 2. Create refresher assignments for expired courses with refresher defined
    for (const completion of expiredCompletions) {
      const course = await courseService.getCourse(completion.courseId);
      if (course.refresherCourseId) {
        const existing = await assignmentService.findActiveAssignment(
          completion.userId, 
          course.refresherCourseId
        );
        
        if (!existing) {
          await assignmentService.createAssignment({
            userId: completion.userId,
            courseId: course.refresherCourseId,
            sourceType: 'expiry',
            sourceId: completion.id,
            dueDate: addDays(new Date(), 30),
            priority: 'high'
          });
        }
      }
    }
    
    // 3. Update overdue assignment statuses
    await assignmentService.updateOverdueStatus(org.id);
  }
}
```

### 6.2 Reminder Job

```typescript
// Runs daily at 06:00 UTC
@Cron('0 6 * * *')
async sendTrainingReminders(): Promise<void> {
  // Due date reminders (30, 14, 7, 1 days before)
  const reminderDays = [30, 14, 7, 1];
  
  for (const days of reminderDays) {
    const assignments = await db.query(`
      SELECT ta.*, tc.title as course_title, u.email
      FROM training_assignments ta
      JOIN training_courses tc ON ta.course_id = tc.id
      JOIN users u ON ta.user_id = u.id
      WHERE ta.due_date = CURRENT_DATE + INTERVAL '${days} days'
        AND ta.status IN ('assigned', 'in_progress')
        AND (ta.reminder_sent_at IS NULL 
             OR ta.reminder_sent_at < CURRENT_DATE - INTERVAL '7 days')
    `);
    
    for (const assignment of assignments) {
      await notificationService.sendDueDateReminder(assignment, days);
      await db.query(
        'UPDATE training_assignments SET reminder_sent_at = NOW() WHERE id = $1',
        [assignment.id]
      );
    }
  }
  
  // Expiry warnings (30, 14, 7 days before)
  for (const days of [30, 14, 7]) {
    await notificationService.sendExpiryWarnings(days);
  }
  
  // Overdue notifications
  await notificationService.sendOverdueNotifications();
}
```

### 6.3 Auto-Assignment Job

```typescript
// Runs daily at 02:00 UTC
@Cron('0 2 * * *')
async applyAutoAssignmentRules(): Promise<void> {
  const activeRules = await db.query(`
    SELECT * FROM training_assignment_rules 
    WHERE is_active = TRUE AND auto_assign_new_users = TRUE
  `);
  
  for (const rule of activeRules) {
    // Find users matching rule who don't have assignment
    let users: User[];
    
    if (rule.rule_type === 'role') {
      users = await db.query(`
        SELECT u.* FROM users u
        WHERE u.organisation_id = $1
          AND u.role = $2
          AND u.is_active = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM training_assignments ta
            WHERE ta.user_id = u.id
              AND ta.course_id = $3
              AND ta.status NOT IN ('cancelled', 'waived')
          )
      `, [rule.organisation_id, rule.role_name, rule.course_id]);
    } else {
      users = await db.query(`
        SELECT u.* FROM users u
        WHERE u.site_id = $1
          AND u.is_active = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM training_assignments ta
            WHERE ta.user_id = u.id
              AND ta.course_id = $2
              AND ta.status NOT IN ('cancelled', 'waived')
          )
      `, [rule.site_id, rule.course_id]);
    }
    
    for (const user of users) {
      const dueDate = addDays(user.created_at, rule.due_days_from_start);
      await assignmentService.createAssignment({
        userId: user.id,
        courseId: rule.course_id,
        assignmentRuleId: rule.id,
        dueDate: dueDate > new Date() ? dueDate : addDays(new Date(), 30),
        priority: rule.priority,
        sourceType: rule.rule_type === 'role' ? 'role_rule' : 'site_rule'
      });
    }
  }
}
```

---

## 7. Security Considerations

### 7.1 Role-Based Access Control

```typescript
const TRAINING_PERMISSIONS = {
  // Courses
  'training:courses:read': ['viewer', 'reporter', 'supervisor', 'manager', 'admin'],
  'training:courses:create': ['manager', 'admin'],
  'training:courses:update': ['manager', 'admin'],
  'training:courses:delete': ['admin'],
  
  // Sessions
  'training:sessions:read': ['viewer', 'reporter', 'supervisor', 'manager', 'admin'],
  'training:sessions:create': ['supervisor', 'manager', 'admin'],
  'training:sessions:manage': ['manager', 'admin'],
  'training:sessions:attendance': ['supervisor', 'manager', 'admin'],
  
  // Assignments
  'training:assignments:read': ['viewer', 'reporter', 'supervisor', 'manager', 'admin'],
  'training:assignments:create': ['supervisor', 'manager', 'admin'],
  'training:assignments:bulk': ['manager', 'admin'],
  'training:assignments:rules': ['admin'],
  
  // Completions
  'training:completions:read': ['viewer', 'reporter', 'supervisor', 'manager', 'admin'],
  'training:completions:record': ['supervisor', 'manager', 'admin'],
  'training:completions:verify': ['manager', 'admin'],
  
  // Matrix & Reports
  'training:matrix:read': ['supervisor', 'manager', 'admin'],
  'training:reports:generate': ['manager', 'admin'],
  
  // My Training (own records)
  'training:my:read': ['viewer', 'reporter', 'supervisor', 'manager', 'admin'],
  'training:my:enroll': ['reporter', 'supervisor', 'manager', 'admin']
};
```

### 7.2 Data Access Scoping

```typescript
// All training queries scoped to organisation
async getCourses(userId: UUID, filters: CourseFilters): Promise<Course[]> {
  const user = await userService.getUser(userId);
  
  return db.query(`
    SELECT * FROM training_courses
    WHERE organisation_id = $1
      AND status = 'active'
      ${filters.categoryId ? 'AND category_id = $2' : ''}
    ORDER BY title
  `, [user.organisationId, filters.categoryId]);
}

// Managers can see reports for their sites
async canViewUserTraining(viewerId: UUID, targetUserId: UUID): Promise<boolean> {
  const viewer = await userService.getUser(viewerId);
  const target = await userService.getUser(targetUserId);
  
  // Same org required
  if (viewer.organisationId !== target.organisationId) return false;
  
  // Admins and managers see all
  if (['admin', 'manager'].includes(viewer.role)) return true;
  
  // Supervisors see their site
  if (viewer.role === 'supervisor' && viewer.siteId === target.siteId) return true;
  
  // Users see their own
  return viewer.id === target.id;
}
```

---

## 8. Performance Optimizations

### 8.1 Matrix Query Optimization

```typescript
// Use materialized data for large matrices
async getUserCourseMatrix(orgId: UUID, filters: MatrixFilters): Promise<Matrix> {
  const userCount = await countUsers(orgId, filters);
  const courseCount = await countCourses(orgId, filters);
  
  if (userCount * courseCount > 10000) {
    // Use pre-aggregated data for large matrices
    return getMatrixFromAggregation(orgId, filters);
  } else {
    // Real-time calculation for smaller matrices
    return calculateMatrixRealtime(orgId, filters);
  }
}

// Efficient matrix calculation with single query
async calculateMatrixRealtime(orgId: UUID, filters: MatrixFilters): Promise<Matrix> {
  const result = await db.query(`
    WITH users AS (
      SELECT id, full_name, role, site_id
      FROM users
      WHERE organisation_id = $1 AND is_active = TRUE
      ${filters.siteId ? 'AND site_id = $2' : ''}
    ),
    courses AS (
      SELECT id, code, title
      FROM training_courses
      WHERE organisation_id = $1 AND status = 'active'
      ${filters.mandatory ? "AND requirement_level = 'mandatory'" : ''}
    ),
    latest_completions AS (
      SELECT DISTINCT ON (user_id, course_id)
        user_id, course_id, result, expires_at
      FROM training_completions
      WHERE organisation_id = $1
      ORDER BY user_id, course_id, completion_date DESC
    ),
    active_assignments AS (
      SELECT user_id, course_id, due_date, status
      FROM training_assignments
      WHERE organisation_id = $1
        AND status NOT IN ('completed', 'cancelled', 'waived')
    )
    SELECT 
      u.id as user_id, u.full_name, u.role, u.site_id,
      c.id as course_id, c.code, c.title,
      lc.result, lc.expires_at,
      aa.due_date, aa.status as assignment_status
    FROM users u
    CROSS JOIN courses c
    LEFT JOIN latest_completions lc ON u.id = lc.user_id AND c.id = lc.course_id
    LEFT JOIN active_assignments aa ON u.id = aa.user_id AND c.id = aa.course_id
    ORDER BY u.full_name, c.code
  `, [orgId, filters.siteId]);
  
  return transformToMatrix(result);
}
```

### 8.2 Caching Strategy

```typescript
// Cache frequently accessed training data
const CACHE_KEYS = {
  COURSE_LIST: (orgId: UUID) => `training:courses:${orgId}`,
  USER_MATRIX_ROW: (userId: UUID) => `training:matrix:user:${userId}`,
  COMPLIANCE_RATE: (orgId: UUID) => `training:compliance:${orgId}`
};

const CACHE_TTL = {
  COURSE_LIST: 300,      // 5 minutes
  USER_MATRIX_ROW: 60,   // 1 minute
  COMPLIANCE_RATE: 3600  // 1 hour (updated by daily job)
};

// Invalidate cache on updates
async invalidateTrainingCache(orgId: UUID, scope: 'course' | 'assignment' | 'completion'): Promise<void> {
  await cache.del(CACHE_KEYS.COURSE_LIST(orgId));
  await cache.del(CACHE_KEYS.COMPLIANCE_RATE(orgId));
  // User-specific caches invalidated on user operations
}
```

---

## 9. Error Handling

```typescript
// Training-specific error codes
const TRAINING_ERRORS = {
  COURSE_NOT_FOUND: { code: 'TRN001', message: 'Training course not found', status: 404 },
  SESSION_NOT_FOUND: { code: 'TRN002', message: 'Training session not found', status: 404 },
  SESSION_FULL: { code: 'TRN003', message: 'Training session is at capacity', status: 409 },
  ALREADY_ENROLLED: { code: 'TRN004', message: 'User already enrolled in session', status: 409 },
  ALREADY_ASSIGNED: { code: 'TRN005', message: 'User already has active assignment', status: 409 },
  PREREQUISITES_NOT_MET: { code: 'TRN006', message: 'Prerequisites not completed', status: 400 },
  INVALID_COMPLETION_DATE: { code: 'TRN007', message: 'Completion date cannot be in future', status: 400 },
  SESSION_NOT_COMPLETED: { code: 'TRN008', message: 'Session not yet completed', status: 400 },
  CANNOT_MODIFY_ARCHIVED: { code: 'TRN009', message: 'Cannot modify archived course', status: 400 },
  INVALID_SCORE: { code: 'TRN010', message: 'Score must be between 0 and 100', status: 400 }
};
```

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 architecture |
