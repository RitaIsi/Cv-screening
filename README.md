# HireMatch | AI-Based CV Screening & Job Recommendation System

HireMatch is a web application built for a university thesis project. It demonstrates an end-to-end talent acquisition and recommendation workflow powered by intelligent competency evaluation.

> **Note on AI Implementation:**
> The full machine learning / NLP engine (PDF resume parsing, transformer embeddings, and semantic vector similarity) is isolated inside a single file: `src/services/aiService.js`. The current version implements a thesis baseline scoring model (70% skill overlap + 30% experience fulfillment) so the entire platform is fully functional today and ready for the ML model to be dropped in seamlessly.

---

## Architecture & Technology Stack

- **Frontend:** React 18 + Vite (SPA)
- **Routing:** React Router v6 with strict role-based route guards
- **Styling:** Vanilla CSS design system built from `DESIGN.md` tokens (Google Fonts *Playfair Display* for display headlines, *DM Sans* for body/UI, `#FE3C01` accent, zero heavy shadows, no gradients)
- **Backend & Database:** Supabase (PostgreSQL with Row Level Security, Supabase Auth, and private S3-compatible Storage)
- **Icons:** Lucide React

---

## Folder Structure

```
AI-CV-screener-rita/
├── .env.example             # Template for Supabase credentials
├── .env                     # Local environment configuration
├── DESIGN.md                # Design system specification
├── index.html               # Entry HTML with typography pre-connects
├── package.json             # Project dependencies and npm scripts
├── vite.config.js           # Vite server configuration
├── supabase/
│   ├── schema.sql           # Database tables, triggers, and Row Level Security (RLS)
│   └── seed.sql             # 8 realistic job seed postings
└── src/
    ├── main.jsx             # React entry point with providers
    ├── App.jsx              # Routing structure and role protection
    ├── index.css            # Complete design tokens, components & utilities
    ├── lib/
    │   └── supabase.js      # Supabase client initialization & config guard
    ├── context/
    │   └── AuthContext.jsx  # Authentication state, session handling, profile syncing
    ├── services/
    │   ├── aiService.js     # *** ISOLATED AI SCORING & RANKING PLACEHOLDER ***
    │   ├── jobService.js    # Job postings CRUD operations
    │   ├── applicationService.js # Application submission & applicant management
    │   └── storageService.js     # CV validation, upload & download handlers
    ├── components/
    │   ├── Navbar.jsx       # Responsive header with role-aware navigation
    │   ├── Footer.jsx       # System footer
    │   ├── ProtectedRoute.jsx # Seeker & Recruiter route guards
    │   ├── SkillChipInput.jsx # Dynamic skills tag input with deletion
    │   ├── MatchBadge.jsx   # Editorial match score pill / card
    │   ├── StatusBadge.jsx  # Application state indicator (Pending, Shortlisted, Rejected)
    │   └── ConfigNoticeBanner.jsx # Top banner shown if .env is missing keys
    └── pages/
        ├── LandingPage.jsx  # Hero, 3-step workflow explanation, featured jobs
        ├── LoginPage.jsx    # Email & password login
        ├── SignUpPage.jsx   # Registration with Job Seeker / Recruiter role selection
        ├── seeker/
        │   ├── SeekerProfilePage.jsx     # Profile data, skills chips, CV file upload
        │   ├── RecommendedJobsPage.jsx   # Jobs ranked by match score with filters
        │   ├── JobDetailsPage.jsx        # Detailed specifications, match breakdown, Apply
        │   └── SeekerApplicationsPage.jsx# History of applications with real-time status
        └── recruiter/
            ├── RecruiterDashboardPage.jsx# Metrics (Jobs, Applicants, Shortlisted) & listings
            ├── JobFormPage.jsx           # Post new job & edit existing job
            └── JobApplicantsPage.jsx     # Applicant leaderboard ranked by AI, CV download, Shortlist/Reject
```

---

## Step-by-Step Manual Setup

