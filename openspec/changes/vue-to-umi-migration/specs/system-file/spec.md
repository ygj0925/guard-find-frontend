## ADDED Requirements

### Requirement: File list with pagination and search
The file management page SHALL display uploaded files in a paginated table with search by filename.

#### Scenario: View file list
- **WHEN** admin navigates to `/system/file`
- **THEN** the page SHALL show a ProTable with columns: filename, size, type, uploader, upload time, actions

### Requirement: File upload
The page SHALL support single and batch file upload with drag-and-drop.

#### Scenario: Upload files
- **WHEN** admin clicks upload or drags files to the upload area
- **THEN** the system SHALL upload files via POST `/system/file/upload` and refresh the list

### Requirement: File deletion
Admins SHALL be able to delete files (move to recycle bin).

#### Scenario: Delete file
- **WHEN** admin clicks delete on a file and confirms
- **THEN** the system SHALL call DELETE `/system/file/{id}` and remove from list

### Requirement: Recycle bin management
The page SHALL provide a recycle bin view showing soft-deleted files with restore/permanent-delete options.

#### Scenario: View recycle bin
- **WHEN** admin switches to recycle bin tab
- **THEN** the page SHALL show deleted files from GET `/system/file/recycle`

#### Scenario: Restore file
- **WHEN** admin clicks restore on a recycled file
- **THEN** the file SHALL be restored to the active file list

### Requirement: Storage statistics
The page SHALL display storage usage statistics (total size, file count by type).

#### Scenario: View statistics
- **WHEN** the file management page loads
- **THEN** it SHALL show storage statistics cards from the file statistics API
