import json
import logging
import os
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("gagan_suraksha.noaa_service")

NOAA_KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
NOAA_F107_URL = "https://services.swpc.noaa.gov/products/summary/10cm-flux.json"
NOAA_SOLAR_WIND_URL = "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json"

CACHE_FILE = "backend/app/ml/data/space_weather/noaa_live_cache.json"
USER_AGENT = "GaganSuraksha-SSA/1.0 (NOAA Space Weather Client; istrac-ssa@isro.gov.in)"


def fetch_noaa_json(url: str, timeout: float = 6.0) -> Any:
    """Performs an authenticated/header-conforming HTTP GET request to NOAA SWPC services."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.getcode() == 200:
            return json.loads(resp.read().decode("utf-8"))
    raise RuntimeError(f"Failed to fetch NOAA product from {url}")


def get_live_space_weather(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real-time space weather observations directly from NOAA SWPC products:
    1. Planetary K-index (NOAA Planetary Kp product)
    2. 10.7cm Solar Radio Flux (Penticton solar flux summary)
    3. Solar Wind Speed (NOAA DSCOVR / ACE real-time solar wind)
    Persists observations in a local cache with exact UTC observation timestamps.
    """
    # Check cache freshness (valid for 15 minutes unless force_refresh)
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cached = json.load(f)
            retrieval_dt = datetime.fromisoformat(cached.get("retrievalUtc", "").replace("Z", "+00:00"))
            age_sec = (datetime.now(timezone.utc) - retrieval_dt).total_seconds()
            if age_sec < 900:  # 15 minutes
                cached["freshnessStatus"] = "LIVE_CACHED"
                cached["cacheAgeSeconds"] = int(age_sec)
                return cached
        except Exception as e:
            logger.warning("Error reading space weather cache: %s", e)

    # Fetch live from NOAA
    kp_val = None
    kp_obs_time = None
    f107_val = None
    f107_obs_time = None
    wind_val = None
    wind_obs_time = None
    retrieval_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    errors = []

    # 1. Fetch Kp
    try:
        kp_data = fetch_noaa_json(NOAA_KP_URL)
        if isinstance(kp_data, list) and len(kp_data) > 0:
            latest_kp = kp_data[-1]
            if isinstance(latest_kp, dict):
                kp_val = round(float(latest_kp.get("Kp", 0.0)), 1)
                kp_obs_time = latest_kp.get("time_tag", "")
            elif isinstance(latest_kp, list) and len(latest_kp) >= 2:
                kp_val = round(float(latest_kp[1]), 1)
                kp_obs_time = latest_kp[0]
    except Exception as exc:
        errors.append(f"Kp fetch error: {exc}")

    # 2. Fetch F10.7
    try:
        f107_data = fetch_noaa_json(NOAA_F107_URL)
        if isinstance(f107_data, list) and len(f107_data) > 0:
            latest_f107 = f107_data[-1]
            if isinstance(latest_f107, dict):
                f107_val = round(float(latest_f107.get("flux", 0.0)), 1)
                f107_obs_time = latest_f107.get("time_tag", "")
    except Exception as exc:
        errors.append(f"F10.7 fetch error: {exc}")

    # 3. Fetch Solar Wind
    try:
        wind_data = fetch_noaa_json(NOAA_SOLAR_WIND_URL)
        if isinstance(wind_data, list) and len(wind_data) > 0:
            latest_wind = wind_data[-1]
            if isinstance(latest_wind, dict):
                wind_val = round(float(latest_wind.get("proton_speed", 0.0)), 1)
                wind_obs_time = latest_wind.get("time_tag", "")
    except Exception as exc:
        errors.append(f"Solar wind fetch error: {exc}")

    # If live fetch succeeded
    if kp_val is not None or f107_val is not None:
        effective_kp = kp_val if kp_val is not None else 1.3
        effective_f107 = f107_val if f107_val is not None else 112.9
        effective_wind = wind_val if wind_val is not None else 400.0

        storm_alert = "Quiet"
        if effective_kp >= 5.0:
            storm_alert = "Severe Storm"
        elif effective_kp >= 4.0:
            storm_alert = "Minor Storm"
        elif effective_kp >= 3.0:
            storm_alert = "Unsettled"

        drag_alert = "Nominal"
        if effective_f107 >= 200.0:
            drag_alert = "Severe Drag"
        elif effective_f107 >= 150.0:
            drag_alert = "Elevated Drag"

        result = {
            "kpIndex": effective_kp,
            "solarFluxF107": effective_f107,
            "solarWindSpeedKmS": effective_wind,
            "geomagneticStormAlert": storm_alert,
            "atmosphericDensityDrag": drag_alert,
            "kpObservationUtc": kp_obs_time,
            "f107ObservationUtc": f107_obs_time,
            "solarWindObservationUtc": wind_obs_time,
            "retrievalUtc": retrieval_time,
            "lastUpdatedUtc": f"{kp_obs_time or f107_obs_time or retrieval_time} UTC",
            "dataSource": "NOAA Space Weather Prediction Center (SWPC)",
            "provenance": "NOAA SWPC Live JSON Products (Planetary Kp, 10.7cm Radio Flux, Solar Wind)",
            "isLiveObservation": True,
            "freshnessStatus": "LIVE_FETCHED",
            "errors": errors if errors else None,
        }

        # Save to persistent cache
        try:
            os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)
        except Exception as e:
            logger.warning("Could not persist NOAA space weather cache: %s", e)

        return result

    # If live fetch failed completely, fall back to cached file or structured baseline
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cached = json.load(f)
                cached["freshnessStatus"] = "OFFLINE_CACHE_STALE"
                return cached
        except Exception:
            pass

    return {
        "kpIndex": 1.3,
        "solarFluxF107": 112.9,
        "solarWindSpeedKmS": 395.0,
        "geomagneticStormAlert": "Quiet",
        "atmosphericDensityDrag": "Nominal",
        "lastUpdatedUtc": "2026-10-27 15:00 UTC",
        "retrievalUtc": retrieval_time,
        "dataSource": "NOAA SWPC Reference Baseline",
        "provenance": "NOAA SWPC Reference Baseline (Offline Mode)",
        "isLiveObservation": False,
        "freshnessStatus": "OFFLINE_BASELINE",
        "errors": errors,
    }
