# Changelog

## [0.2.4](https://github.com/YuriFA/zvonOK/compare/v0.2.3...v0.2.4) (2026-04-01)

### Bug Fixes

* **ci:** add Prisma client generation before lint and typecheck ([c6e1fac](https://github.com/YuriFA/zvonOK/commit/c6e1fac8befaceebe110ad39ca33d9d8559c8155))

## [0.2.3](https://github.com/YuriFA/zvonOK/compare/v0.2.2...v0.2.3) (2026-03-31)

## [0.2.2](https://github.com/YuriFA/zvonOK/compare/v0.2.1...v0.2.2) (2026-03-31)

## [0.2.1](https://github.com/YuriFA/zvonOK/compare/v0.2.0...v0.2.1) (2026-03-31)

### Bug Fixes

* **ci:** add health endpoint, correct deploy paths, add prod logging ([4572902](https://github.com/YuriFA/zvonOK/commit/457290297bb695cb93701ded370c2294a4a6cf2b))

### Performance Improvements

* **docker:** add BuildKit cache mounts for pnpm store in server Dockerfile ([f0233db](https://github.com/YuriFA/zvonOK/commit/f0233dbda2a854fb1a9005e018f268b6917bf213))

## 0.2.0 (2026-03-31)

### Features

* add @zvonok/video-layout shared package ([a970fb9](https://github.com/YuriFA/zvonOK/commit/a970fb9343f9c7a6c5cd5bd5703bd0e4059c6223))
* add app versioning with release-it automation ([f1e0fea](https://github.com/YuriFA/zvonOK/commit/f1e0feaf9bb23bf7eaed8669a37411522e920aba))
* add media controls with peer state synchronization ([9053190](https://github.com/YuriFA/zvonOK/commit/90531909a0943031a60ebc33f7a51b2bd58b0c8a))
* add oxlint and oxfmt tooling ([b6e26cf](https://github.com/YuriFA/zvonOK/commit/b6e26cf2313f84fa3998496f99d39585936d0a94))
* **auth:** add user roles for room creation ([9c0b6a2](https://github.com/YuriFA/zvonOK/commit/9c0b6a228aba70816319a9c8f3522f954dc9e453))
* **client/sfu:** add participant tracking and consumer events ([e09730c](https://github.com/YuriFA/zvonOK/commit/e09730c9321e64c950b66500234c75ad0d3becf9))
* **client:** add active speaker detection (TASK-002) ([4721091](https://github.com/YuriFA/zvonOK/commit/4721091a4624054c3070e70f1bdcb45c13e9a533))
* **client:** add adaptive video grid layout (TASK-001) ([552d9b7](https://github.com/YuriFA/zvonOK/commit/552d9b7746c806c442a20c5342a087d55d1b1209))
* **client:** add Alert UI component ([a1fd04b](https://github.com/YuriFA/zvonOK/commit/a1fd04b082f6d03a68f9e0c7062a3d99d129216f))
* **client:** add app branding with favicon and page title ([5233ae9](https://github.com/YuriFA/zvonOK/commit/5233ae9c5e55e8930dedcbf2c88090ff917d304e))
* **client:** add audio level indicator rings around avatar when video is off ([d3226b0](https://github.com/YuriFA/zvonOK/commit/d3226b03d210aa5742927ec69aaabfad54a0059f))
* **client:** add device permission handling with graceful degradation ([6ff772b](https://github.com/YuriFA/zvonOK/commit/6ff772b9347f17e2ca249fbba72547034c5054e8))
* **client:** add device settings panel with speaker support ([0374968](https://github.com/YuriFA/zvonOK/commit/0374968010510fa44a6a869917e7bf9a01f70366))
* **client:** add device switching with replaceTrack support ([044f814](https://github.com/YuriFA/zvonOK/commit/044f8143db02cd25465822c990d30978453ed370))
* **client:** add display name input in prejoin view ([2dcb792](https://github.com/YuriFA/zvonOK/commit/2dcb792a45b76ca1dd07a461c9f8ab5d50655b34))
* **client:** add media error indicators on controls ([139b766](https://github.com/YuriFA/zvonOK/commit/139b7663ac9a99082eb77f48c969e6b778a29516))
* **client:** add MediaStreamManager and LocalVideo component ([5e19850](https://github.com/YuriFA/zvonOK/commit/5e19850d000c76f6b57eb2e4c9db3f7728ab84be))
* **client:** add ParticipantItem and ParticipantsList components ([653d060](https://github.com/YuriFA/zvonOK/commit/653d060d8d38139233547615464c9f336d8fd3d0))
* **client:** add participants state to use-mediasoup hook ([0a80222](https://github.com/YuriFA/zvonOK/commit/0a80222fad4d325ef50aeeb143eb2a0a67c525fc))
* **client:** add pastel avatar colors and simplify remote video UI ([6955bd0](https://github.com/YuriFA/zvonOK/commit/6955bd086bb78a9473db36cfabcd7024bec26ffc))
* **client:** add SFU client integration for group calls ([1616d1b](https://github.com/YuriFA/zvonOK/commit/1616d1b86f1152b0b7a524e4f1df52cb458bdbf0))
* **client:** add SFU connection quality indicator (TASK-009) ([3a22cc0](https://github.com/YuriFA/zvonOK/commit/3a22cc05d9f6674eed7d3b1441b3c1c138c6c9e3))
* **client:** add theme system with color variants and SVG support ([9968ef2](https://github.com/YuriFA/zvonOK/commit/9968ef21963a65971f83be0d97987b20cfbc6551))
* **client:** add toast notifications with sonner ([0808445](https://github.com/YuriFA/zvonOK/commit/080844593b0ef988e493ad3830de2e0816f3b872))
* **client:** add toggleable participants panel with slide animation ([ec2ce47](https://github.com/YuriFA/zvonOK/commit/ec2ce4707748d44d908a14165ae6fba3e4d38421))
* **client:** add useMediaDevices hook for device enumeration ([c51373e](https://github.com/YuriFA/zvonOK/commit/c51373ea116238a99c86f943a98fc02227da8da6))
* **client:** add WebRTC peer connection manager and RemoteVideo component ([1c7bb33](https://github.com/YuriFA/zvonOK/commit/1c7bb33733beba577339698adff949b01379e113))
* **client:** implement authentication flow with HTTP-only cookies ([6ecaa69](https://github.com/YuriFA/zvonOK/commit/6ecaa693dfc6bb9499c9fc126f2454eb6d052cac))
* **client:** implement WebRTC offer/answer exchange ([5b5dba3](https://github.com/YuriFA/zvonOK/commit/5b5dba31397530b971122cf5d4aee9188ed17a56))
* **client:** improve room UI with theme switcher and simplified copy link ([4e4d5ec](https://github.com/YuriFA/zvonOK/commit/4e4d5ec7d779d2f95270dc0292d1623d6cf81a83))
* **client:** integrate LocalVideo into DeviceSelector and RoomPage ([4c48932](https://github.com/YuriFA/zvonOK/commit/4c489327cdaee776835912fa8b05e5532e0ff693))
* **client:** integrate ParticipantsList into room view ([6a80225](https://github.com/YuriFA/zvonOK/commit/6a80225cd03f4c93059a5db762f0dcfb07780a3c))
* **client:** redesign home page with hero section ([987bae5](https://github.com/YuriFA/zvonOK/commit/987bae5d92f2bc5ca48f490bdf79321d5a5b6d37))
* **client:** redesign home page with modern hero section ([04ca865](https://github.com/YuriFA/zvonOK/commit/04ca8656c7b1c9bcb39f08e454615670d304ed3e))
* **client:** redesign prejoin device controls with unified control group ([b77434c](https://github.com/YuriFA/zvonOK/commit/b77434c594885c990a9ef632e70ebcc5f211f5f4))
* **client:** replace per-peer video audio with Web Audio API mixer ([cddef22](https://github.com/YuriFA/zvonOK/commit/cddef22de379f141d979b2efa4327a1b909571c7))
* **client:** stage 6 task 3 pre join lobby ([f39dd8f](https://github.com/YuriFA/zvonOK/commit/f39dd8f42612326c36c7c032989503e4bce33ca0))
* **gateway:** add JWT authentication and room validation ([fe09d37](https://github.com/YuriFA/zvonOK/commit/fe09d3734f0ee064cd43fdf9b6c5310c57afb17d))
* **gateway:** add room join/leave functionality ([f1a7d37](https://github.com/YuriFA/zvonOK/commit/f1a7d37df347ba4a427010f2c1f65aa6570a0759))
* **gateway:** add Socket.io server setup for WebRTC signalling ([0e7102a](https://github.com/YuriFA/zvonOK/commit/0e7102ac18a07121a4ad06f9965ca2fd86166ac0))
* **gateway:** add WebRTC signalling handlers ([ab9cc68](https://github.com/YuriFA/zvonOK/commit/ab9cc68415a032b899f0bc67689faed8cac85bb7))
* init prisma ([8423c87](https://github.com/YuriFA/zvonOK/commit/8423c8712192336f935f704bd77c19403663e974))
* react version of webrtc chat ([df2edab](https://github.com/YuriFA/zvonOK/commit/df2edabec67adc2aae84c3e2760af35a3fc1a127))
* rooms api ([080eba4](https://github.com/YuriFA/zvonOK/commit/080eba409260fe5621606f8ca36bcf8673b989b9))
* rooms api integration in client ([a8dc15f](https://github.com/YuriFA/zvonOK/commit/a8dc15f8a87543fe63afaac73449c1b95ff78c30))
* rooms lobby ([615f9af](https://github.com/YuriFA/zvonOK/commit/615f9af8a651c15a3325745f6e5a981a3b7a27af))
* server auth ([381d407](https://github.com/YuriFA/zvonOK/commit/381d407625c8bb866a36959c696026d81b884ddb))
* **server:** add admin user seeding for production deployments ([aba482b](https://github.com/YuriFA/zvonOK/commit/aba482b712c8de48221a59ee5e5d995e3b5c50b1))
* **server:** add CORS config and GET /auth/me endpoint for client auth ([a22a830](https://github.com/YuriFA/zvonOK/commit/a22a830343f4ed4e651d9e82285c7e546071693d))
* **server:** add Docker configuration for mediasoup worker production ([af15fa6](https://github.com/YuriFA/zvonOK/commit/af15fa60c7791b4ee5000d58734344fbbdf64644))
* **server:** pre-configure pgAdmin server connection ([37db306](https://github.com/YuriFA/zvonOK/commit/37db3067d834cad69f0e0f686ad3e894c9130d92))
* **sfu:** add mediasoup SFU module for group calls ([c2dd34e](https://github.com/YuriFA/zvonOK/commit/c2dd34e373a7b19a1bbad0bab1a7d71263457633))
* **sfu:** add participant tracking events and consumer management ([278fcea](https://github.com/YuriFA/zvonOK/commit/278fcea02bee5c5ac8ed490deffe4c3add492e97))
* **sfu:** broadcast producer pause/resume state to peers ([b7ce6e4](https://github.com/YuriFA/zvonOK/commit/b7ce6e4adfb444160232be5bfe185f6c4cdd96f3))
* **sfu:** show participants without media in room ([155300a](https://github.com/YuriFA/zvonOK/commit/155300add0768a068b432ee04ad7c2166a61be9a))
* stage 6 task 5 camera toggle ([e5b6631](https://github.com/YuriFA/zvonOK/commit/e5b6631e756cf9a46f549a3b7a551d0a1c3025a3))

### Bug Fixes

* add pgadmin to docker compose. using docker compose with env file param ([34311c6](https://github.com/YuriFA/zvonOK/commit/34311c61da9bca7cac96ead8efdb73a2f5c71260))
* auth ([503981d](https://github.com/YuriFA/zvonOK/commit/503981dfbd1698cf0a2b3f5337a6c88ebb0064e0))
* auth ([1969ab5](https://github.com/YuriFA/zvonOK/commit/1969ab5e6af3ff321f4c23b4bec3ea5e50ed516f))
* auth flow ([786a4e5](https://github.com/YuriFA/zvonOK/commit/786a4e59001448b62aedcfc021e639dd9ac7917c))
* auth flow tests ([920baec](https://github.com/YuriFA/zvonOK/commit/920baecacd122fefde10b2c04c01346bc021ae82))
* **client:** add error logging for speaker device switching failures ([d42a584](https://github.com/YuriFA/zvonOK/commit/d42a584732257fefdb9d35e6da4e3bf098282642))
* **client:** add eslint-disable for useAuth export ([966d8e1](https://github.com/YuriFA/zvonOK/commit/966d8e162dbbccc318cdd59322e8e28db31b5ca5))
* **client:** add missing card CSS variables to color themes ([4d2c71b](https://github.com/YuriFA/zvonOK/commit/4d2c71bfd18ba0a841a71e3cae494e4916570161))
* **client:** capitalize Create an account link text ([907fa6b](https://github.com/YuriFA/zvonOK/commit/907fa6b7d0fe72f13c422e41740a58ec8efe302e))
* **client:** lower active speaker threshold for better sensitivity ([369f465](https://github.com/YuriFA/zvonOK/commit/369f465a341b3f31a3ff0404dec6d3fe161b287d))
* **client:** show alerts for missing camera and microphone devices ([6f42504](https://github.com/YuriFA/zvonOK/commit/6f42504e5536c8b6a019112beb5288fb236aa000))
* **client:** stop media tracks after permission request ([3531f07](https://github.com/YuriFA/zvonOK/commit/3531f07d17230a634446b8628d791d58a0ee4244))
* **client:** update tests to match refactored components ([d63e4b8](https://github.com/YuriFA/zvonOK/commit/d63e4b82fcf025384fac69f96f881f61d73644f3))
* **client:** use dynamic viewport height utilities with dvh fallback ([9189051](https://github.com/YuriFA/zvonOK/commit/91890513a27025840318c49305729f81235039a6))
* docker compose pg healthcheck ([f0e1821](https://github.com/YuriFA/zvonOK/commit/f0e182186ce426d7114038c7ce628ab7a521c825))
* **docker:** copy generated Prisma client into migrator stage for seed ([b284463](https://github.com/YuriFA/zvonOK/commit/b2844639531cdd9a73c34e1a77183c4a44b8fac6))
* **docker:** copy whole monorepo to resolve workspace package imports ([87e71e9](https://github.com/YuriFA/zvonOK/commit/87e71e91a9062e1780a43957ca55909673a76ea9))
* **docker:** filter pnpm install to client deps only, skip mediasoup ([27d4d66](https://github.com/YuriFA/zvonOK/commit/27d4d66149aed694454e0e2e2d55c62aaf0beaf9))
* fix ([e668fd6](https://github.com/YuriFA/zvonOK/commit/e668fd6013267588d46edff2d74bf5e9d7005609))
* move task files to correct stage and renumber IDs ([1a14850](https://github.com/YuriFA/zvonOK/commit/1a14850cc5d77edba40305360fda3ed377e66333))
* remove empty captions track from remote video ([bbda17d](https://github.com/YuriFA/zvonOK/commit/bbda17d0d0ec2f26a9c873474d17de53c54e9d9f))
* **server:** add missing UserService mock to AuthController test ([95a9108](https://github.com/YuriFA/zvonOK/commit/95a9108c186e6c687ee65499ba121eadd7b4a8f1))
* update docs ([3815681](https://github.com/YuriFA/zvonOK/commit/3815681d6723f88e616aaa1cbb20d562828a81fe))
