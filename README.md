# 💊 Pharma CRM — Medical Representative DCR System

> A complete CRM system for Medical Representatives (MRs) to manage doctor visits, daily call reports (DCR), tour planning, and coverage analytics.  
> Built with **Netlify Serverless Functions** + **Vanilla HTML/JS** frontend.

---

## 🚀 Quick Start — Deploy to Netlify

### Option 1: One-Click GitHub → Netlify Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Pharma CRM"
   git remote add origin https://github.com/YOUR_USERNAME/pharma-crm.git
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
   - Select your GitHub repository
   - Build settings are auto-detected from `netlify.toml`:
     - **Build command:** `npm run build`
     - **Publish directory:** `frontend`
     - **Functions directory:** `netlify/functions`
   - Click **Deploy site**

3. **Done!** Your site is live. 🎉

---

### Option 2: Netlify CLI Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Install project dependencies
npm install

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod
```

---

## 📁 Project Structure

```
pharma-crm/
│
├── frontend/                    # Static HTML/JS/CSS frontend
│   ├── index.html               # Entry point (redirect)
│   ├── login.html               # Login page
│   ├── dashboard.html           # Dashboard with analytics
│   ├── doctors.html             # Doctor master management
│   ├── products.html            # Product master
│   ├── visits.html              # DCR entry + visit history
│   ├── planner.html             # Monthly tour planner
│   ├── reports.html             # Coverage + missed call reports
│   ├── app.js                   # Shared JS utilities (Auth, API, Toast)
│   └── style.css                # Full design system CSS
│
├── netlify/
│   └── functions/               # Serverless API functions (.mts)
│       ├── login.mts            # POST /api/login
│       ├── doctors.mts          # GET/POST/PUT/DELETE /api/doctors
│       ├── products.mts         # GET/POST/PUT /api/products
│       ├── dcr-create.mts       # POST /api/dcr
│       ├── visits.mts           # GET /api/visits
│       ├── planner.mts          # GET/POST/PUT /api/planner
│       ├── coverage-report.mts  # GET /api/coverage
│       ├── missed-calls.mts     # GET /api/missed
│       └── dashboard.mts        # GET /api/dashboard
│
├── database/                    # JSON file storage
│   ├── users.json               # MR user accounts
│   ├── doctors.json             # Doctor master data
│   ├── products.json            # Product portfolio
│   ├── visits.json              # Visit / DCR records
│   └── planner.json             # Monthly tour plans
│
├── netlify.toml                 # Netlify build & functions config
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

---

## 🔑 API Endpoints

| Method | Endpoint         | Description                      |
|--------|-----------------|----------------------------------|
| POST   | `/api/login`     | User authentication              |
| GET    | `/api/doctors`   | List doctors (filter by mrId)    |
| POST   | `/api/doctors`   | Add new doctor                   |
| PUT    | `/api/doctors`   | Update doctor                    |
| GET    | `/api/products`  | List products                    |
| POST   | `/api/products`  | Add new product                  |
| POST   | `/api/dcr`       | Submit daily call report         |
| GET    | `/api/visits`    | Visit history (filter by month)  |
| GET    | `/api/planner`   | Monthly tour plans               |
| POST   | `/api/planner`   | Create new plan                  |
| PUT    | `/api/planner`   | Update / submit / approve plan   |
| GET    | `/api/coverage`  | Coverage report                  |
| GET    | `/api/missed`    | Missed calls report              |
| GET    | `/api/dashboard` | Dashboard analytics              |

---

## 🧪 Demo Credentials

| Role  | Email                      | Password     |
|-------|---------------------------|--------------|
| MR    | rahul@pharmacrm.com        | password123  |
| MR    | priya@pharmacrm.com        | password123  |
| Admin | admin@pharmacrm.com        | admin123     |

---

## 📱 System Features

### ✅ Authentication
- Secure login with token-based auth
- Role-based access (MR / Admin)
- User profile with territory info

### ✅ Doctor Master
- Add / Edit / Deactivate doctors
- Category A/B/C classification
- Visit frequency tracking (Weekly / Fortnightly / Monthly)
- Last visit tracking
- Search and filter by category, area, specialization

### ✅ Product Master
- Full product portfolio
- Division-wise filtering (Cardiology, Diabetology, etc.)
- MRP, packing, indications, key benefits
- Sample availability tracking

### ✅ Daily Call Report (DCR)
- 3-step DCR entry wizard
- Products detailed per visit
- Sample given tracking with quantity
- Literature and gift tracking
- Rx (prescription) count tracking
- Doctor feedback and notes
- Call type: Planned / Unplanned / Joint

### ✅ Visit History
- Filter by month
- Today's visits tab
- Visit statistics (total Rx, avg duration, unique doctors)

### ✅ Tour Planner
- Monthly planning calendar
- Plan status: Draft → Submitted → Approved
- Visual calendar with visit dots
- Plan progress tracking

### ✅ Coverage Report
- Coverage % by category (A/B/C)
- Coverage % by area
- Uncovered doctors list
- Month-wise filtering

### ✅ Missed Call Report
- Overdue by frequency (days overdue)
- Missed planned calls
- Not-visited-this-month list

### ✅ Dashboard
- Today's visit count
- Monthly coverage %
- 7-day visit trend chart
- Plan achievement progress
- Recent visits list

---

## 📱 Android APK Conversion

This web app is PWA-ready and can be converted to Android APK using:

### Option A: Capacitor (Recommended)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init PharmaCRM com.pharmacrm.app
npx cap add android

# Update capacitor.config.json:
# { "webDir": "frontend", "server": { "url": "https://YOUR_NETLIFY_URL" } }

npx cap sync android
npx cap open android
# Then: Build → Generate Signed APK in Android Studio
```

### Option B: PWA Builder

1. Visit [pwabuilder.com](https://pwabuilder.com)
2. Enter your Netlify URL
3. Click **Build** → **Android** → Download APK

### Option C: WebView APK (Simple)

Create a simple Android app with a WebView pointing to your Netlify URL. This requires minimal Android development.

---

## 🔐 Production Notes

1. **Authentication**: Currently uses base64 tokens. For production, replace with JWT using a secret key stored in Netlify environment variables.

2. **Database**: JSON files work for small teams (up to ~500 visits). For larger deployments, consider migrating to:
   - **Netlify + FaunaDB** (serverless-friendly)
   - **Netlify + Supabase** (PostgreSQL)
   - **Netlify + MongoDB Atlas**

3. **Environment Variables**: Set in Netlify dashboard:
   ```
   JWT_SECRET=your-secret-key-here
   ```

4. **File Persistence**: Note that Netlify Functions are stateless — JSON file writes work during a function execution but files reset on each deploy. For data persistence across deploys, use an external database.

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start local dev server with Netlify Functions
netlify dev

# App runs at http://localhost:8888
```

---

## 📞 Support

For issues or feature requests, open a GitHub issue or contact your system administrator.

---

*Built with ❤️ for Pharma MRs • Powered by Netlify Serverless*
