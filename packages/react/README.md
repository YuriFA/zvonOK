# @zvonok/react

React bindings for the ZvonOK video platform: a drop-in room component and
headless hooks over [`@zvonok/client`](https://www.npmjs.com/package/@zvonok/client).

## Install

```bash
npm i @zvonok/react
```

Peer dependency: `react >= 18`.

## Drop-in room

```jsx
import { ZvonokRoom } from "@zvonok/react";

<ZvonokRoom
  serverUrl="https://your-zvonok-server.example"
  roomSlug="my-room"
  token="<minted room token>"
/>
```

## Headless hooks

```jsx
import { ZvonokProvider, useZvonokConnection, useParticipants } from "@zvonok/react";
```

`useHostControls()` adds `mutePeer`, `muteAll`, `lockRoom`, and `kickPeer`
for room tokens minted with the admin claim. The component imports its own
stylesheet; it is also exported as `@zvonok/react/zvonok.css` for manual
control.

## Docs

Full walkthrough for external consumers: `docs/quickstart.md` in the
[repository](https://github.com/YuriFA/zvonOK).

## License

MIT
