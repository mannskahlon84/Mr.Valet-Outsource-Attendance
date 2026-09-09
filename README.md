# Mr. Valet Parking - Outsource Tracking & Manpower Control System

A full-stack, enterprise-grade manpower dispatch, shift allocation, attendance tracking, and billing system designed for valet parking and hospitality operations.

---

## 🚀 Key System Features

- **6 Dedicated Role-Based Web Portals**:
  1. **Super Admin Portal (`/admin`)**: Complete system administration, client venue management, contract agency registry, worker directory, audit logging, and QR geofence token generation.
  2. **Operations Manager Portal (`/operations`)**: Manager-specific venue filtering, multi-shift dispatching for single locations, agency routing, live attendance monitoring, and real-time bid negotiations.
  3. **Supplier Head Portal (`/supplier`)**: Incoming manpower request review, counter-offer negotiations, worker roster management, and monthly billing statements.
  4. **Accounting Team Portal (`/accounting`)**: Automated monthly supplier invoicing, custom date-range invoice generator with instant PDF download, and duty hours discrepancy audit.
  5. **General Manager (GM) Panel (`/gm`)**: Executive KPIs, budget vs. actual spend tracking, supplier fulfillment rankings, and location cost breakdown.
  6. **Worker Portal (`/worker`)**: Mobile-first PWA check-in and check-out with HTML5 GPS geolocation verification, QR scanning, and facial selfie verification.

- **Automated Geofencing & Anti-Buddy Punching**:
  - Cryptographic QR codes tied to venue GPS coordinates.
  - GPS distance verification (Haversine formula).
  - Browser-based camera integration.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, SQLite / PostgreSQL, Pydantic v2, Uvicorn.
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Turbopack.
- **Authentication**: OAuth2 Password Flow, JWT Tokens, Role-Based Access Control (RBAC).

---

## 📁 Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routers/      # REST API endpoints (auth, sites, requests, suppliers, etc.)
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic (attendance, audit, invoices)
│   │   └── db/               # Database engine and sessions
│   ├── seed_roles.py         # Seed script for default portal users
│   ├── sync_all_locations.py # Seed script for 82+ hotel and venue locations
│   └── requirements.txt      # Python dependencies
├── web/
│   ├── app/
│   │   ├── admin/            # Super Admin portal
│   │   ├── operations/       # Operations Manager portal
│   │   ├── supplier/         # Supplier agency portal
│   │   ├── accounting/       # Accounting & invoicing portal
│   │   ├── gm/               # General Manager dashboard
│   │   ├── worker/           # Worker mobile web check-in
│   │   └── login/            # Unified authentication page
│   ├── components/           # Reusable UI widgets and badges
│   └── lib/                  # Client API utilities
└── README.md
```

---

## 🏁 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python seed_roles.py
python sync_all_locations.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd web
npm install
npm run dev
```

### 3. Access Portals
Open your browser at `http://localhost:3000/login`.
Default development test password: `devpass123`

---

## 🌐 Production Deployment Guide

### Deploying Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository: `mannskahlon84/Mr.Valet-Outsource-Attendance`.
2. Under **Project Settings**:
   - **Root Directory**: Click *Edit* and select `web`.
   - **Framework Preset**: Next.js (automatically detected).
3. Under **Environment Variables**:
   - Add `NEXT_PUBLIC_API_URL` pointing to your deployed backend API URL (e.g. `https://your-api.railway.app/api/v1` or `https://api.yourdomain.com/api/v1`).
4. Click **Deploy**.

### Deploying Backend
The FastAPI backend can be deployed via Docker, Render, Railway, Fly.io, or any Ubuntu VPS:
- **Dockerfile** or start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Database**: PostgreSQL (`DATABASE_URL=postgresql://user:pass@host:5432/dbname`)
- **Run Seeding**:
  ```bash
  python seed_roles.py
  python sync_all_locations.py
  ```

