## ADDED Requirements

### Requirement: User can view message list
The message center SHALL display a paginated list of user messages with read/unread status.

#### Scenario: View messages
- **WHEN** user navigates to `/user/message`
- **THEN** the page SHALL display messages from GET `/user/message` with pagination

### Requirement: User can mark messages as read
The message center SHALL allow marking individual or batch messages as read.

#### Scenario: Mark single message read
- **WHEN** user clicks a message or marks it as read
- **THEN** the system SHALL call the mark-read API and update the UI status

#### Scenario: Batch mark as read
- **WHEN** user selects multiple messages and clicks "mark all read"
- **THEN** all selected messages SHALL be marked as read

### Requirement: User can delete messages
The message center SHALL allow deleting messages.

#### Scenario: Delete message
- **WHEN** user deletes a message
- **THEN** the system SHALL call DELETE API and remove the message from the list

### Requirement: User can view announcement details
The message center SHALL allow viewing full announcement content.

#### Scenario: View announcement
- **WHEN** user clicks an announcement notification
- **THEN** the system SHALL navigate to a detail view showing the full announcement content

### Requirement: Unread message count badge
The system SHALL display unread message count in the header navigation.

#### Scenario: Unread count display
- **WHEN** user has unread messages
- **THEN** the header SHALL show a badge with the unread count from GET `/user/message/unread`
