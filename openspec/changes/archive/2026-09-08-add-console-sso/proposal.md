## Why

The developer console demands a second login even for visitors already signed
in on the main site. Two independent account systems are the right tenancy
boundary (app user vs platform developer), but the double manual login is
needless friction for the site's own users - and the 30-minute dev token makes
it recur all day.

## What Changes

- New `POST /developers/auth/sso` endpoint, protected by the app's cookie
  session (the global JWT guard, unlike every other developer route). For a
  signed-in app user it finds-or-creates their linked developer account and
  returns a dev token. The link is stored explicitly
  (`DeveloperAccount.userId`, additive migration): it is stable across
  sessions and never inferred from a username.
- On first SSO the developer account is created with the user's username and
  the same password hash, so the same credentials also work at the manual
  login form; if that username is taken by an unlinked developer account the
  resolver appends a numeric suffix instead of failing.
- The console login page shows a one-click "Continue as <username>" action
  for authenticated app visitors; the manual username/password form stays for
  external developers.
- No changes to existing developer endpoints, the `/v1` contract, or the
  manual register/login behavior.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `developer`: new "App-session sign-in" requirement covering the
  cookie-protected SSO endpoint, the persistent user link, username-collision
  suffixing, and copied credentials.
- `client`: "Developer console" requirement extended with a continue-as
  scenario for authenticated app visitors.
