## ADDED Requirements

### Requirement: Open platform app CRUD
The open app page SHALL support creating, editing, viewing, and deleting applications.

#### Scenario: List apps
- **WHEN** admin navigates to `/open/app`
- **THEN** the page SHALL show a ProTable with columns: app name, app key, status, description, create time, actions

#### Scenario: Create app
- **WHEN** admin clicks "Add" and fills form (name, description, status)
- **THEN** the system SHALL call POST `/open/app`

#### Scenario: Edit app
- **WHEN** admin clicks edit on an app
- **THEN** a ModalForm SHALL appear with current values, save calls PUT `/open/app`

#### Scenario: Delete app
- **WHEN** admin clicks delete and confirms
- **THEN** the system SHALL call DELETE `/open/app/{id}`

### Requirement: App secret management
Admins SHALL be able to view and reset an application's secret key.

#### Scenario: View app secret
- **WHEN** admin clicks "View Secret" on an app
- **THEN** the system SHALL call GET `/open/app/{id}/secret` and display the secret in a modal

#### Scenario: Reset app secret
- **WHEN** admin clicks "Reset Secret" and confirms
- **THEN** the system SHALL call PUT `/open/app/{id}/secret` and display the new secret

### Requirement: Export apps
Admins SHALL be able to export the app list to Excel.

#### Scenario: Export app list
- **WHEN** admin clicks "Export"
- **THEN** the system SHALL call the export API and trigger a file download
