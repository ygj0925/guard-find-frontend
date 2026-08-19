## ADDED Requirements

### Requirement: Select and configure database tables
The code generator SHALL display available database tables and allow selecting tables for code generation with configuration.

#### Scenario: List database tables
- **WHEN** admin navigates to `/code/generator`
- **THEN** the page SHALL show a table list from GET `/code/generator` with table name, comment, and config status

#### Scenario: Configure table
- **WHEN** admin clicks "Configure" on a table
- **THEN** a form/page SHALL show table-level settings (module name, package name, author, parent menu, etc.)

### Requirement: Field configuration
The generator SHALL allow configuring individual table fields (display name, form type, query type, required, etc.).

#### Scenario: Edit field config
- **WHEN** admin opens field configuration for a table
- **THEN** a table/form SHALL show all fields with editable columns: display name, form type, query type, list visible, form visible, required

### Requirement: Code preview
The generator SHALL allow previewing generated code before downloading.

#### Scenario: Preview code
- **WHEN** admin clicks "Preview" on a configured table
- **THEN** a modal SHALL display generated code files (controller, service, mapper, page) with syntax highlighting

### Requirement: Code generation and download
The generator SHALL support generating and downloading code as a zip file.

#### Scenario: Download generated code
- **WHEN** admin clicks "Download" on a configured table
- **THEN** the system SHALL call the download API and trigger a zip file download

#### Scenario: Batch generate
- **WHEN** admin selects multiple tables and clicks "Batch Generate"
- **THEN** the system SHALL generate code for all selected tables and download as one zip
