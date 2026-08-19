## ADDED Requirements

### Requirement: Job execution log list
The schedule log page SHALL display a paginated table of job execution records with filtering.

#### Scenario: View job logs
- **WHEN** admin navigates to `/schedule/log`
- **THEN** the page SHALL show a ProTable with columns: job name, group, status (success/fail), start time, end time, duration, error message

### Requirement: Filter logs by job and status
The page SHALL support filtering logs by job name/group and execution status.

#### Scenario: Filter by status
- **WHEN** admin selects "Failed" in the status filter
- **THEN** the table SHALL show only failed execution records

### Requirement: Stop running job
Admins SHALL be able to stop a currently executing job instance.

#### Scenario: Stop execution
- **WHEN** admin clicks "Stop" on a running job instance
- **THEN** the system SHALL call PUT `/schedule/log/{id}/stop`

### Requirement: Retry failed job
Admins SHALL be able to retry a failed job execution.

#### Scenario: Retry job
- **WHEN** admin clicks "Retry" on a failed log entry
- **THEN** the system SHALL call POST `/schedule/log/{id}/retry`
