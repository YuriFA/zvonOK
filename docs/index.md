---
layout: home

hero:
  name: "ZvonOK"
  text: "Self-hosted video rooms with a developer platform"
  tagline: >-
    WebRTC rooms over a mediasoup SFU, a key-authenticated REST API for rooms,
    tokens and recordings, React SDKs - and a developer console in the web app
    at /console to manage projects, API keys and webhooks.
  actions:
    - theme: brand
      text: Get started
      link: /quickstart
    - theme: alt
      text: Self-host it
      link: /deployment

features:
  - icon: 🎥
    title: Video rooms
    details: >-
      Multiparty calls with media routed through a mediasoup SFU - no P2P
      path. Screen share, chat, host controls and an interactive whiteboard
      in the room UI.
    link: /quickstart
  - icon: 🔑
    title: Platform API
    details: >-
      Register a developer account, create a project, issue an API key, and
      drive rooms, participant tokens, egress sessions and webhooks through
      the /v1 REST surface.
    link: /api-reference
    linkText: API reference
  - icon: ⚛️
    title: React SDK
    details: >-
      @zvonok/react wraps the signalling and media plumbing - drop a Room
      component, pass a token, and your users are in a call. @zvonok/client
      carries the lower-level pieces.
    link: /quickstart
    linkText: Install the SDK
  - icon: ⏺️
    title: Recordings and live outputs
    details: >-
      Start egress for a project room with recording, RTMP or HLS outputs.
      Finalized MP4s stream with Range support - raw parts survive pipeline
      restarts.
    link: /egress
    linkText: Egress guide
  - icon: 🖊️
    title: Interactive whiteboard
    details: >-
      A shared whiteboard inside every room, with federated syncing and no
      third-party service.
    link: /whiteboard
    linkText: How it works
  - icon: 🚀
    title: Self-hosted, one VPS
    details: >-
      A five-service Docker stack behind a shared Traefik gateway, deployed
      with one command. The roadmap keeps the app a working product at every
      stage.
    link: /deployment
    linkText: Deploy it
---
