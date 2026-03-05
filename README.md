<div align="center">

# LetsMeet

**Production-grade video conferencing backend built for scale, security, and real-time communication.**

[![CI](https://github.com/MuditGarg007/LetsMeet-Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/MuditGarg007/LetsMeet-Backend/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=nodedotjs)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

[Features](#features) · [Architecture](#architecture) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [API Reference](#api-reference) · [WebSocket Events](#websocket-events) · [Deployment](#deployment)

</div>

---

## Overview

LetsMeet is a **Zoom-like video conferencing backend** built with Node.js, TypeScript, and [mediasoup](https://mediasoup.org/) — a battle-tested Selective Forwarding Unit (SFU) for WebRTC. It provides a complete REST API, real-time signaling over Socket.IO, and multi-party media routing through a mediasoup SFU — all in a clean, modular monolith architecture designed with production-quality standards.

---

## Features

- **Multi-party video & audio** via mediasoup SFU — scales to 50+ participants per room without peer-to-peer mesh overhead
- **Screen sharing** — first-class support via tagged media producers
- **In-meeting chat** — real-time Socket.IO broadcast + persisted PostgreSQL history with cursor-based pagination
- **JWT auth with refresh token rotation** — short-lived access tokens (15m), long-lived refresh tokens (7d), Redis blacklisting on revocation
- **Rate limiting** — Redis-backed, per-route tiers (10 req/min auth, 100 req/min general)
- **RFC 7807 error responses** — consistent, machine-readable error format across all endpoints
- **Structured logging** — pino JSON logs in production, pretty-print in development, with correlation IDs per request
- **Health check endpoint** — reports live status of PostgreSQL and Redis
- **Graceful shutdown** — drains HTTP connections, closes Redis and mediasoup workers cleanly on SIGTERM/SIGINT
- **Docker-ready** — multi-stage Dockerfile + docker-compose for local dev
- **Render-ready** — `render.yaml` Blueprint for one-click cloud deploy
- **39 unit tests** — covering utilities, error classes, validation schemas

---

## Architecture

LetsMeet follows a **Modular Monolith** pattern — a single deployable unit with strict internal module boundaries, making it straightforward to reason about locally and extract into microservices later if needed.

### System Overview

```
Client (Browser)
    │
    ├─── HTTPS (REST API) ──────────────────────► Express API Server
    │                                               │
    ├─── WSS (Socket.IO) ───────────────────────►  │── Meeting signaling
    │                                               │── Chat events
    └─── WebRTC DTLS/SRTP ──────────────────────►  │── mediasoup SFU
                                                    │
                                        ┌───────────┴───────────┐
                                   Neon PostgreSQL         Upstash Redis
                                   (persistent data)       (sessions, cache,
                                                            rate limits)
```

### Module Structure

```
src/
├── config/          # Environment, database, redis, logger, mediasoup config
├── modules/
│   ├── auth/        # JWT authentication
│   ├── users/       # User profile management
│   ├── meetings/    # Meeting lifecycle (create, join, leave, end)
│   ├── chat/        # In-meeting chat
│   └── health/      # Liveness/readiness probe
├── shared/
│   ├── db/          # Drizzle ORM schema
│   ├── errors/      # RFC 7807 error hierarchy
│   ├── middleware/   # Auth, validation, rate-limiting, error handler
│   └── utils/       # JWT, bcrypt, meeting code generator
├── socket/          # Socket.IO server + event handlers
├── media/           # mediasoup worker pool + room manager
├── app.ts           # Express app assembly
└── server.ts        # Bootstrap + graceful shutdown
```

### Request Lifecycle

```
Request → Correlation ID → Rate Limiter → JWT Auth → Zod Validation → Controller → Service → DB/Redis → Response
                                                                                                ↓ (on error)
                                                                                         Error Handler
                                                                                         (RFC 7807 JSON)
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 20 | LTS, native ESM, excellent WebRTC ecosystem |
| Language | TypeScript 5 (strict) | Type safety across the entire stack |
| Framework | Express.js 5 | Minimal, stable, battle-tested |
| Media SFU | mediasoup 3 | Production WebRTC SFU, VP8/H264/Opus |
| Real-time | Socket.IO 4 | WebSocket signaling with fallback |
| Database | PostgreSQL (Neon) | ACID, relational, serverless-friendly |
| ORM | Drizzle ORM | Type-safe, lightweight, fast migrations |
| Cache | Redis (Upstash) | Rate limits, session tokens, pub/sub ready |
| Validation | Zod | Runtime + compile-time type inference |
| Logging | pino | Fastest Node.js logger, structured JSON |
| Testing | Vitest | ESM-native, fast, Jest-compatible |
| Auth | JWT (jsonwebtoken) | Stateless access + rotating refresh tokens |
| Hashing | bcrypt | 12-round password hashing |
| Deployment | Docker + Render | Multi-stage build, one-click deploy |
| CI/CD | GitHub Actions | Automated lint, test, and deploy |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker + Docker Compose (for local dev)

### 1. Clone & Install

```bash
git clone https://github.com/MuditGarg007/LetsMeet-Backend.git
cd LetsMeet-Backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

# Database — get from https://neon.tech (free tier)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Redis — get from https://upstash.com (free tier)
REDIS_URL=redis://default:password@host:6379

# JWT — must be at least 32 characters each
JWT_ACCESS_SECRET=your-access-secret-min-32-chars-here
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# mediasoup
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100
```

> **Note:** Avoid `$` characters in JWT secrets — shells may interpolate them. Use alphanumeric + `!@#%^&*` etc.

### 3. Start Local Services

```bash
# Option A: Use Docker for Postgres + Redis (local dev)
docker-compose up -d

# Then point .env to local:
# DATABASE_URL=postgresql://letsmeet:letsmeet_dev@localhost:5432/letsmeet
# REDIS_URL=redis://localhost:6379

# Option B: Use Neon + Upstash (remote, no Docker needed)
# Just set the URLs in .env directly
```

### 4. Run Migrations

```bash
npm run db:push      # Push schema to database (dev)
# or
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations (prod-style)
```

### 5. Start Dev Server

```bash
npm run dev
# Server running on http://localhost:3000
# Hot-reloads on file changes via tsx watch
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Watch mode tests |
| `npm run test:coverage` | Tests with v8 coverage report |
| `npm run lint` | TypeScript type check (`tsc --noEmit`) |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio (GUI) |

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

All responses follow **RFC 7807** for errors:
```json
{
  "type": "https://letsmeet.app/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid or expired token",
  "instance": "/api/v1/users/me",
  "correlationId": "a3f2b1c4-..."
}
```

Protected routes require: `Authorization: Bearer <accessToken>`

---

### Auth

#### `POST /auth/register`
Create a new account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1",
  "displayName": "Jane Doe"
}
```

Password requirements: ≥ 8 chars, 1 uppercase, 1 lowercase, 1 number.

**Response `201`:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "avatarUrl": null,
    "createdAt": "2026-03-05T17:00:00.000Z"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### `POST /auth/login`
Authenticate and receive tokens.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1"
}
```

**Response `200`:** Same shape as register.

---

#### `POST /auth/refresh`
Rotate refresh token. The submitted token is immediately invalidated.

**Request body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### `POST /auth/logout`
Revoke the refresh token.

**Request body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `204`:** No content.

---

### Users

#### `GET /users/me`
Get current user profile.

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "avatarUrl": "https://...",
    "createdAt": "2026-03-05T17:00:00.000Z"
  }
}
```

---

#### `PATCH /users/me`
Update profile fields.

**Request body** (all optional):
```json
{
  "displayName": "Jane Smith",
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}
```

**Response `200`:** Updated user object.

---

### Meetings

#### `POST /meetings`
Create a new meeting.

**Request body** (all optional):
```json
{
  "title": "Q1 Planning",
  "scheduledAt": "2026-03-10T10:00:00.000Z",
  "maxParticipants": 25,
  "settings": {
    "muteOnJoin": true,
    "waitingRoom": false
  }
}
```

**Response `201`:**
```json
{
  "meeting": {
    "id": "uuid",
    "code": "abc-defg-hij",
    "title": "Q1 Planning",
    "hostId": "uuid",
    "status": "waiting",
    "scheduledAt": "2026-03-10T10:00:00.000Z",
    "maxParticipants": 25,
    "settings": { "muteOnJoin": true, "waitingRoom": false },
    "createdAt": "2026-03-05T17:00:00.000Z"
  }
}
```

The `code` is a unique human-readable join code (format: `xxx-xxxx-xxx`).

---

#### `GET /meetings`
List your meetings. Supports filtering and pagination.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `waiting \| active \| ended` | — | Filter by status |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 50) |

**Response `200`:**
```json
{
  "meetings": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

#### `GET /meetings/:id`
Get a specific meeting with its participants.

**Response `200`:**
```json
{
  "meeting": { ... },
  "participants": [
    {
      "id": "uuid",
      "userId": "uuid",
      "role": "host",
      "joinedAt": "2026-03-05T17:05:00.000Z",
      "leftAt": null,
      "displayName": "Jane Doe",
      "avatarUrl": null
    }
  ]
}
```

---

#### `GET /meetings/join/:code`
Look up a meeting by its join code.

**Response `200`:** Meeting object.

---

#### `POST /meetings/:id/join`
Join a meeting. Returns a one-time `socketToken` (valid 60s) for WebSocket authentication.

**Response `200`:**
```json
{
  "participant": {
    "id": "uuid",
    "meetingId": "uuid",
    "userId": "uuid",
    "role": "participant",
    "joinedAt": "..."
  },
  "socketToken": "550e8400-e29b-..."
}
```

> The `socketToken` must be passed as `socket.handshake.auth.socketToken` when connecting to Socket.IO. It is consumed on first use.

---

#### `POST /meetings/:id/leave`
Leave a meeting. Sets `leftAt` timestamp on participant record.

**Response `204`:** No content.

---

#### `POST /meetings/:id/end` *(host only)*
End a meeting for all participants. Sets status to `ended`, marks all active participants as left, and cleans up Redis state.

**Response `204`:** No content.

---

### Chat History

#### `GET /meetings/:id/chat`
Retrieve paginated chat message history (cursor-based, latest first).

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | UUID | Fetch messages before this message ID |
| `limit` | number | Items per page (default 50, max 100) |

**Response `200`:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "meetingId": "uuid",
      "senderId": "uuid",
      "content": "Hello everyone!",
      "createdAt": "2026-03-05T17:10:00.000Z",
      "senderName": "Jane Doe",
      "senderAvatar": null
    }
  ],
  "nextCursor": "uuid-of-last-message-or-null"
}
```

---

### Health

#### `GET /health`
Returns live status of all dependent services. Used for Render health checks.

**Response `200` (healthy):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T17:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Response `503` (degraded):** Same shape with `"status": "degraded"` and individual service showing `"down"`.

#### `HEAD /health`
Lightweight probe — returns `200` if healthy, `503` if degraded. No response body.

---

## WebSocket Events

Connect after calling `POST /meetings/:id/join` to obtain a `socketToken`.

```javascript
const socket = io('http://localhost:3000', {
  auth: { socketToken: '<socketToken from join response>' }
});
```

The socket is automatically joined to the meeting room upon connection.

---

### Meeting Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `meeting:leave` | — | Leave the meeting |
| C → S | `meeting:end` | — | End meeting (host only) |
| S → C | `meeting:user-joined` | `{ userId, socketId }` | A new participant connected |
| S → C | `meeting:user-left` | `{ userId }` | A participant disconnected |
| S → C | `meeting:ended` | — | Host ended the meeting |

---

### Chat Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `chat:send` | `{ content: string }` | Send a message (max 2000 chars) |
| S → C | `chat:new-message` | `{ message }` | Broadcast to all room members |

---

### Media Events (mediasoup Signaling)

The WebRTC flow follows the standard mediasoup pattern:

```
1. Get router capabilities
2. Create a send transport
3. Connect the send transport (DTLS)
4. Start producing (audio/video/screen)
5. Get existing producers in the room
6. For each producer: create recv transport → connect → consume → resume
```

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `media:get-router-capabilities` | — | Get router RTP capabilities |
| C → S | `media:create-transport` | `{ direction: 'send' \| 'recv' }` | Create a WebRTC transport |
| C → S | `media:connect-transport` | `{ transportId, dtlsParameters }` | Finalize DTLS handshake |
| C → S | `media:produce` | `{ transportId, kind, rtpParameters, appData? }` | Start producing media |
| C → S | `media:consume` | `{ producerId, transportId }` | Consume a remote producer |
| C → S | `media:resume-consumer` | `{ consumerId }` | Resume a paused consumer |
| C → S | `media:producer-pause` | `{ producerId }` | Mute / pause own track |
| C → S | `media:producer-resume` | `{ producerId }` | Unmute / resume own track |
| C → S | `media:producer-close` | `{ producerId }` | Stop producing a track |
| C → S | `media:get-producers` | — | Get all active producers in room |
| S → C | `media:new-producer` | `{ producerId, userId, kind, appData }` | A new producer is available |
| S → C | `media:producer-closed` | `{ producerId, userId }` | A producer has stopped |
| S → C | `media:producer-paused` | `{ producerId, userId }` | A producer was paused |
| S → C | `media:producer-resumed` | `{ producerId, userId }` | A producer was resumed |

#### Screen Sharing

Screen sharing is produce/consume like any other video track, identified by `appData.type = 'screen'`.

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `screen:share-start` | `{ transportId, rtpParameters }` | Start screen share |
| C → S | `screen:share-stop` | `{ producerId }` | Stop screen share |

The `media:new-producer` event is emitted to the room with `appData: { type: 'screen' }`, allowing clients to render it in the correct UI slot.

---

## Database Schema

```
users
  id (UUID PK) · email (UNIQUE) · password_hash · display_name · avatar_url · timestamps

meetings
  id (UUID PK) · code (UNIQUE) · title · host_id (FK→users) · status · scheduled_at
  started_at · ended_at · max_participants · settings (JSONB) · timestamps

participants
  id (UUID PK) · meeting_id (FK→meetings, CASCADE) · user_id (FK→users)
  role · joined_at · left_at
  UNIQUE (meeting_id, user_id)

chat_messages
  id (UUID PK) · meeting_id (FK→meetings, CASCADE) · sender_id (FK→users)
  content · created_at

refresh_tokens
  id (UUID PK) · user_id (FK→users, CASCADE) · token_hash · expires_at · created_at
```

---

## Security

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt with 12 salt rounds |
| Access tokens | JWT, RS256-equivalent via HS256 with 32+ char secrets, 15m TTL |
| Refresh tokens | SHA-256 hashed before storage, rotated on every use, Redis-blacklisted on logout |
| Transport security | HTTPS/WSS in production via Render's TLS termination |
| Rate limiting | Redis-backed sliding window (10/min auth, 100/min general) |
| HTTP headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Origin whitelist (`CLIENT_URL`) |
| Input validation | Zod schemas on every endpoint — body, query, and path params |
| SQL injection | Impossible via Drizzle ORM parameterized queries |
| Secrets management | Zod-validated at startup — server refuses to start if any secret is missing or too short |

---

## Deployment

### Render (Recommended)

1. Fork this repository
2. Connect to [Render](https://render.com) → **New → Blueprint** → select this repo
3. Set the following environment variables in your Render service:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis connection string |
| `CLIENT_URL` | Your frontend URL |
| `MEDIASOUP_ANNOUNCED_IP` | Your Render service's public IP |

4. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are auto-generated by Render via `render.yaml`

5. Run migrations after first deploy:
```bash
# From local machine with DATABASE_URL set
npm run db:migrate
```

> **Note:** mediasoup on Render Starter (512 MB) Works for demos with up to ~5 concurrent participants. Upgrade to Standard ($25/mo) for heavier load.

### Docker (Self-hosted)

```bash
# Build
docker build -t letsmeet-api .

# Run
docker run -p 3000:3000 \
  --env-file .env \
  letsmeet-api
```

### CI/CD Pipeline

| Trigger | Workflow | Steps |
|---------|----------|-------|
| Push / PR to `main` | `ci.yml` | Type check → Unit tests |
| Push to `main` | `cd.yml` | Trigger Render deploy hook |

**GitHub Secrets required for CD:**

| Secret | Value |
|--------|-------|
| `RENDER_DEPLOY_HOOK_URL` | Render service → Settings → Deploy Hook URL |

---

## Testing

```bash
npm test                # Run all unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
```

**Current coverage:**

| Test File | Tests | Covers |
|-----------|-------|--------|
| `meeting-code.test.ts` | 4 | Code format, uniqueness, no ambiguous chars |
| `hash.test.ts` | 4 | Hash, verify, reject wrong, unique salts |
| `jwt.test.ts` | 5 | Sign/verify, tampered, expired, cross-secret |
| `app-error.test.ts` | 9 | All error subclasses, RFC 7807 serialization |
| `auth.schema.test.ts` | 8 | Email, password strength, display name rules |
| `meetings.schema.test.ts` | 9 | Optional fields, bounds, date, coercion |
| **Total** | **39** | |

---

## Roadmap

- [ ] Frontend client (React + mediasoup-client)
- [ ] Waiting room / host approval flow
- [ ] Recording via mediasoup `PlainTransport` → FFmpeg
- [ ] Breakout rooms (sub-routers per group)
- [ ] Email notifications for scheduled meetings
- [ ] OpenTelemetry tracing + Prometheus metrics
- [ ] Redis pub/sub adapter for horizontal Socket.IO scaling

---

## License

ISC © [Mudit Garg](https://github.com/MuditGarg007)
