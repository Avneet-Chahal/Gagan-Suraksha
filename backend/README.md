# Gagan Suraksha — SSA & Orbit Propagation Backend

Core FastAPI backend for **Gagan Suraksha (गगन सुरक्षा)**: Indian Space Research Organisation (ISRO) Space Situational Awareness (SSA), Satellite Debris Tracking, and High-Precision Orbit Propagation Platform.

---

## 1. Prerequisites

- **Python 3.10+** (Validated on Python 3.13)
- **pip** package manager
- **SQLite 3** (built into standard Python installations)
- **SGP4 2.27+** (Analytical astrodynamics library)

---

## 2. Virtual Environment Setup

### Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### macOS / Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Dependency Installation

Install the required dependencies:
```powershell
pip install -r requirements.txt
```

---

## 4. Database Configuration

By default, the backend connects to the SQLite database at `./gagan_suraksha.db`.

To configure a custom database path, set `DATABASE_URL` in `.env`:
```env
DATABASE_URL="sqlite:///./gagan_suraksha.db"
```
Parent directories and database tables are automatically initialized on startup.

---

## 5. Starting the Backend Server

Start the development server using Uvicorn:

### Windows (PowerShell):
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be accessible at:
- **Base URL**: `http://127.0.0.1:8000`
- **Health Check**: `http://127.0.0.1:8000/api/health`
- **Data Status**: `http://127.0.0.1:8000/api/data/status`
- **Satellites Catalog**: `http://127.0.0.1:8000/api/satellites`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Specification**: `http://127.0.0.1:8000/redoc`

---

## 6. SGP4 Orbit Propagation (Chunk 3)

### 6.1 Scientific Principles
**Simplified General Perturbations-4 (SGP4)** is the internationally standard analytical astrodynamic perturbation algorithm formulated by Brouwer, Lyddane, and Lane, maintained by David Vallado (AIAA 2006-6753).
- **Astrodynamics, Not Machine Learning**: SGP4 is a deterministic, physics-based perturbation solver—it is **NOT** an AI model.
- **Modeled Perturbations**: Earth gravitational zonal harmonics ($J_2$, $J_3$, $J_4$, $J_5$), simplified atmospheric drag modeled through the ballistic coefficient $B^*$, and lunar-solar third-body gravitational perturbations for deep-space orbits (SDP4).
- **Physical Output**: SGP4 calculates mathematical model estimates of satellite state vectors; it does not replace empirical optical or radar tracking measurements.

### 6.2 Reference Frames & Coordinates
1. **TEME (True Equator, Mean Equinox)**:
   - SGP4 natively computes Cartesian position $(x, y, z)$ and velocity $(v_x, v_y, v_z)$ in the inertial **TEME** reference frame.
   - Units: Kilometres ($\text{km}$) for position; kilometres per second ($\text{km/s}$) for velocity.
2. **ECEF & WGS-84 Geodetic**:
   - For Earth-fixed visualization, TEME state vectors are rotated into the Earth-Centered Earth-Fixed (ECEF) frame using Greenwich Mean Sidereal Time ($\theta_{\text{GMST}}$) based on the IAU-1982 standard.
   - Geodetic coordinates (latitude, longitude, altitude) are derived using the **WGS-84 ellipsoid** ($a = 6378.137\text{ km}$, $f = 1/298.257223563$) via Bowring's closed-form algorithm.

### 6.3 Units and Timestamp Standard
- **Time Representation**: All timestamps are formatted strictly in ISO 8601 UTC (e.g., `2026-10-27T12:00:00Z`). Millisecond Unix epoch timestamps (`time_ms`) are included for high-performance canvas/WebGL rendering.
- **Units**:
  - Distances / Altitudes: $\text{km}$
  - Velocities / Speeds: $\text{km/s}$
  - Angles: Degrees ($[-90.0, +90.0]$ for latitude, $[-180.0, +180.0]$ for longitude)

### 6.4 API Endpoints & Usage

