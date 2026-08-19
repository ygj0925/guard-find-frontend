## ADDED Requirements

### Requirement: System config organized as tabbed sub-pages
The system configuration SHALL be organized into multiple tab pages: Site, Security, Mail, Login, Storage, SMS, Client.

#### Scenario: Navigate config tabs
- **WHEN** admin navigates to `/system/config`
- **THEN** the page SHALL display tabs for each configuration category

### Requirement: Site configuration
The site config tab SHALL allow editing site name, logo, favicon, copyright, and ICP filing info.

#### Scenario: Update site config
- **WHEN** admin modifies site settings and saves
- **THEN** the system SHALL call PUT `/system/option` with site-related option keys

### Requirement: Security configuration
The security tab SHALL allow configuring password policies (min length, complexity, expiration days, max retries).

#### Scenario: Update security config
- **WHEN** admin modifies security policies and saves
- **THEN** the system SHALL call PUT `/system/option` with security-related keys

### Requirement: Mail configuration
The mail tab SHALL allow configuring SMTP settings (host, port, username, password, from address, SSL/TLS).

#### Scenario: Update mail config
- **WHEN** admin fills SMTP settings and saves
- **THEN** the system SHALL call PUT `/system/option` with mail-related keys

### Requirement: Login configuration
The login tab SHALL allow configuring login policies (captcha enabled, auto-lock, allowed login methods).

#### Scenario: Update login config
- **WHEN** admin modifies login policies and saves
- **THEN** the system SHALL call PUT `/system/option` with login-related keys

### Requirement: Storage site configuration
The storage tab SHALL allow selecting the default storage type and configuring storage parameters.

#### Scenario: Update storage site config
- **WHEN** admin selects storage type and configures parameters
- **THEN** the system SHALL call PUT `/system/option` with storage-related keys

### Requirement: SMS configuration
The SMS tab SHALL allow configuring SMS provider settings.

#### Scenario: Update SMS config
- **WHEN** admin configures SMS provider details and saves
- **THEN** the system SHALL call PUT `/system/option` with SMS-related keys

### Requirement: Client configuration
The client tab SHALL allow managing OAuth client configurations.

#### Scenario: Update client config
- **WHEN** admin modifies client settings and saves
- **THEN** the system SHALL call PUT `/system/option` with client-related keys
