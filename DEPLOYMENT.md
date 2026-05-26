# Deployment Guide

This guide walks through deploying TalentFlow to production. The recommended setup uses **Railway** for the Django backend and **Vercel** for the React frontend, with Supabase handling the database and auth.

---

## Prerequisites

- A Supabase project with the trigger SQL already run (see README)
- A Google AI Studio API key
- A Railway account (railway.app)
- A Vercel account (vercel.com)
- Your code pushed to a GitHub repository

---

## Part 1 - Backend on Railway

### 1.1 Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **Deploy from GitHub repo** and select your repository
3. Railway will detect the Procfile or use a default start command - we'll configure it manually

### 1.2 Set the root directory

In your Railway service settings, set the **Root Directory** to `backend`. This tells Railway to treat the `backend/` folder as the project root.

### 1.3 Configure the start command

In **Settings > Deploy > Start Command**, set:

```
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

### 1.4 Set environment variables

In **Variables**, add all of the following:

```
SECRET_KEY=<generate a 50+ character random string>
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production

ALLOWED_HOSTS=<your-railway-domain>.railway.app
CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app

SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>

DB_NAME=postgres
DB_USER=postgres.<your-project-ref>
DB_PASSWORD=<your-database-password>
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543

GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.0-flash-lite

DJANGO_LOG_LEVEL=WARNING
```

> **Finding your Railway domain**: After the first deployment, go to Settings > Networking > Generate Domain. Use that value for `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.

### 1.5 Run migrations

Once the service is deployed, open a Railway shell (the terminal icon in the Railway dashboard) and run:

```bash
python manage.py migrate
python manage.py collectstatic --no-input
```

Or add a release command in Railway by setting **Settings > Deploy > Pre-Deploy Command**:

```
python manage.py migrate && python manage.py collectstatic --no-input
```

### 1.6 Verify the backend

Visit `https://<your-railway-domain>.railway.app/api/v1/health/` - you should get a `{"status": "ok"}` response.

---

## Part 2 - Frontend on Vercel

### 2.1 Import the project

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import your GitHub repository
3. Set the **Root Directory** to `frontend`
4. Vercel will auto-detect it as a Vite project

### 2.2 Set environment variables

In **Settings > Environment Variables**, add:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=https://<your-railway-domain>.railway.app/api/v1
```

> Make sure `VITE_API_URL` points to your Railway backend without a trailing slash.

### 2.3 Deploy

Click **Deploy**. Vercel builds the frontend with `npm run build` and serves the static output.

### 2.4 Update backend CORS

Go back to Railway and update the `CORS_ALLOWED_ORIGINS` variable to include your actual Vercel URL:

```
CORS_ALLOWED_ORIGINS=https://<your-project>.vercel.app
```

Redeploy the Railway service after changing environment variables.

---

## Part 3 - Supabase Auth configuration

### 3.1 Set the site URL

In your Supabase dashboard, go to **Authentication > URL Configuration** and set:

- **Site URL**: `https://<your-project>.vercel.app`
- **Redirect URLs**: `https://<your-project>.vercel.app/**`

This ensures Supabase redirects authentication flows back to your production frontend.

### 3.2 Create the first admin user

In Supabase, go to **Authentication > Users** and invite your admin email address. After they confirm, run the following in the SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## Part 4 - Post-deployment checklist

- [ ] Backend health check returns `{"status": "ok"}`
- [ ] Can log in through the frontend
- [ ] Dashboard stats load without errors
- [ ] Can create a job and a candidate
- [ ] Kanban board loads and drag-and-drop works
- [ ] AI evaluation runs and returns a score
- [ ] Admin can access the Accounts page
- [ ] HTTPS is enforced on both domains (no mixed content warnings)

---

## Custom domain (optional)

Both Railway and Vercel support custom domains with automatic TLS certificates.

**Vercel**: Settings > Domains > Add Domain, then follow the DNS instructions.

**Railway**: Settings > Networking > Custom Domain, then add the CNAME record your DNS provider.

After adding a custom domain, update:
- `ALLOWED_HOSTS` in Railway (add the custom domain)
- `CORS_ALLOWED_ORIGINS` in Railway (update to the custom domain)
- `VITE_API_URL` in Vercel if the backend also has a custom domain
- Site URL and Redirect URLs in Supabase Auth settings

---

## Updating the deployment

**Backend**: Push to main. Railway auto-deploys on every push. Migrations run via the pre-deploy command.

**Frontend**: Push to main. Vercel auto-deploys on every push. No additional steps needed.

---

## Environment variable reference

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Django secret key, min 50 chars |
| `DEBUG` | Yes | Set to `False` in production |
| `DJANGO_SETTINGS_MODULE` | Yes | `config.settings.production` |
| `ALLOWED_HOSTS` | Yes | Comma-separated list of allowed domains |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated list of frontend origins |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (admin operations) |
| `SUPABASE_JWT_SECRET` | Yes | Used to verify JWT tokens |
| `DB_NAME` | Yes | `postgres` |
| `DB_USER` | Yes | `postgres.<project-ref>` |
| `DB_PASSWORD` | Yes | Your Supabase database password |
| `DB_HOST` | Yes | Supabase pooler host |
| `DB_PORT` | Yes | `6543` |
| `GEMINI_API_KEY` | Yes | Google AI Studio key |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.0-flash-lite` |
| `DJANGO_LOG_LEVEL` | No | Defaults to `WARNING` |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_API_URL` | Yes | Full URL to Django backend API |
