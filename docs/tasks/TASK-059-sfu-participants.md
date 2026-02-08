# TASK-059 — SFU Participants List UI

## Status
planned

## Priority
high

## Description
Create a participants list component for SFU group calls. Shows all participants in the room with their connection status, mute state, and controls.

## Scope
- Participants list component
- Participant item with avatar, name, status
- Mute/unmute indicators
- Kick participant (for room owner)
- Participant count badge

## Out of Scope
- Video grid layout (TASK-043)
- Speaker detection (TASK-044)

## Technical Design

### Component Structure
```typescript
<ParticipantsList>
  <ParticipantsHeader />
  <ParticipantsList>
    <ParticipantItem />
    <ParticipantItem />
    ...
  </ParticipantsList>
</ParticipantsList>
```

### Participant Data
```typescript
interface Participant {
  id: string;
  userId?: string;
  username: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isSpeaking?: boolean;
}
```

## Acceptance Criteria
- [ ] Participants list component created
- [ ] Shows all participants in room
- [ ] Displays mute/unmute status
- [ ] Displays video on/off status
- [ ] Shows connection status
- [ ] Updates in real-time
- [ ] Kick button for room owner
- [ ] Responsive design

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in component code
- TypeScript types are strict
- Accessible (ARIA labels)

## Related Files
- `apps/client/src/components/room/ParticipantsList.tsx`
- `apps/client/src/components/room/ParticipantItem.tsx`

## Next Task
TASK-060 — SFU Quality Indicator
