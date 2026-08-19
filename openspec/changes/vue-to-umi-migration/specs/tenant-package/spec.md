## ADDED Requirements

### Requirement: Tenant package CRUD
The tenant package page SHALL support creating, editing, viewing, and deleting packages.

#### Scenario: List packages
- **WHEN** admin navigates to `/tenant/package`
- **THEN** the page SHALL show a ProTable with columns: package name, description, menu count, status, actions

#### Scenario: Create package
- **WHEN** admin clicks "Add" and fills form (name, description, status)
- **THEN** the system SHALL call POST `/tenant/package`

#### Scenario: Edit package
- **WHEN** admin clicks edit on a package
- **THEN** a ModalForm SHALL appear with current values, save calls PUT `/tenant/package`

#### Scenario: Delete package
- **WHEN** admin clicks delete and confirms
- **THEN** the system SHALL call DELETE `/tenant/package/{id}`

### Requirement: Assign menus to package
Admins SHALL be able to assign menu permissions to a tenant package via a tree selector.

#### Scenario: Assign menus
- **WHEN** admin clicks "Assign Menus" on a package
- **THEN** a modal SHALL show a menu tree (from GET `/tenant/package/menu/tree`) with checkboxes
- **WHEN** admin checks/unchecks menus and saves
- **THEN** the system SHALL call PUT `/tenant/package/{id}/menu` with selected menu IDs
