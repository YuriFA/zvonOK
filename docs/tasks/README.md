# WebRTC Chat — Implementation Tasks

> Task files and implementation guides for the WebRTC chat application

---

## 📖 Documentation

- **[Software Design Document (SDD)](../SDD.md)** — Complete system architecture and design
- **[Roadmap](../roadmap.md)** — Implementation phases and task status
- **[Module Documentation](../modules/)** — API contracts for each module
- **[Agent Guide](../agent-guide.md)** — Guidelines for AI agents

---

## 📚 Task Structure

This directory contains:

1. **Task Files** (`TASK-XXX-*.md`) — Structured task specifications
   - Status, scope, acceptance criteria
   - Used for tracking implementation progress

2. **Phase Guides** (`phase-*/`) — Step-by-step implementation tutorials (Russian)
   - Educational materials with code examples
   - Referenced by task files

---

## 🎯 Quick Start

### Current Phase

See [Roadmap](../roadmap.md) for the current implementation phase and active tasks.

### Finding Tasks

All tasks are listed in the [Roadmap](../roadmap.md), organized by phase:

- **Phase 0** — WebRTC Theory
- **Phase 0.5** — Frontend Auth ✅ 
- **Phase 1** — Backend ✅
- **Phase 2** — Signalling Server 🚧
- **Phase 3-11** — Planned

### Task Format

Each task file includes:
- Обзор (Overview)
- Статус (Status)
- Цель (Goal)
- Материалы (Resources)
- Пошаговая инструкция (Step-by-step)
- Критерии выполнения (Acceptance criteria)

---

## 📋 Phase Guides (Russian)

Detailed implementation tutorials are organized in `phase-*/` directories:

- `phase-00-theory/` — WebRTC fundamentals
- `phase-0.5-frontend-auth/` — React authentication ✅
- `phase-01-backend/` — NestJS backend ✅
- `phase-02-signalling/` — WebSocket signalling 🚧
- `phase-03-webrtc-p2p/` — P2P video calls
- `phase-04-screen-share/` — Screen sharing
- `phase-05-devices/` — Device management
- `phase-06-chat/` — Text chat
- `phase-07-sfu/` — mediasoup SFU
- `phase-08-video-grid/` — Video layout
- `phase-09-deploy/` — Production deployment
- `phase-10-quality/` — Network quality
- `phase-11-future/` — Enhancements

---

## 🚀 For Developers

**Before starting a new task:**
1. Read the [SDD](../SDD.md) to understand the architecture
2. Check the [Roadmap](../roadmap.md) for dependencies
3. Follow the task file step-by-step
4. Update task status when complete

**For AI agents:**
See [Agent Guide](../agent-guide.md) for development rules and patterns.
