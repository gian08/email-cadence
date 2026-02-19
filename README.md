# Email Cadence – Monorepo

A TypeScript monorepo that creates and executes email cadences using **Next.js**, **NestJS**, and **Temporal.io**.

Note:
Mock sending email is display on the terminal where the apps is running it will create a logs there.

## Apps

| App           | Framework          | Default port |
| ------------- | ------------------ | ------------ |
| `apps/web`    | Next.js            | 3000         |
| `apps/api`    | NestJS             | 3001         |
| `apps/worker` | Temporal.io Worker | —            |

---

## Prerequisites

- Node.js 18+
- npm 9+
- A running **Temporal.io** server
  - Default address: `localhost:7233`
  - Quick start: https://docs.temporal.io/self-hosted-guide

---

## Install

From the repo root, install all workspaces at once:

```bash
npm install
```

---

## Environment Variables

### `apps/api` — create `apps/api/.env`

```env
# Temporal server address (placeholder — replace with your server)
TEMPORAL_ADDRESS=localhost:7233

# Temporal namespace (placeholder — replace if not using default)
TEMPORAL_NAMESPACE=default

# Port the NestJS API listens on
PORT=3001
```

### `apps/worker` — export in shell or create `apps/worker/.env`

```env
# Temporal server address (placeholder — replace with your server)
TEMPORAL_ADDRESS=localhost:7233

# Temporal namespace (placeholder — replace if not using default)
TEMPORAL_NAMESPACE=default
```

### `apps/web` — create `apps/web/.env.local`

```env
# Base URL of the NestJS API
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Task Queue

Both the API and worker use the task queue **`cadence-queue`**.
If you change it, update both:

- `apps/api/src/enrollments.controller.ts` → `taskQueue`
- `apps/worker/src/index.ts` → `taskQueue`

---

## Running the Apps

### All at once (recommended)

```bash
npm run dev
```

This concurrently starts `web`, `api`, and `worker`.

### Individually

```bash
npm run dev:api      # NestJS API on port 3001
npm run dev:worker   # Temporal worker
npm run dev:web      # Next.js UI on port 3000
```

---

## API Examples

### Cadences

**Create a cadence**

```bash
curl -X POST http://localhost:3001/cadences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow",
    "steps": [
      { "id": "1", "type": "SEND_EMAIL", "subject": "Welcome", "body": "Hello there" },
      { "id": "2", "type": "WAIT", "seconds": 10 },
      { "id": "3", "type": "SEND_EMAIL", "subject": "Follow up", "body": "Checking in" }
    ]
  }'
```

Response:

```json
{
  "id": "<cadenceId>",
  "name": "Welcome Flow",
  "steps": [...],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

**Get a cadence**

```bash
curl http://localhost:3001/cadences/<cadenceId>
```

**Update a cadence definition**

```bash
curl -X PUT http://localhost:3001/cadences/<cadenceId> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow v2",
    "steps": [
      { "id": "1", "type": "SEND_EMAIL", "subject": "Hi again", "body": "Updated body" }
    ]
  }'
```

---

### Enrollments

**Enroll a contact** — starts the Temporal workflow

```bash
curl -X POST http://localhost:3001/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "cadenceId": "<cadenceId>",
    "contactEmail": "user@example.com"
  }'
```

Response:

```json
{ "enrollmentId": "<uuid>", "cadenceId": "<cadenceId>" }
```

**Get enrollment state**

```bash
curl http://localhost:3001/enrollments/<enrollmentId>
```

Response:

```json
{
  "currentStepIndex": 1,
  "stepsVersion": 1,
  "status": "RUNNING",
  "steps": [...]
}
```

**Update a running workflow's steps mid-flight**

```bash
curl -X POST http://localhost:3001/enrollments/<enrollmentId>/update-cadence \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      { "id": "1", "type": "SEND_EMAIL", "subject": "New subject", "body": "New body" }
    ]
  }'
```

Response:

```json
{ "updated": true }
```

## Step types

| Type         | Required fields         | Description                                |
| ------------ | ----------------------- | ------------------------------------------ |
| `SEND_EMAIL` | `id`, `subject`, `body` | Sends an email to the enrolled contact     |
| `WAIT`       | `id`, `seconds`         | Pauses the workflow for the given duration |

---

## Project structure

```
apps/
├── api/       # NestJS — workflow triggers & queries via REST
├── worker/    # Temporal worker — runs cadenceWorkflow and sendEmail activity
└── web/       # Next.js — browser UI to submit workflow JSON
```




