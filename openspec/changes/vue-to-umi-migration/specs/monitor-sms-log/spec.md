## ADDED Requirements

### Requirement: SMS send log list with filtering
The SMS log page SHALL display a paginated table of SMS send records with filtering by phone, status, and time range.

#### Scenario: View SMS logs
- **WHEN** admin navigates to the SMS log page
- **THEN** the page SHALL show a ProTable with columns: phone, content, platform, status, send time, response

### Requirement: Delete SMS logs
Admins SHALL be able to delete SMS log records (single or batch).

#### Scenario: Delete single log
- **WHEN** admin clicks delete on a log entry and confirms
- **THEN** the system SHALL call DELETE `/system/sms/log/{id}`

#### Scenario: Batch delete
- **WHEN** admin selects multiple logs and clicks batch delete
- **THEN** the system SHALL call DELETE `/system/sms/log` with selected IDs

### Requirement: Export SMS logs
Admins SHALL be able to export SMS logs to Excel/CSV.

#### Scenario: Export logs
- **WHEN** admin clicks "Export" button
- **THEN** the system SHALL call the export API and trigger a file download
