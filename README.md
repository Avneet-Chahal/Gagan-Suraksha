# GAGAN SURAKSHA — Space Situational Awareness & Orbital Defense System

**Gagan Suraksha** is a mission-control aerospace software platform designed for real-time satellite tracking, SGP4 orbital propagation, close-approach screening, machine-learning collision risk quantification, automated Collision Avoidance Maneuver (CAM) planning, and authoritative historical incident analysis.

---

## 1. System Architecture

- **Frontend**: React 18, TypeScript, Vite, Three.js / Canvas, Lucide Icons, dark navy/black aerospace mission-control UI.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, SGP4 Astrodynamics Engine, PyTorch / ML state corrector, APScheduler.
- **Database**: SQLite with SQLAlchemy ORM, indexed schema with zero duplicate models, located at `gagan_suraksha.db`.
- **Authoritative Data Sources**:
  - **CelesTrak**: Real-time TLE orbital element ingestion with checksum validation and 6-hour refresh schedule.
  - **Space-Track.org**: Authenticated historical GP_HISTORY adapter with bounded date range querying.
  - **NOAA SWPC**: Space weather indices (F10.7 solar flux, Kp geomagnetic storm index, atmospheric density drag models).

---

## 2. Windows Quick Start & Startup Commands

Run commands from the repository root: `D:\Gagan Suraksha` (or workspace root `f:\Gagan Suraksha`).

### A. Backend Startup (Canonical Entry Point)

The single consolidated FastAPI application entry point is `backend.main:app` (aliased seamlessly by `backend.app.main:app`):

```powershell
# Using the dedicated virtual environment:
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Or with system Python:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Liveness Probe**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Readiness Probe**: [http://127.0.0.1:8000/api/ready](http://127.0.0.1:8000/api/ready)

### B. Frontend Startup

```powershell
# Install npm dependencies (first time only):
npm install

# Start Vite development server:
npm run dev
```

- **Frontend Application URL**: [http://localhost:5173/](http://localhost:5173/)

---

## 3. Environment Configuration (`.env`)

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./gagan_suraksha.db` | Persistent SQLite database file path. |
| `API_V1_PREFIX` | `/api` | Root API route prefix. |
| `HOST` | `127.0.0.1` | Backend network bind interface. |
| `PORT` | `8000` | Backend network port. |
| `CORS_ORIGINS` | `["http://localhost:5173", ...]` | Permitted frontend origins. |
| `SPACETRACK_IDENTITY` | `""` | Space-Track user email (for historical GP_HISTORY). |
| `SPACETRACK_PASSWORD` | `""` | Space-Track account password. |
| `CELESTRAK_AUTO_REFRESH` | `true` | Periodic 6-hour TLE ingestion job. |

*Scientific Honesty Guarantee*: If Space-Track credentials are not configured, the system reports `CREDENTIALS_REQUIRED` with setup instructions and never fabricates historical queries.

---

## 4. API Endpoints Inventory

All routes are mounted strictly under the `/api` prefix:

- **Satellites**:
  - `GET /api/satellites`: Filterable, paginated satellite records.
  - `GET /api/satellites/primary`: Primary monitored spacecraft (Cartosat-2F).
  - `GET /api/satellites/{norad_id}`: Detailed orbital parameters and SGP4 state.
  - `GET /api/satellites/live/{norad_id}`: Real-time SGP4 state vector.
  - `GET /api/satellites/{norad_id}/position`: Single-point TEME/WGS-84 coordinate.
  - `POST /api/satellites/{norad_id}/orbit/track`: Propagated orbit ground track.
- **Conjunctions & Close Approaches**:
  - `GET /api/conjunctions`: Screened conjunction events sorted by TCA with miss distance and collision probability.
  - `GET /api/conjunctions/{id}`: Conjunction event technical assessment.
