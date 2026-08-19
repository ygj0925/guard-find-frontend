## ADDED Requirements

### Requirement: Tenant CRUD
The tenant management page SHALL support creating, editing, viewing, and deleting tenants.

#### Scenario: List tenants
- **WHEN** admin navigates to `/tenant/management`
- **THEN** the page SHALL show a ProTable with columns: tenant name, domain, admin account, status, expire time, package, actions

#### Scenario: Create tenant
- **WHEN** admin clicks "Add" and fills form (name, domain, admin username/password, package, expire time)
- **THEN** the system SHALL call POST `/tenant/management`

#### Scenario: Edit tenant
- **WHEN** admin clicks edit on a tenant
- **THEN** a ModalForm SHALL appear with current values, save calls PUT `/tenant/management`

#### Scenario: Delete tenant
- **WHEN** admin clicks delete and confirms
- **THEN** the system SHALL call DELETE `/tenant/management/{id}`

### Requirement: Update tenant admin password
Admins SHALL be able to reset a tenant's administrator password.

#### Scenario: Reset admin password
- **WHEN** admin clicks "Reset Password" for a tenant and enters new password
- **THEN** the system SHALL RSA-encrypt the password and call PUT `/tenant/management/{id}/password`
