# TASK-013 — Lobby Page

## Status
completed

## Priority
high

## Description
Implement main lobby page with room joining functionality and user authentication status display.

## Scope
- Create lobby page layout
- Display user info when authenticated
- Show login/register links when not authenticated
- Room join input with button
- Link to create new room
- Redirect to room page on join

## Out of Scope
- Actual room functionality (covered in TASK-019 to TASK-026)

## Technical Design

### Page Layout
- Header with app title and user info/logout
- Main content with room join section
- Footer with additional links

### States
- Not authenticated - show login/register links
- Authenticated - show room join form
- Joining - show loading state

### Room Join Flow
1. User enters room code or clicks "Create Room"
2. Validate input
3. Navigate to `/room/:roomCode`
4. Room page handles actual WebRTC setup

## Acceptance Criteria
- Lobby page displays correctly
- Authenticated users see room join form
- Unauthenticated users see login/register links
- Room join navigates to room page
- Logout functionality works

## Definition of Done
- Lobby page implemented
- User authentication status checked
- Room join form works
- Navigation to room page works
- Logout button functions

## Implementation Guide

## Related Files
- `apps/client/src/routes/lobby.tsx`

## Next Task
TASK-014 — PostgreSQL + Prisma Setup
