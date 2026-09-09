# @zvonok/client

Headless TypeScript core for ZvonOK video rooms: SFU connection, media
capture, device management, and screen share over mediasoup + Socket.io.
Framework-free; the React layer lives in [`@zvonok/react`](https://www.npmjs.com/package/@zvonok/react).

## Install

```bash
npm i @zvonok/client
```

## Usage

No barrel file - import from subpaths:

```ts
import { SfuManager } from "@zvonok/client/sfu/manager";
import { MediaStreamManager } from "@zvonok/client/media/manager";
```

Test doubles for the SFU manager and the screen-share service ship under
`sfu/__mocks__` and `screen-share/__mocks__` for use in your own test suites.

## Docs

Full walkthrough for external consumers: `docs/quickstart.md` in the
[repository](https://github.com/YuriFA/zvonOK).

## License

MIT
