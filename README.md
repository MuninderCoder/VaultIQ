# VaultIQ

> **Intelligent Enterprise Knowledge Platform**

VaultIQ is a secure, production-oriented enterprise knowledge and document intelligence platform. It provides organizations with a centralized repository for documents, semantic search, and AI-driven retrieval with grounded source citations.

Official Repository: [https://github.com/MuninderCoder/VaultIQ.git](https://github.com/MuninderCoder/VaultIQ.git)

---

## Phase Status

- **Phase 1 — Platform Foundation**: Complete (Auth, JWT, Mongoose User, Express architecture, React 18 UI design system, Docker)
- **Phase 2 — Document Management & Secure Storage**: Complete (Storage abstraction, local filesystem storage, Document model, upload validation, magic-byte checks, document CRUD, download, search/filter/pagination, dashboard statistics)
- **Phase 3 — Document Processing & Text Extraction**: Complete (Multi-format text extraction pipeline [PDF, DOCX, TXT, MD], text normalizer, character/word/page metrics, lifecycle management, async processing trigger, processing status query, extracted content retrieval & viewer modal)
- **Phase 4 — Document Indexing & Chunking**: Next Phase (Chunking strategies, token estimation)

> **Strict Boundary Notice**: Phases 1, 2, and 3 establish enterprise storage, document management, and normalized text extraction. No AI, LLMs, embeddings, or vector databases are introduced in this phase.

---

## Supported Document Formats & Limits

- **Formats**: PDF (`.pdf`), Microsoft Word (`.docx`), Plain Text (`.txt`), Markdown (`.md`)
- **Maximum File Size**: 25 MB per document (configured via `MAX_FILE_SIZE_MB`)
- **Storage Security**:
  - Files stored under safe UUID-based filenames (e.g. `c73e...pdf`)
  - Original filenames preserved exclusively in metadata
  - Strict path traversal prevention (`resolvePath` verification)
  - File magic-byte / signature validation preventing MIME spoofing
  - Complete user ownership isolation across all operations

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18 (`18.3.1`), TypeScript, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose, Multer, Zod, JWT (`jsonwebtoken`), `bcryptjs`, Winston, Morgan |
| **Storage** | Pluggable `IStorageService` abstraction with `LocalStorageService` (Docker volume persisted) |
| **Security** | Helmet, CORS, Express Rate Limit, Parameter Sanitization, Path Traversal Defense |
| **Database** | MongoDB (Mongoose ORM) |
| **DevOps** | Docker, Docker Compose, Multi-stage Dockerfiles, Nginx |

---

## Repository Structure

```
VaultIQ/
├── client/                     # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI component library (Button, Input, Modal, Table, etc.)
│   │   ├── context/            # AuthContext & state providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # AppLayout and AuthLayout
│   │   ├── pages/              # Dashboard, Documents, Search, Chat, Settings, Login, Register
│   │   ├── services/           # Axios API client (api, authService, documentService, healthService)
│   │   ├── types/              # TypeScript interface definitions (User, Document, Stats)
│   │   └── utils/              # Utility helpers
├── server/                     # Express + TypeScript backend
│   ├── src/
│   │   ├── config/             # Environment (env.ts) & Database (database.ts)
│   │   ├── controllers/        # REST controllers (auth, document, health)
│   │   ├── middleware/         # Auth, upload (Multer + magic bytes), validation, error middlewares
│   │   ├── models/             # Mongoose schemas (User, Document)
│   │   ├── routes/             # Versioned API routes (/api/v1/...)
│   │   ├── services/           # Business logic (auth.service, document.service)
│   │   ├── storage/            # Storage abstraction (storage.interface, local.storage)
│   │   ├── types/              # Express augmentations & DTOs
│   │   ├── utils/              # Structured logger & ApiResponse helpers
│   │   ├── validators/         # Zod schemas (auth.validator, document.validator)
│   │   └── __tests__/          # Integration test suites (auth, document, health)
├── docker/                     # Dockerfiles & Nginx configs
├── docs/                       # Architecture and Roadmap documentation
├── docker-compose.yml          # Container orchestration with persistent uploads volume
├── .env.example                # Environment variables template
└── README.md
```

---

## Quickstart & Local Development

### Prerequisites
- **Node.js**: v18.0+ (Tested on v20 and v24)
- **npm**: v9.0+
- **MongoDB**: A running instance (local MongoDB, Docker, or MongoDB Atlas connection string)

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/MuninderCoder/VaultIQ.git
cd VaultIQ

# Install dependencies across all workspaces
npm install
```

### 2. Environment Setup
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Ensure your `MONGODB_URI` points to your MongoDB instance, and configure `UPLOAD_DIR=./uploads` and `MAX_FILE_SIZE_MB=25`.

### 3. Run Development Servers
Start both backend (port 5000) and frontend (port 3000) concurrently:
```bash
npm run dev
```

Alternatively, run them separately:
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

Visit the application at: `http://localhost:3000`

---

## Docker Development & Deployment

To build and run all services (MongoDB, Server, Client) with persistent storage:
```bash
docker compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **MongoDB**: `localhost:27017`
- **Uploads Volume**: `vaultiq_uploads` mounted at `/app/uploads` (persists file storage across container restarts)

---

## API Specifications

All endpoints are versioned under `/api/v1/`.

### System Health
- **`GET /api/v1/health`**: Operational status, uptime, and database connection state.

### Authentication
- **`POST /api/v1/auth/register`**: Register user, validate input, hash password, return JWT.
- **`POST /api/v1/auth/login`**: Verify credentials, return JWT & sanitized user profile.
- **`GET /api/v1/auth/me`**: Return currently logged-in user profile (Bearer token required).
- **`POST /api/v1/auth/logout`**: Terminate session.

### Document Management (Phase 2)
- **`POST /api/v1/documents`**: Multipart upload (`file`, optional `title`, `description`, `tags`). Validates file signature and size.
- **`GET /api/v1/documents/stats`**: Retrieve user document count, total storage used, breakdown by extension, and recent documents.
- **`GET /api/v1/documents`**: List documents with pagination (`page`, `limit`), search (`search` matches originalName, title, description, tags), status filter (`status`), and sorting (`sort`).
- **`GET /api/v1/documents/:id`**: Get document metadata (ownership verified).
- **`GET /api/v1/documents/:id/download`**: Download physical document binary stream (RFC 5987 Content-Disposition).
### Document Processing & Text Extraction (Phase 3)
- **`POST /api/v1/documents/:id/process`**: Trigger text extraction pipeline (PDF, DOCX, TXT, MD) with atomic state transition to `PROCESSING`.
- **`GET /api/v1/documents/:id/processing`**: Query processing status, character count, word count, page count, and safe error details.
- **`GET /api/v1/documents/:id/content`**: Retrieve normalized extracted text and processing metadata for a processed document.

---

## Verification & Testing

Run all automated tests across workspaces:
```bash
# Backend unit & integration tests (30/30 passing)
npm run test --workspace=server

# TypeScript strict checks across monorepo (0 errors)
npm run lint

# Production build
npm run build
```

---

## Architecture & Roadmap

For in-depth architectural details and multi-phase specifications:
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Project Roadmap (Phases 1-7)](docs/ROADMAP.md)

---

## License
Proprietary — VaultIQ Inc.
