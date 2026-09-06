# developer

## ADDED Requirements

### Requirement: Webhook configuration endpoints
The developer module SHALL expose webhook configuration for projects:
`PUT /developers/projects/:id/webhooks` sets or replaces the endpoint (URL
validated as https, new signing secret generated and returned in the response)
and `DELETE /developers/projects/:id/webhooks` removes it. Both require the
developer session bearer token and SHALL only act on the authenticated
developer's own projects.

#### Scenario: Developer sets an endpoint
- **WHEN** the developer sends a valid https URL to the webhook endpoint route
- **THEN** the configuration is stored for the project and the response contains the generated signing secret

#### Scenario: Another developer's project
- **WHEN** a developer attempts to configure webhooks on a project they do not own
- **THEN** the server responds 404 and nothing changes

#### Scenario: Invalid URL
- **WHEN** the webhook URL is not a valid https URL
- **THEN** the server responds 400 and the previous configuration is unchanged
