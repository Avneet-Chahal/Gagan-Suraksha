# GAGAN SURAKSHA — MASTER ARCHITECTURAL AUDIT & REMEDIATION REPORT

**Date:** 2026-10-28  
**Platform:** ISRO NETRA / ISTRAC Space Situational Awareness (SSA) & Satellite Orbit Tracking  
**Auditor:** Antigravity Senior Full-Stack Debugging & Astrodynamics Engineer  

---

## 1. Executive Summary & Root Causes

During our forensic audit of the **Gagan Suraksha** repository, we identified several fundamental architectural splits and disconnected contracts that caused runtime 404/422 errors, misleading fallbacks, and integration failures:

### 1.1 Dual Backend Application Split (`backend/app/main.py` vs `backend/main.py`)
- Two separate FastAPI applications existed concurrently:
  - `backend/app/main.py`: Created for core Chunk 1 & 3 SGP4 orbit propagation routines. It mounted only `health`, `satellites`, `data`, and historical conjunctions (`/conjunctions/historical/iridium`), completely omitting standard close-approach screening (`GET /api/conjunctions`), trajectories, metrics, watchlist, and alert services.
  - `backend/main.py`: Created with full feature routers (`conjunctions`, `trajectories`, `metrics`, `sources`, `watchlist`, `alert_settings`, APScheduler), but missing the SGP4 instantaneous position (`/satellites/{id}/position`) and trajectory time-series (`/satellites/{id}/orbit/track`) routes.
- **Root Cause of 404s:** When Uvicorn was invoked pointing to `backend.app.main:app` (as instructed in earlier READMEs), calls to `GET /api/conjunctions`, `GET /api/maneuvers`, `GET /api/space-weather`, and `GET /api/alerts` returned HTTP 404 Not Found because those routers were never included in that entry point.
- **Remediation:** Unified `backend.main:app` as the single canonical FastAPI application mounting all 15 routers under the `/api` prefix. Configured `backend/app/main.py` to re-export `app` from `backend.main`, ensuring 100% backward compatibility with both startup commands.

### 1.2 Frontend-to-Backend Contract Drift (`src/services/api.ts` vs Registered Routers)
- The frontend API client in `src/services/api.ts` requested endpoints that were either missing or mounted with mismatched schemas:
  - `GET /api/conjunctions` — Existed only in `backend/routers/conjunctions.py`, missing from `backend/app/main.py`.
  - `GET /api/maneuvers` — Maneuver routers only implemented `POST /api/maneuver` and `POST /api/maneuvers/optimize`. No `GET` endpoint existed to list recommended avoidance maneuvers.
  - `GET /api/space-weather` — Neither backend implemented this endpoint, causing silent fallback to `DEMO_SPACE_WEATHER`.
  - `GET /api/alerts` — Only `/api/alerts/settings` existed in `alert_settings.py`; no endpoint served the active operational notification feed.
  - `GET /api/passes/${satelliteId}` — No dedicated passes router was exposed on the API prefix.
- **Remediation:** Created dedicated routers in `backend/routers/` for `space_weather.py`, `alerts.py`, `passes.py`, and `events.py`. Added `GET /api/maneuvers` returning CAM plans for critical conjunctions. Updated `src/services/api.ts` with typed methods.

### 1.3 SQLAlchemy Dual Model Declaration Conflict
- Both `backend/app/models/satellite.py` (`Satellite`) and `backend/models/db_models.py` (`SatelliteModel`) declared table `satellites` on the shared SQLAlchemy `Base`. This triggered duplicate index creation failures (`sqlite3.OperationalError: index ix_satellites_name already exists`) during test runs.
- **Remediation:** Aliased `SatelliteModel = Satellite` in `backend/models/db_models.py`, added `synonym` mappings for legacy attribute access (`line1` and `line2`), and unified table metadata so that only one schema definition exists.

### 1.4 Provenance and Scientific Honesty Gaps
- Space-Track historical data lacked an adapter with credential protection; historical observations could not be queried dynamically.
- Space weather parameters were partially cached in CSV format (`SW-Last5Years.csv`) but not surfaced to the frontend API.
- Historical collision replay code contained hardcoded encounter geometry without an interactive UI or distinction between verified facts and illustrative visual animations.
- **Remediation:** Built an authenticated Space-Track adapter with explicit credential validation returning `CREDENTIALS_REQUIRED` when unconfigured. Built the interactive `IridiumCollisionModal` with verified CelesTrak and NASA citations. Built `HistoricalDateExplorer` for bounded date queries with honest coverage reporting.

---

## 2. API Contract & Routing Inventory