#### A. Instantaneous State Vector
```http
GET /api/satellites/{norad_id}/position?timestamp={optional_iso_utc}
```
*Example*:
```bash
curl -X GET "http://127.0.0.1:8000/api/satellites/25544/position?timestamp=2026-10-27T12:00:00Z"
```
*Sample Response*:
```json
{
  "norad_id": 25544,
  "name": "ISS (ZARYA)",
  "timestamp": "2026-10-27T12:00:00Z",
  "reference_frame": "TEME (True Equator, Mean Equinox)",
  "propagator": "SGP4 (Simplified General Perturbations-4 / Vallado)",
  "position": {
    "x_km": 6723.896,
    "y_km": 911.597,
    "z_km": 355.769,
    "r_km": 6794.73,
    "altitude_km": 416.59
  },
  "velocity": {
    "vx_km_s": -0.9542,
    "vy_km_s": 4.6759,
    "vz_km_s": 5.9974,
    "speed_km_s": 7.6644
  },
  "geodetic": {
    "latitude_deg": 3.0203,
    "longitude_deg": -28.1414,
    "altitude_km": 416.65,
    "reference_ellipsoid": "WGS-84"
  },
  "source_record": {
    "record_id": "f5f1b2ef-51a9-49a5-a2c2-206fa923f1d5",
    "norad_id": 25544,
    "epoch": "2026-10-27T04:14:31.558560Z",
    "data_source": "CELESTRAK",
    "age_days": 0.323,
    "is_extrapolated": true,
    "warning": null
  },
  "status": "SUCCESS",
  "error": null
}
```

#### B. Propagated Orbit Track (Time-Series)
```http
GET /api/satellites/{norad_id}/orbit/track?start={start_utc}&end={end_utc}&step={step_sec}
```
*Example*:
```bash
curl -X GET "http://127.0.0.1:8000/api/satellites/25544/orbit/track?start=2026-10-27T12:00:00Z&end=2026-10-27T13:30:00Z&step=60"
```
*Constraints & Guardrails*:
- `end` must be strictly after `start` (HTTP 422 if violated).
- Maximum duration is capped at **7 days** (604,800s) to prevent unphysical long-range extrapolation.
- Maximum computed points is capped at **5,000 points** per request (HTTP 422 if exceeded).
- Single database lookup and single `Satrec` initialization per request.

### 6.5 Known SGP4 Accuracy & Limitations
- **Atmospheric Drag Sensitivity**: In Low Earth Orbit (LEO, $< 1000\text{ km}$), atmospheric density fluctuations driven by solar flux ($F_{10.7}$) and geomagnetic storms ($K_p$) cause along-track positional errors to grow quadratically over time. Typical LEO drift is $1 \text{ to } 3\text{ km/day}$.
- **Stale TLE Thresholds**: The API automatically evaluates the age of the orbital elements relative to the requested propagation timestamp:
  - If $|\Delta t| > 7\text{ days}$: An `ACCURACY WARNING` is included in `source_record.warning`.
  - If $|\Delta t| > 30\text{ days}$: An `ORBITAL DATA STALE` alert is raised indicating severe degradation.
- **Unmodeled Maneuvers**: SGP4 assumes purely ballistic, unpowered orbital motion. Station-keeping or collision-avoidance delta-V burns invalidate prior TLE elements until updated elements are ingested.

---

## 7. Frontend Integration Guidelines

The frontend dashboard UI is preserved without visual modification:
- **Orbit Tracking View (`/tracking`)**: Consumes `GET /api/satellites/{norad_id}/orbit/track` to plot 3D orbital trajectory splines in the Three.js viewport (`OrbitTrackingScene`).
- **Real-Time Telemetry Panels**: Consumes `GET /api/satellites/{norad_id}/position` to display instantaneous Cartesian coordinates, geodetic latitude/longitude, and orbital speed.

---

## 8. Running Automated Tests

Run the backend test suite using Pytest. Tests run against an isolated temporary test database:

```powershell
# Run SGP4 orbit propagation and tracking tests
python -m pytest tests/test_orbit_propagation.py -v

# Run all core Chunk 1, 2, and 3 tests
python -m pytest tests/test_orbit_propagation.py tests/test_data_status.py tests/test_health.py tests/test_satellites.py tests/test_sgp4.py -v
```
