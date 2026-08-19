## ADDED Requirements

### Requirement: User can view and edit basic profile information
The profile page SHALL display the user's basic info (nickname, gender, email, phone) and allow editing via a form.

#### Scenario: View profile
- **WHEN** user navigates to `/user/profile`
- **THEN** the page SHALL display current user info fetched from `/user/profile` API

#### Scenario: Update basic info
- **WHEN** user modifies nickname or gender and submits
- **THEN** the system SHALL call PUT `/user/profile/basic` and show success message

### Requirement: User can upload and crop avatar
The profile page SHALL provide an avatar upload with image cropping functionality.

#### Scenario: Avatar upload
- **WHEN** user selects an image file for avatar
- **THEN** a cropper dialog SHALL appear allowing the user to crop the image before uploading via POST `/user/profile/avatar`

### Requirement: User can change password
The profile page SHALL provide a password change form requiring old password and new password (with confirmation).

#### Scenario: Password change
- **WHEN** user enters current password, new password, and confirmation, then submits
- **THEN** the system SHALL RSA-encrypt the passwords and call PUT `/user/profile/password`

#### Scenario: Password mismatch
- **WHEN** new password and confirmation do not match
- **THEN** the form SHALL show a validation error without calling the API

### Requirement: User can change phone number
The profile page SHALL allow changing phone number with SMS verification.

#### Scenario: Phone change flow
- **WHEN** user enters new phone number and requests SMS code
- **THEN** the system SHALL call the captcha SMS API, and upon entering correct code, call PUT `/user/profile/phone`

### Requirement: User can change email
The profile page SHALL allow changing email with email verification.

#### Scenario: Email change flow
- **WHEN** user enters new email and requests email code
- **THEN** the system SHALL call the captcha email API, and upon entering correct code, call PUT `/user/profile/email`

### Requirement: User can manage social account bindings
The profile page SHALL display linked social accounts and allow binding/unbinding.

#### Scenario: View social bindings
- **WHEN** user views the social accounts section
- **THEN** the page SHALL show which social platforms are linked (with bind/unbind buttons)
