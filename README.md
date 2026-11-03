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

## AI Service Architecture (`src/services/aiService.js`)

All scoring and ranking logic is strictly encapsulated in `src/services/aiService.js`. No other file contains matching formulas.

- **`calculateMatchScore(seekerProfile, job)`**: Computes an integer score from 0 to 100 based on:
  - **70% Skills Overlap:** Proportion of job's required skills present in candidate's competencies.
  - **30% Experience Met:** Ratio of candidate's experience against the minimum required years.
- **`rankJobsForSeeker(seekerProfile, jobs)`**: Takes a candidate profile and a list of jobs, computes each match score, and returns the jobs sorted descending.
- **`rankApplicants(applicants, job)`**: Takes a job and its applicants, calculates each candidate's score, and returns an ordered leaderboard.

When the thesis reaches the ML stage, replace the internal logic in `src/services/aiService.js` with your NLP / vector embeddings API call without touching any UI or database code.