- **Maneuver Planner**:
  - `GET /api/maneuvers`: Recommended Collision Avoidance Maneuver (CAM) plans.
  - `POST /api/maneuvers/optimize`: Interactive delta-v and fuel consumption solver.
- **Space Weather**:
  - `GET /api/space-weather`: NOAA SWPC geomagnetic Kp index, F10.7 solar flux, and atmospheric drag alerts.
- **Ground Passes**:
  - `GET /api/passes/{norad_id}`: SGP4 pass predictions over ISRO ground stations (ISTRAC Bangalore, SDSC Sriharikota, Port Blair, Mauritius).
- **Historical Date Explorer & Launches**:
  - `GET /api/events`: Bounded date queries with UTC range, category filters (`launches`, `conjunctions`, `collisions`, `satellite_events`), and coverage status.
- **Real-Life Incidents Library**:
  - `GET /api/incidents`: Authoritative historical case studies.
  - `GET /api/incidents/{id}`: Technical incident breakdown with primary/secondary satellite specs, encounter kinematics, debris consequences, and source links.
- **Data Status & Sources**:
  - `GET /api/sources`: Ingestion status for CelesTrak, SGP4, and Space-Track.
  - `GET /api/sources/spacetrack/status`: Space-Track configuration status.
  - `POST /api/sources/spacetrack/query`: Bounded GP_HISTORY query adapter.

---

## 5. Key Features

### Iridium 33 × Cosmos 2251 Collision Replay
A dedicated **IRIDIUM COLLISION REPLAY** button is prominently featured on both the Dashboard and the Close Approaches page. It opens a detailed modal with:
- Exact historical facts (10 February 2009, 16:56 UTC, 789 km altitude, 11.65 km/s relative velocity, 584 m pre-event predicted closest approach).
- Dual satellite specifications (operational US communications satellite vs derelict Russian military satellite).
- Interactive 20-second time-scrub canvas visualization (-10s to +10s).
- Debris generation impact analysis (>2,000 catalogued fragments).
- Verified citations to the CelesTrak Collision Report and NASA Technical Analysis (NTRS 20100008433).

### Historical Date Explorer
Accessible via the **DATE EXPLORER / INCIDENTS** action button on the Dashboard:
- Bounded UTC date picker (preset for January 2025, 1 May 2025, 1 December 2025, and Today).
- Day-by-day step navigation.
- Category filtering and real-time search.
- Truthful data coverage reporting (`COMPLETE_HISTORICAL_SAMPLE`, `PARTIAL_COVERAGE`, or `NO_RECORDS_STORED`).

### Real-Life Incidents Library
Includes three initial case studies:
1. **Incident A**: Iridium 33 × Cosmos 2251 (`VERIFIED_HISTORICAL_FACT`).
2. **Incident B**: ESA Aeolus vs Starlink-44 Evasive Maneuver (`VERIFIED_HISTORICAL_FACT`).
3. **Incident C**: Tiangong Space Station Close Encounters (`VERIFIED_HISTORICAL_FACT` / UN OOSA A/AC.105/1262).

---

## 6. Automated Verification Suites

### Run Python Backend Tests (115 tests):
```powershell
.\backend\.venv\Scripts\python.exe -m pytest -v
```

### Run Frontend Integration Integrity Tests (31 checks):
```powershell
npm test
```

### Run Production Build:
```powershell
npm run build
```

---

## 7. Troubleshooting

- **Database Locked (`WinError 32`)**: Ensure no stale Python or SQLite processes are holding locks on test databases. All tests use isolated or in-memory fixtures.
- **Port 8000 in use**: Check running processes with `Get-Process | Where-Object { $_.ProcessName -match 'python' }` or run on a custom port using `--port 8001`.
- **Space-Track Query Empty**: Register credentials in `.env` (`SPACETRACK_IDENTITY` and `SPACETRACK_PASSWORD`). Queries without credentials safely return `CREDENTIALS_REQUIRED`.
