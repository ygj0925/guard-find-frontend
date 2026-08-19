## ADDED Requirements

### Requirement: Storage configuration CRUD
The storage management page SHALL allow CRUD operations on storage configurations (local, S3, OSS, etc.).

#### Scenario: List storage configs
- **WHEN** admin navigates to `/system/storage`
- **THEN** the page SHALL display a ProTable with all storage configurations

#### Scenario: Create storage config
- **WHEN** admin clicks "Add" and fills the form (name, type, endpoint, bucket, access key, secret key)
- **THEN** the system SHALL call POST `/system/storage` to create the config

#### Scenario: Edit storage config
- **WHEN** admin clicks edit on a storage config
- **THEN** a ModalForm SHALL appear pre-filled with current values, and save SHALL call PUT `/system/storage`

#### Scenario: Delete storage config
- **WHEN** admin clicks delete on a non-default storage config and confirms
- **THEN** the system SHALL call DELETE `/system/storage/{id}`

### Requirement: Set default storage
Admins SHALL be able to set one storage configuration as the default.

#### Scenario: Set as default
- **WHEN** admin clicks "Set as Default" on a storage config
- **THEN** the system SHALL call PUT `/system/storage/{id}/default` and refresh the list

### Requirement: Toggle storage status
Admins SHALL be able to enable/disable storage configurations.

#### Scenario: Toggle status
- **WHEN** admin toggles the status switch of a storage config
- **THEN** the system SHALL call PUT `/system/storage/{id}/status` with the new status
