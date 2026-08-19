## ADDED Requirements

### Requirement: SMS platform configuration CRUD
The SMS config page SHALL allow managing SMS platform configurations.

#### Scenario: List SMS configs
- **WHEN** admin navigates to the SMS config page
- **THEN** the page SHALL display a ProTable with all SMS platform configs (name, platform type, status)

#### Scenario: Create SMS config
- **WHEN** admin clicks "Add" and fills form (name, platform, access key, secret, sign name, template)
- **THEN** the system SHALL call POST `/system/sms/config`

#### Scenario: Edit SMS config
- **WHEN** admin clicks edit on a config
- **THEN** a ModalForm SHALL show pre-filled values, save calls PUT `/system/sms/config`

#### Scenario: Delete SMS config
- **WHEN** admin clicks delete and confirms
- **THEN** the system SHALL call DELETE `/system/sms/config/{id}`

### Requirement: Set default SMS platform
Admins SHALL be able to designate one SMS config as the default sending platform.

#### Scenario: Set as default
- **WHEN** admin clicks "Set as Default" on an SMS config
- **THEN** the system SHALL call PUT `/system/sms/config/{id}/default`
