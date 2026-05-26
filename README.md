# TalentFlow

A lightweight applicant tracking system built on Django, Supabase, and React. Teams can post jobs, manage candidates through a visual pipeline, and get AI-powered fit scores from Gemini - all from a single dark-themed interface.

## Stack

- **Backend** - Django 5.1 + Django REST Framework, Supabase Auth (JWT), PostgreSQL via Supabase
- **Frontend** - React 19 + TypeScript, Vite, TanStack Query, @dnd-kit, Tailwind CSS
- **AI** - Google Gemini 2.0 Flash Lite
- **Database** - Supabase (Postgres + Auth)

---

## Running with Docker (quickest path)

Requires Docker Desktop. Everything builds and starts in one command.

```bash
# 1. Copy the env template and fill in your values
cp .env.example .env
#    Follow ENV_SETUP.md for where to find each value.

# 2. Build images and start the stack
docker-compose up --build
```

The app is available at **http://localhost**.

| | URL |
|---|---|
| App | http://localhost |
| Swagger UI | http://localhost/api/schema/swagger-ui/ |
| ReDoc | http://localhost/api/schema/redoc/ |
| Raw OpenAPI JSON | http://localhost/api/schema/ |

To stop: `docker-compose down`

---

## Running Tests

### Backend (pytest)

```bash
cd backend

# First time only - create the virtualenv and install deps
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt

pytest tests/
```

The suite runs fully offline using an in-memory SQLite database - no Supabase or Gemini
credentials required. Two tests (marked `online_only`) are skipped automatically unless
real credentials are present and the network is available.

Expected output: **91 passed, 2 skipped**.

### Frontend (vitest)

```bash
cd frontend
npm install
npm test
```

Expected output: **55 passed**.

---

## Local Development (without Docker)

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project (free tier is fine)
- A Google AI Studio API key (free tier, https://aistudio.google.com)

---

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd talentflow
```

---

### 2. Supabase setup

In your Supabase dashboard open the **SQL Editor** and run the contents of
`backend/supabase_setup.sql`. This creates the trigger that auto-populates
the `profiles` table on user signup.

---

### 3. Backend setup

```bash
cd backend

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Open .env and fill in your values (see ENV_SETUP.md)
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```

The API and interactive docs are now available:

| | URL |
|---|---|
| API root | http://localhost:8000/api/v1/ |
| Swagger UI | http://localhost:8000/api/schema/swagger-ui/ |
| ReDoc | http://localhost:8000/api/schema/redoc/ |
| Raw OpenAPI JSON | http://localhost:8000/api/schema/ |

On startup it also prints a service health table showing connectivity to Postgres,
Supabase Auth, and Gemini.

#### Create the first admin

Create a user in the Supabase dashboard (**Authentication > Users > Add user**), then
promote them in the SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

---

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

App is at `http://localhost:5173`.

---

### 5. Verify the setup

1. Sign in at `http://localhost:5173`
2. Create a job under Jobs
3. Add a candidate and attach them to the job
4. Open the Kanban board to try drag-and-drop
5. Open the candidate detail page and click **Evaluate** to run AI scoring
6. Browse the self-documenting API at `http://localhost:8000/api/schema/swagger-ui/`

---

## Project Structure

```
.
├── Dockerfile             # Multi-stage: React build + Django + nginx
├── docker-compose.yml     # One command to run the full stack
├── nginx/
│   └── default.conf       # SPA routing + /api proxy to Django
│
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Auth views, profile model, dashboard stats
│   │   ├── jobs/           # Job CRUD
│   │   ├── candidates/     # Candidate CRUD, stage moves, kanban
│   │   └── ai_evaluation/  # Gemini integration, evaluate endpoint
│   ├── config/
│   │   ├── settings/       # base, development, production, test splits
│   │   ├── middleware/     # Supabase JWT middleware
│   │   └── ...
│   ├── tests/              # pytest suite (91 tests)
│   ├── supabase_setup.sql
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/     # UI primitives, layout, shared
    │   ├── hooks/          # TanStack Query hooks
    │   ├── pages/          # Route-level components
    │   ├── lib/            # axios instance, supabase client, utils
    │   ├── types/          # TypeScript interfaces
    │   ├── contexts/       # AuthContext
    │   └── test/           # vitest suite (55 tests)
    └── package.json
```

---

## API Documentation

The API is self-documented using OpenAPI 3.0 (drf-spectacular). Three interfaces are
served without any setup:

| Interface | Local dev | Docker |
|---|---|---|
| Swagger UI | http://localhost:8000/api/schema/swagger-ui/ | http://localhost/api/schema/swagger-ui/ |
| ReDoc | http://localhost:8000/api/schema/redoc/ | http://localhost/api/schema/redoc/ |
| Raw OpenAPI JSON | http://localhost:8000/api/schema/ | http://localhost/api/schema/ |

All endpoints require `Authorization: Bearer <supabase-jwt>` - click **Authorize** in
Swagger UI and paste a token to try requests interactively.

### Endpoint reference

| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/api/v1/auth/me/` | Current user profile |
| GET | `/api/v1/auth/stats/` | Dashboard stats |
| GET/POST | `/api/v1/jobs/` | List and create jobs |
| GET/PATCH/DELETE | `/api/v1/jobs/<id>/` | Job detail |
| GET/POST | `/api/v1/candidates/` | List and create candidates |
| GET/PATCH/DELETE | `/api/v1/candidates/<id>/` | Candidate detail |
| PATCH | `/api/v1/candidates/<id>/stage/` | Move pipeline stage |
| POST | `/api/v1/candidates/<id>/evaluate/` | Run AI evaluation (20/user/day) |
| GET | `/api/v1/candidates/kanban/` | Kanban board grouped by stage |
| GET/POST | `/api/v1/admin/accounts/` | Admin: list and create accounts |
| GET/PATCH/DELETE | `/api/v1/admin/accounts/<id>/` | Admin: manage account |
