## ADDED Requirements

### Requirement: Display online user list
The online monitoring page SHALL display a paginated table of currently online users with their session info.

#### Scenario: View online users
- **WHEN** admin navigates to `/monitor/online`
- **THEN** the page SHALL show a ProTable with columns: username, nickname, IP, login time, browser, OS

### Requirement: Search online users
The page SHALL support filtering online users by username or IP address.

#### Scenario: Search by username
- **WHEN** admin enters a username in the search field
- **THEN** the table SHALL filter to show only matching online users

### Requirement: Force user offline (kickout)
Admins with permission SHALL be able to force a user offline.

#### Scenario: Kickout user
- **WHEN** admin clicks "Force Offline" button for a user and confirms
- **THEN** the system SHALL call POST `/monitor/online/kickout` with the session token
- **THEN** the user SHALL be removed from the online list

#### Scenario: Kickout permission check
- **WHEN** admin lacks `monitor:online:kickout` permission
- **THEN** the "Force Offline" button SHALL NOT be displayed