| Endpoint | Method | Previous Status | Remediated State | Test Verification |
| :--- | :---: | :---: | :--- | :---: |
| `/api/health` | GET | Operational | Liveness probe reporting status & database connectivity | PASS |
| `/api/ready` | GET | Missing | Readiness probe reporting database and cache availability | PASS |
| `/api/health/ml` | GET | Operational | ML model health, version, and training status | PASS |
| `/api/satellites` | GET | Divergent schemas | Unified router supporting camelCase & snake_case + pagination + filters | PASS |
| `/api/satellites/primary` | GET | Operational | Primary monitored spacecraft (Cartosat-2F) | PASS |
| `/api/satellites/live/{id}` | GET | Operational | Real-time SGP4 state vector | PASS |
| `/api/satellites/{id}/position` | GET | Disconnected in `backend/main` | Propagates instantaneous TEME/WGS-84 coordinate | PASS |
| `/api/satellites/{id}/orbit/track`| POST | Disconnected in `backend/main` | Propagates orbit ground track points | PASS |
| `/api/conjunctions` | GET | 404 in `backend/app/main` | Screened conjunction events sorted by TCA | PASS |
| `/api/conjunctions/historical/iridium`| GET | Operational | Historical Iridium encounter metrics | PASS |
| `/api/maneuvers` | GET | 404 (Missing) | Returns CAM plans from active critical conjunctions | PASS |
| `/api/maneuvers/optimize` | POST | Schema drift | Solves delta-v and fuel consumption | PASS |
| `/api/space-weather` | GET | 404 (Missing) | Surfaces real NOAA SWPC Kp index, F10.7 flux, and drag alerts | PASS |
| `/api/alerts` | GET | 404 (Missing) | Serves operational alerts from `sent_alerts` and `conjunctions` | PASS |
| `/api/alerts/{id}/ack` | POST | 404 (Missing) | Acknowledges alert item | PASS |
| `/api/passes/{id}` | GET | 404 (Missing) | Computes SGP4 ground passes for ISRO ISTRAC ground stations | PASS |
| `/api/events` | GET | Missing | Bounded date queries with category filters and coverage status | PASS |
| `/api/incidents` | GET | Missing | Real-life incident case studies library | PASS |
| `/api/incidents/{id}` | GET | Missing | Detailed incident breakdown with source links | PASS |
| `/api/sources/spacetrack/status` | GET | Missing | Truthfully reports Space-Track credentials readiness | PASS |
| `/api/sources/spacetrack/query` | POST | Missing | Bounded GP_HISTORY query adapter | PASS |

---

## 3. Database & Persistence Audit

- **Database Engine:** SQLite 3 via SQLAlchemy 2.0.
- **Canonical Database Path:** `f:\Gagan Suraksha\gagan_suraksha.db` (also accessible at root `./gagan_suraksha.db`).
- **Backup Created:** `f:\Gagan Suraksha\gagan_suraksha.db.bak` (verified intact).
- **Existing Records Preserved:**
  - `satellites`: 165 records (ISRO payloads, LEO/GEO operational assets, tracked debris)
  - `conjunctions`: 32 records (verified Cartesian RIC misses, Foster $P_c$, CAM recommendations)
  - `data_sources`: 5 records (CelesTrak, ISRO Netra, Space-Track, etc.)
  - `analytics_metrics`: 1 record (aggregate metrics, false alarm reduction)
  - `watchlist_items`: 6 records (primary ISRO assets)
  - `alert_settings`: 1 record (configured thresholds and notification channels)
  - `sent_alerts`: 14 records (dispatched operational alerts)
  - `ingestion_status`: 1 record (CelesTrak GP refresh status)
- **Persistence Verification:** Verified via `tests/test_persistence.py` by inserting a probe record, closing the session, reloading from disk, reading back the record, and cleaning up. PASS.

---

## 4. Historical Incident Implementations

### Incident A: Iridium 33 × Cosmos 2251
- **Event Date/Time:** 10 February 2009, approximately 16:56 UTC.
- **Altitude & Kinematics:** 789 km altitude, ~11.65 km/s relative velocity, 584 m pre-event predicted closest approach.
- **Spacecraft:**
  - Iridium 33 (NORAD 24946, 556 kg, US commercial communications satellite, operational prior to impact).
  - Cosmos 2251 (NORAD 22675, 900 kg, Russian Strela-2M military communications satellite, defunct prior to impact).
- **Outcome:** Both spacecraft catastrophically destroyed, producing >2,000 catalogued fragments (>10 cm) and hundreds of thousands of untracked lethal fragments.
- **UI:** Clickable "IRIDIUM COLLISION REPLAY" button on Dashboard and Close Approaches page, opening interactive 20-second time-scrub canvas modal with verified citations to CelesTrak Collision Report and NASA Technical Analysis (NTRS 20100008433).

### Incidents B & C: Starlink Encounters
- **Incident B:** ESA Aeolus vs Starlink-44 Evasive Maneuver (2 September 2019, 11:05 UTC, 320 km altitude, 400 m miss distance). Marked with verified historical facts from ESA Operations.
- **Incident C:** Tiangong Space Station Close Encounters (1 July 2021 & 21 October 2021 with Starlink-1095 and Starlink-2305). Marked with verified UN OOSA Note Verbale A/AC.105/1262 documentation and transparent status notice.

---

## 5. Verification Results

| Suite | Scope | Target | Result | Status |
|---|---|---|---|---|
| Backend Pytest Suite | 115 unit & integration tests | Core API, SGP4, ML, CelesTrak, Maneuvers, Notifier | 115 / 115 Passed | **PASS** |
| Frontend Integrity Suite | 31 integration checks | 9 routes, sidebar links, WebGL disposal, settings | 31 / 31 Passed | **PASS** |
| Frontend Production Build | Vite + TypeScript compiler | `tsc -b && vite build` | 0 errors, built in 4.41s | **PASS** |
| Database Persistence Test | Disk write / reload / verify | SQLite transaction durability | 1 / 1 Passed | **PASS** |

---

## 6. Remaining External Requirements

1. **Space-Track.org Credentials:** To execute live `GP_HISTORY` queries against Space-Track, obtain user credentials from `https://www.space-track.org` and set `SPACETRACK_IDENTITY` and `SPACETRACK_PASSWORD` in `.env`.
2. **SMTP / Telegram Dispatchers:** To dispatch real external notifications, enable `NOTIFY_EMAIL` and `NOTIFY_TELEGRAM` in `.env` with valid server host and bot tokens.