### 1. Create a Supabase Project
1. Navigate to [https://supabase.com](https://supabase.com) and sign in or sign up.
2. Click **New Project**.
3. Choose an organization, provide a project name (e.g. `hirematch-thesis`), and select a database password and region.
4. Wait 1–2 minutes for the database to provision.

### 2. Configure Database Tables and Security Policies
1. In the Supabase Dashboard left sidebar, click **SQL Editor**.
2. Click **New Query**.
3. Copy the entire content of [`/supabase/schema.sql`](./supabase/schema.sql) and paste it into the editor.
4. Click **Run** (or press Ctrl+Enter).
   - This creates `profiles`, `jobs`, and `applications` tables.
   - It sets up the automatic trigger `on_auth_user_created` to sync user profiles.
   - It enables Row Level Security (RLS) policies for Seekers and Recruiters.
   - It creates the private storage bucket `cvs` with strict permissions.

### 3. Copy API Credentials to `.env`
1. In your Supabase Dashboard left sidebar, navigate to **Project Settings** (gear icon) -> **API**.
2. Under **Project URL**, copy the `URL`.
3. Under **Project API Keys**, copy the `anon` / `public` key.
4. Open your local `.env` file in the project root and paste the values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

### 4. Run the Development Server
Install dependencies and launch the local server:
```bash
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Sign Up as a Recruiter and Seed Sample Jobs
1. Go to `http://localhost:5173/signup`.
2. Choose **Recruiter**, enter your name, company name (e.g. `Acme Corp`), email, and password.
3. Once registered, go back to your **Supabase Dashboard -> SQL Editor**.
4. Paste the content of [`/supabase/seed.sql`](./supabase/seed.sql) and click **Run**.
   - The script will automatically link the 8 seed job postings to your newly created Recruiter account.
5. In the app, click **Dashboard** to see the 8 active job postings!

### 6. Test the Job Seeker Experience
1. Open an Incognito window (or sign out).
2. Go to `http://localhost:5173/signup` and register as a **Job Seeker**.
3. In **Profile**, add your educational background, years of experience, and skills (e.g., `React`, `TypeScript`, `Node.js`), and upload a sample resume PDF.
4. Click **Recommended Jobs** to see the jobs dynamically ranked by your match score!
5. Open a job and click **Submit Application**.
6. Switch back to your Recruiter window to view the candidate ranked on the job's applicants leaderboard, download their CV, and click **Shortlist** or **Reject**!

---

## AI Setup & Gemini Integration

HireMatch uses the Google Gemini API through a single secure Supabase Edge Function (`ai-screen`) to extract qualifications, generate 2–3 sentence scan-friendly summaries, and generate 768-dimensional semantic embeddings for CVs and job postings.

### 1. Run the Database Migration (`/supabase/ai_stage.sql`)
1. In the Supabase Dashboard left sidebar, click **SQL Editor**.
2. Click **New Query**.
3. Copy the contents of [`/supabase/ai_stage.sql`](./supabase/ai_stage.sql) and paste it into the editor.
4. Click **Run** (or press Ctrl+Enter).
   - Adds `cv_text` (text), `cv_summary` (text), `cv_embedding` (float8[]), and `cv_analyzed_at` (timestamptz) to `public.profiles`.
   - Adds `embedding` (float8[]) to `public.jobs`.
   - Preserves all Row Level Security (RLS) policies.

### 2. Set the `GEMINI_API_KEY` Edge Function Secret
> **Security Note:** The Gemini API key never appears in the React frontend, any repository file, or `.env`. It is stored exclusively as a Supabase Edge Function secret.

Choose either the Dashboard or CLI option:

#### Option A: Supabase Dashboard
1. Go to your Supabase Project Dashboard.
2. In the left sidebar, click **Edge Functions** (or **Project Settings** > **Edge Functions**).
3. Select **Secrets** (or **Manage Secrets**).
4. Click **Add new secret**:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `<your-google-gemini-api-key>`
5. *(Optional)* You can also configure model overrides:
   - `GEMINI_TEXT_MODEL` (default: `gemini-3.1-flash-lite`)
   - `GEMINI_EMBED_MODEL` (default: `gemini-embedding-001`)

#### Option B: Supabase CLI
```bash
npx supabase secrets set GEMINI_API_KEY="your-google-gemini-api-key"
```

### 3. Deploy the Edge Function via Supabase CLI
Run these exact commands in your terminal from the project root:

```bash
# 1. Log in to your Supabase account
npx supabase login

# 2. Link your local project directory to your remote Supabase project
# (Find your Project Reference ID in Project Settings > General)
npx supabase link --project-ref <your-project-ref>

# 3. Deploy the ai-screen edge function
npx supabase functions deploy ai-screen
```

### 4. Prepare AI Matching for Seed Jobs (Backfill Button)
1. Sign in to HireMatch with a **Recruiter** account.
2. Navigate to the **Recruiter Dashboard** (`/recruiter/dashboard`).
3. Click the **"Prepare AI matching for existing jobs"** button in the header.
4. The Edge Function runs with the backend service role to generate and store 768-dimensional embeddings for all 8 seed jobs (and any jobs missing embeddings). A notification will confirm how many jobs were updated.

---

## AI Service Architecture (`src/services/aiService.js`)

All scoring and ranking logic is strictly encapsulated in `src/services/aiService.js`.

- **Client-Side Scoring (Zero API Calls During Browsing):**
  - Match calculation runs synchronously in the browser using pre-computed vector embeddings and attributes already stored in PostgreSQL.
  - No Gemini tokens, quota, or rate limits are consumed when seekers browse jobs or recruiters review applicants.

- **Scoring Formula (0 - 100):**
  - **50% Semantic Similarity:** Cosine similarity between the candidate's `cv_embedding` and the job's `embedding` (rescaled to 0–100).
  - **35% Skill Overlap:** Proportion of job's `required_skills` matched by the candidate's skills (case-insensitive).
  - **15% Experience Met:** Ratio of candidate's `experience_years` against `min_experience`.
  - **Fallback Formula:** If either vector embedding is missing, the engine automatically falls back to 70% skills + 30% experience so nothing breaks.

- **Available Helpers:**
  - `calculateMatchScore(seekerProfile, job)`: Returns integer 0–100.
  - `rankJobsForSeeker(seekerProfile, jobs)`: Returns jobs sorted by descending score with matched skills attached.
  - `rankApplicants(applicants, job)`: Returns applicants sorted by descending score with matched and missing skills attached.
  - `getMatchedSkills(profile, job)`: Returns candidate skills that match role requirements.
  - `getMissingSkills(profile, job)`: Returns required skills that the candidate lacks.
  - `analyzeCv(text)`: Calls Edge Function to extract structured fields and 768-dim embedding.
  - `embedJob(job)`: Calls Edge Function to generate 768-dim embedding for a job.
  - `backfillJobs()`: Calls Edge Function to embed all un-embedded jobs.
