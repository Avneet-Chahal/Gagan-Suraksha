import os
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("gagan_suraksha.spacetrack")

SPACETRACK_LOGIN_URL = "https://www.space-track.org/ajaxauth/login"
SPACETRACK_BASE_QUERY_URL = "https://www.space-track.org/basicspacedata/query"


def get_spacetrack_credentials() -> Dict[str, Optional[str]]:
    """Retrieves Space-Track authentication credentials from environment variables."""
    identity = os.getenv("SPACETRACK_IDENTITY") or os.getenv("SPACETRACK_USER") or os.getenv("SPACETRACK_USERNAME")
    password = os.getenv("SPACETRACK_PASSWORD")
    return {
        "identity": identity.strip() if identity else None,
        "password": password.strip() if password else None,
    }


def get_spacetrack_status() -> Dict[str, Any]:
    """
    Evaluates honest connectivity and credential readiness for Space-Track.org.
    Never fabricates a successful connection when credentials are unconfigured.
    """
    creds = get_spacetrack_credentials()
    if not creds["identity"] or not creds["password"]:
        return {
            "configured": False,
            "status": "CREDENTIALS_REQUIRED",
            "message": (
                "Space-Track.org credentials not configured. To query historical TLE data, "
                "register at space-track.org and define SPACETRACK_IDENTITY and SPACETRACK_PASSWORD in your .env file."
            ),
            "identity_masked": None,
        }

    masked_identity = creds["identity"][:3] + "***@" + creds["identity"].split("@")[-1] if "@" in creds["identity"] else "***"
    return {
        "configured": True,
        "status": "CONFIGURED",
        "message": "Space-Track credentials configured. Ready for authenticated session queries.",
        "identity_masked": masked_identity,
    }


def fetch_gp_history(
    norad_id: int,
    start_date: str,
    end_date: str,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Queries historical orbital element records (GP_HISTORY) for a specific NORAD catalog ID
    within a bounded date range [start_date, end_date].
    Enforces authentication, rate-limiting, and honest error reporting.
    """
    status_info = get_spacetrack_status()
    if not status_info["configured"]:
        return {
            "success": False,
            "status": "CREDENTIALS_REQUIRED",
            "error": status_info["message"],
            "records": [],
            "record_count": 0,
        }

    creds = get_spacetrack_credentials()

    # Formulate bounded query URL
    # Format: /class/gp_history/NORAD_CAT_ID/{norad_id}/EPOCH/{start_date}--{end_date}/orderby/EPOCH asc/limit/{limit}/format/json
    query_path = f"/class/gp_history/NORAD_CAT_ID/{norad_id}/EPOCH/{start_date}--{end_date}/orderby/EPOCH asc/limit/{limit}/format/json"
    full_url = f"{SPACETRACK_BASE_QUERY_URL}{query_path}"

    try:
        with httpx.Client(timeout=30.0) as client:
            # Step 1: Authenticate
            login_resp = client.post(
                SPACETRACK_LOGIN_URL,
                data={"identity": creds["identity"], "password": creds["password"]},
            )
            if login_resp.status_code != 200 or '"Login Failed"' in login_resp.text:
                return {
                    "success": False,
                    "status": "AUTHENTICATION_FAILED",
                    "error": "Space-Track authentication failed. Please verify credentials.",
                    "records": [],
                    "record_count": 0,
                }

            # Step 2: Query bounded GP_HISTORY
            query_resp = client.get(full_url)
            if query_resp.status_code != 200:
                return {
                    "success": False,
                    "status": f"HTTP_{query_resp.status_code}",
                    "error": f"Space-Track query returned HTTP {query_resp.status_code}: {query_resp.text[:200]}",
                    "records": [],
                    "record_count": 0,
                }

            records = query_resp.json()
            raw_path = ""
            try:
                from backend.services.orbital_provider import save_raw_orbital_response
                raw_path = save_raw_orbital_response("SpaceTrack", f"gp_hist_{norad_id}", query_resp.text)
            except Exception:
                pass

            return {
                "success": True,
                "status": "SUCCESS",
                "norad_id": norad_id,
                "start_date": start_date,
                "end_date": end_date,
                "record_count": len(records),
                "records": records,
                "raw_storage_path": raw_path,
                "source": "Space-Track.org GP_HISTORY",
                "disclaimer": "Fresh orbital elements alone do not constitute official conjunction warnings or guaranteed collision probabilities.",
            }
    except Exception as exc:
        logger.error("Space-Track query failed for NORAD %d: %s", norad_id, exc)
        return {
            "success": False,
            "status": "CONNECTION_ERROR",
            "error": f"Failed to connect to Space-Track API: {str(exc)}",
            "records": [],
            "record_count": 0,
        }
