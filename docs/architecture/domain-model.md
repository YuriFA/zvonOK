# Domain Model — Entity Relationship

> Сущности базы данных и их связи. Источник истины: `apps/server/prisma/schema.prisma`.

```mermaid
erDiagram
    User ||--o{ Room : owns
    User ||--o{ Message : writes
    Room ||--o{ Message : contains

    User {
        string id PK
        string email UK
        string username UK
        string passwordHash
        string refreshTokenHash
        int failedLoginAttempts
        datetime lockedUntil
        int tokenVersion
        enum role
        datetime createdAt
        datetime updatedAt
    }

    Room {
        string id PK
        string slug UK
        string name
        string ownerId FK
        boolean isPublic
        int maxParticipants
        enum status
        datetime createdAt
        datetime updatedAt
        datetime endedAt
        datetime lastActivityAt
    }

    Message {
        string id PK
        string content
        string userId FK
        string guestId
        string roomId FK
        datetime createdAt
    }
}
```

## Text Diagram

```
┌──────────────────────────────────────┐
│                User                  │
├──────────────────────────────────────┤
│ id                  PK  (cuid)       │
│ email               UK               │
│ username            UK               │
│ passwordHash                         │
│ role                USER|HOST|ADMIN  │
│ refreshTokenHash    (nullable)       │
│ lockedUntil         (nullable)       │
│ tokenVersion        (default 0)      │
│ createdAt                            │
│ updatedAt                            │
└──────────────┬───────────┬───────────┘
               │ 1         │ 1
               │ owns      │ writes
               │ 0..*      │ 0..*
┌──────────────▼──────┐ ┌──▼─────────────────────┐
│        Room         │ │        Message         │
├─────────────────────┤ ├────────────────────────┤
│ id        PK (cuid) │ │ id        PK (cuid)    │
│ slug      UK (6ch)  │ │ content               │
│ name      (nullable)│ │ userId    FK → User?   │
│ ownerId   FK → User │ │ guestId   (nullable)  │
│ isPublic  (true)    │ │ roomId    FK → Room   │
│ maxPart.  (10)      │ │ createdAt             │
│ status  active|ended│ └───────────┬────────────┘
│ createdAt           │             │ N..1
│ updatedAt           │◄────────────┘ contains
│ endedAt  (nullable) │
│ lastActivity (null) │
└─────────────────────┘
```

## Entities

| Entity | Table | Description |
|--------|-------|-------------|
| **User** | `User` | Registered account. Stores hashed password and hashed refresh token. Role: USER / HOST / ADMIN. Owns rooms, writes messages. |
| **Room** | `Room` | Video call room identified by a unique slug. Owned by one User. Status: `active` or `ended`. |
| **Message** | `Message` | Chat message in a room. Author is either a registered user (`userId`, nullable) or a guest (`guestId`, nullable). Cascading delete with Room and User. |

## Relations

| Relation | Cardinality | On delete |
|----------|-------------|-----------|
| User → Room (`RoomHost`) | 1 : 0..* | - |
| User → Message | 1 : 0..* | Cascade |
| Room → Message | 1 : 0..* | Cascade |

## Indexes

| Table | Index | Type |
|-------|-------|------|
| `User` | `email` | Unique |
| `User` | `username` | Unique |
| `Room` | `slug` | Unique |
| `Room` | `ownerId` | B-tree (FK) |
| `Room` | `status` | B-tree |
| `Room` | `isPublic` | B-tree |
| `Message` | `roomId` | B-tree (FK) |
| `Message` | `userId` | B-tree (FK) |
| `Message` | `guestId` | B-tree |
