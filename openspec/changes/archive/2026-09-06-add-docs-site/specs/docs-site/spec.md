# docs-site

## ADDED Requirements

### Requirement: Public documentation site
The project SHALL publish a static documentation site at `docs.<domain>`
(the site domain) over HTTPS, served by a dedicated static-file container
registered with the shared Traefik gateway via the add-a-site pattern. The
site SHALL present the curated documentation set (quickstart, deployment,
platform roadmap) rendered from the repository markdown, and SHALL NOT
publish internal material (archives, research notes, planning documents).

#### Scenario: Visitor reads the quickstart
- **WHEN** a visitor opens `https://docs.<domain>` in a browser
- **THEN** the quickstart content from the repository renders as a styled page with working navigation to the other curated pages

#### Scenario: Internal material stays private
- **WHEN** the site is built
- **THEN** excluded directories and planning files are absent from the output

### Requirement: Docs deployment flow
The docs image SHALL be built by CI and deployed together with the platform
images: a content change to the curated markdown, merged to the release
ref, results in a rebuilt `ghcr.io/<repo>/docs` image and a running docs
container serving the new content after `docker compose up -d`.

#### Scenario: Content change ships
- **WHEN** a commit changes docs/quickstart.md and the deploy workflow runs
- **THEN** a new docs image is published and the docs container serves the updated quickstart after redeploy
