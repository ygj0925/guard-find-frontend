## ADDED Requirements

### Requirement: Dev proxy uses /dev-api prefix
The system SHALL proxy all API requests through the `/dev-api` prefix in development mode, with pathRewrite stripping the prefix before forwarding to `http://localhost:8000`.

#### Scenario: API request in development
- **WHEN** the frontend makes a request to `/dev-api/auth/login`
- **THEN** the dev proxy SHALL forward it to `http://localhost:8000/auth/login` (prefix stripped)

### Requirement: Request interceptor prepends correct prefix
The request interceptor SHALL prepend `process.env.requestPrefix` (value: `/dev-api`) to all outgoing API calls.

#### Scenario: Request URL construction
- **WHEN** a service calls `request('/system/user', { method: 'GET' })`
- **THEN** the actual request URL SHALL be `/dev-api/system/user`

### Requirement: Production API base URL configuration
The production config SHALL define the appropriate `requestPrefix` or base URL for the deployed environment.

#### Scenario: Production build
- **WHEN** the app is built for production
- **THEN** the requestPrefix SHALL point to the production API gateway path
