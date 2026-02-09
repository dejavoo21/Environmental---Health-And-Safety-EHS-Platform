const express = require('express');
const { AppError } = require('../utils/appError');

const router = express.Router();

// Static help content - in a production system, this could come from a CMS or database
const helpTopics = [
  {
    id: 'help-incidents',
    title: 'How to report an incident',
    slug: 'incidents',
    summary: 'Steps for reporting a new incident in the EHS Portal',
    content: `# How to Report an Incident

## Overview
The EHS Portal allows you to report workplace incidents quickly and accurately. All employees can report incidents.

## Steps to Report an Incident

1. **Navigate to Incidents**
   - Click on "Incidents" in the main navigation menu
   - Click the "New Incident" button

2. **Fill in the Details**
   - **Title**: Provide a brief, descriptive title for the incident
   - **Incident Type**: Select the type (e.g., Injury, Near Miss, Property Damage)
   - **Site**: Choose the location where the incident occurred
   - **Severity**: Rate the severity level (Low, Medium, High, Critical)
   - **Date/Time**: When the incident occurred
   - **Description**: Provide detailed information about what happened

3. **Submit the Report**
   - Review your information
   - Click "Create Incident" to submit

## After Reporting
- Your incident will be assigned an "Open" status
- Managers will review and may change status to "Under Investigation"
- You can view your reported incidents in the Incidents list

## Need Help?
Contact your site safety manager or email support@company.com`,
    updatedAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 'help-inspections',
    title: 'Understanding inspections',
    slug: 'inspections',
    summary: 'Guide to viewing and understanding inspection results',
    content: `# Understanding Inspections

## Overview
Regular safety inspections are conducted to ensure workplace compliance and identify potential hazards.

## Viewing Inspections
1. Click "Inspections" in the main menu
2. Browse the list of completed inspections
3. Click any row to see full details

## Inspection Results
- **Pass**: All checklist items were satisfactory
- **Fail**: One or more items require attention

## Checklist Items
Each inspection uses a template with specific items to check. For each item:
- **OK**: Item meets requirements
- **Not OK**: Item needs attention or correction
- **N/A**: Item is not applicable

## Actions from Inspections
When items are marked "Not OK", managers may create action items to address the issues.

## Need Help?
Contact your site safety manager or email support@company.com`,
    updatedAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 'help-actions',
    title: 'Managing action items',
    slug: 'actions',
    summary: 'How to view and complete assigned action items',
    content: `# Managing Action Items

## Overview
Action items are tasks created to address safety issues identified in incidents or inspections.

## Viewing Your Actions
1. Click "Actions" in the main menu
2. The "My Actions" view shows tasks assigned to you
3. Managers can view "All Actions" across the organization

## Action Statuses
- **Open**: New action item awaiting work
- **In Progress**: Work has begun
- **Done**: Action completed successfully
- **Overdue**: Due date has passed

## Updating Actions
1. Click on an action to view details
2. Update the status as you progress
3. Add evidence or attachments if required

## Due Dates
- Pay attention to due dates
- Actions become "Overdue" automatically when the due date passes
- Contact your manager if you need an extension

## Need Help?
Contact your site safety manager or email support@company.com`,
    updatedAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 'help-attachments',
    title: 'Uploading evidence and attachments',
    slug: 'attachments',
    summary: 'How to attach files and photos to incidents, inspections, and actions',
    content: `# Uploading Evidence and Attachments

## Overview
You can attach photos, documents, and other files to incidents, inspections, and actions as evidence.

## Supported File Types
- Images: JPEG, PNG, GIF
- Documents: PDF, Word (.doc, .docx)
- Spreadsheets: Excel (.xls, .xlsx)

## File Size Limit
Maximum file size: 10 MB per file

## How to Upload
1. Open the incident, inspection, or action detail page
2. Find the "Attachments" section
3. Click "Upload" or drag and drop a file
4. Wait for the upload to complete

## Downloading Attachments
Click on any attachment to download it to your device.

## Need Help?
Contact your site safety manager or email support@company.com`,
    updatedAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 'help-support',
    title: 'Getting support',
    slug: 'support',
    summary: 'How to contact support and get help with the EHS Portal',
    content: `# Getting Support

## Contact Information

**Email Support**: support@company.com

**Response Time**: We aim to respond within 24 business hours.

## Common Issues

### Login Problems
- Ensure you're using the correct email address
- Check that Caps Lock is not enabled
- Try resetting your password

### Missing Data
- Refresh the page to load latest data
- Check your filters and date ranges
- Contact your manager if data is still missing

### Permission Issues
- Some features are restricted by role (Worker, Manager, Admin)
- Contact your administrator if you need additional access

## Feedback
We welcome your feedback on the EHS Portal. Please email your suggestions to feedback@company.com.

## Training
Training materials and videos are available on request. Contact your HR department for more information.`,
    updatedAt: '2025-01-10T10:00:00Z'
  }
];

// GET /api/help - List help topics
router.get('/', (req, res) => {
  const topics = helpTopics.map(topic => ({
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    summary: topic.summary,
    updatedAt: topic.updatedAt
  }));

  return res.json({ topics });
});

// GET /api/help/:slug - Get help content by slug
router.get('/:slug', (req, res, next) => {
  const { slug } = req.params;

  const topic = helpTopics.find(t => t.slug === slug);

  if (!topic) {
    return next(new AppError('Help topic not found', 404, 'NOT_FOUND'));
  }

  return res.json({
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    content: topic.content,
    updatedAt: topic.updatedAt
  });
});

module.exports = router;
