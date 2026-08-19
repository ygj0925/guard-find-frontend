## ADDED Requirements

### Requirement: Scheduled job CRUD
The schedule job page SHALL support creating, editing, viewing, and deleting scheduled tasks.

#### Scenario: List jobs
- **WHEN** admin navigates to `/schedule/job`
- **THEN** the page SHALL show a ProTable with columns: name, group, cron expression, status, description, actions

#### Scenario: Create job
- **WHEN** admin clicks "Add" and fills the form (name, group, cron, class/bean, method, params, description)
- **THEN** the system SHALL call POST `/schedule/job`

#### Scenario: Edit job
- **WHEN** admin clicks edit on a job
- **THEN** a ModalForm SHALL appear with current values, save calls PUT `/schedule/job`

#### Scenario: Delete job
- **WHEN** admin clicks delete and confirms
- **THEN** the system SHALL call DELETE `/schedule/job/{id}`

### Requirement: Trigger job execution
Admins SHALL be able to manually trigger immediate execution of a job.

#### Scenario: Trigger job
- **WHEN** admin clicks "Run Now" on a job
- **THEN** the system SHALL call POST `/schedule/job/{id}/trigger`

### Requirement: Toggle job status (pause/resume)
Admins SHALL be able to pause and resume scheduled jobs.

#### Scenario: Pause job
- **WHEN** admin clicks pause on a running job
- **THEN** the system SHALL call PUT `/schedule/job/{id}/status` with paused status

#### Scenario: Resume job
- **WHEN** admin clicks resume on a paused job
- **THEN** the system SHALL call PUT `/schedule/job/{id}/status` with active status
