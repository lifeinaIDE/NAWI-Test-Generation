# 3. User Roles & Permissions

The system has four roles. Permissions are enforced **in the backend**, not just hidden
in the UI — a technician calling the "approve" API directly must still be rejected.

## A. Lab Technician

Can:
- Create a test report.
- Enter instrument, manufacturer, and laboratory details.
- Enter test observations.
- Upload photographs and supporting files.
- Save a draft at any point.
- View automatic calculations as they enter data.
- Submit the report for review.
- Respond to reviewer queries and resubmit.
- Perform retests if required.

Cannot:
- Approve or reject a report.
- Edit an approved (read-only) report.
- Edit rule-sets.

## B. Lab Reviewer

Can:
- View submitted reports.
- Review instrument details, observations, and calculations.
- Check pass/fail results and the reasoning behind them.
- Add comments.
- Return a report to the technician for correction (with a comment).
- Approve a report.
- Trigger/authorize final report generation.

Cannot:
- Create new reports on a technician's behalf (may be added later; out of scope now).
- Edit rule-sets.

## C. Lab Administrator

Can:
- Manage users and their roles.
- Configure laboratory details.
- Configure and version OIML rule-sets.
- View all reports across the lab.
- View dashboard statistics.
- Review the audit log.
- Manage report templates and rule-set versions.

Cannot:
- Bypass the review workflow (an admin approving a report still goes through the same
  status transition and audit logging as a reviewer would).

## D. Viewer *(optional role)*

Can:
- View approved reports.
- Search report history.
- Download approved reports.

Cannot:
- Edit anything.
- Approve, reject, or comment.
- See reports still in draft/review (only approved ones), unless explicitly extended
  later.

## Enforcement principle

Every API endpoint that mutates data must check the caller's role server-side before
acting, independent of what the frontend shows or hides. The UI hiding a button is a
convenience, not a security control.
