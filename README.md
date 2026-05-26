# TalentFlow

A lightweight applicant tracking system built on Django, Supabase, and React. Teams can post jobs, manage candidates through a visual pipeline, and get AI-powered fit scores from Gemini - all from a single dark-themed interface.

## Stack

- **Backend** - Django 5.1 + Django REST Framework, Supabase Auth (JWT), PostgreSQL via Supabase
- **Frontend** - React 18 + TypeScript, Vite, TanStack Query, @dnd-kit, Tailwind CSS
- **AI** - Google Gemini 2.0 Flash Lite
- **Database** - Supabase (Postgres + Auth + Storage)

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project (free tier is fine)
- A Google AI Studio API key (free tier, [aistudio.google.com](https://aistudio.google.com))

---

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd talentflow
```

---

### 2. Supabase setup

#### Run the trigger SQL

In your Supabase dashboard, open the **SQL Editor** and paste the contents of `backend/supabase_setup.sql`. Run it. This creates a trigger that automatically inserts a row into the `profiles` table whenever a new user registers through Supabase Auth.

#### Create the database tables

The Django migrations create all the tables. Run them in step 5 below. Supabase exposes a standard PostgreSQL connection - Django connects to it directly.

---

### 3. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Mac / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy the example env file and fill in your values
cp .env.example .env
```

Open `backend/.env` and fill in:

| Variable | Where to find it |
|---|---|
| `SECRET_KEY` | Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API > service_role |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard > Settings > API > JWT Secret |
| `DB_USER` | `postgres.<your-project-ref>` |
| `DB_PASSWORD` | The password you set when creating the project |
| `DB_HOST` | Supabase Dashboard > Settings > Database > Connection pooling host |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) > Get API Key |

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```

The API is now running at `http://localhost:8000`.

#### Create the first admin account

The first admin user needs to be created through the Supabase Auth dashboard or via the API. Once created, they can use the Accounts page in the app to create additional users.

Alternatively, create a user in the Supabase dashboard (Authentication > Users > Invite user), then run the following SQL in the Supabase SQL editor to set their role to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

---

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env
```

Open `frontend/.env` and fill in:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` above |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` above |
| `VITE_API_URL` | `http://localhost:8000/api/v1` |

Start the dev server:

```bash
npm run dev
```

The app is now running at `http://localhost:5173`.

---

### 5. Verify the setup

1. Navigate to `http://localhost:5173`
2. Sign in with your admin credentials
3. Create a job under Jobs
4. Add a candidate and attach them to the job
5. Go to Kanban to see the drag-and-drop board
6. Open the candidate detail page and click "Evaluate" to run the AI evaluation

---

## Project Structure

```
.
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Auth views, profile model, dashboard stats
│   │   ├── jobs/           # Job CRUD
│   │   ├── candidates/     # Candidate CRUD, stage moves, kanban view
│   │   └── ai_evaluation/  # Gemini integration, evaluate endpoint
│   ├── config/
│   │   ├── settings/       # base, development, production split
│   │   ├── middleware/     # Supabase JWT middleware
│   │   └── ...
│   ├── supabase_setup.sql  # Run this in Supabase SQL editor once
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/     # UI primitives, layout, shared components
│   │   ├── hooks/          # TanStack Query hooks for each resource
│   │   ├── pages/          # Route-level components
│   │   ├── lib/            # axios instance, supabase client, utils
│   │   ├── types/          # TypeScript interfaces
│   │   └── contexts/       # AuthContext
│   ├── .env.example
│   └── package.json
```

---

## API Overview

All endpoints require a `Authorization: Bearer <supabase-jwt>` header except public routes.

| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/api/v1/auth/me/` | Current user profile |
| GET | `/api/v1/auth/stats/` | Dashboard stats |
| GET/POST | `/api/v1/jobs/` | List and create jobs |
| GET/PATCH/DELETE | `/api/v1/jobs/<id>/` | Job detail |
| GET/POST | `/api/v1/candidates/` | List and create candidates |
| GET/PATCH/DELETE | `/api/v1/candidates/<id>/` | Candidate detail |
| PATCH | `/api/v1/candidates/<id>/stage/` | Move candidate stage |
| POST | `/api/v1/candidates/<id>/evaluate/` | Run AI evaluation (20/day) |
| GET | `/api/v1/candidates/kanban/` | Kanban board data |
| GET/POST | `/api/v1/admin/accounts/` | Admin: list and create accounts |
| GET/PATCH/DELETE | `/api/v1/admin/accounts/<id>/` | Admin: manage account |
