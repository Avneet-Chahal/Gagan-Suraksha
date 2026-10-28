from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/incidents", tags=["Real-Life Incidents"])

VERIFIED_INCIDENTS: List[Dict[str, Any]] = [
    {
        "id": "iridium-33-cosmos-2251",
        "title": "Iridium 33 × Cosmos 2251 Hypervelocity Collision",
        "date": "2009-02-10",
        "timeUtc": "16:56:00Z",
        "altitudeKm": 789.0,
        "relativeVelocityKmS": 11.65,
        "predictedClosestApproachMeters": 584.0,
        "primarySat": {
            "name": "Iridium 33",
            "noradId": 24946,
            "operator": "Iridium Communications (USA)",
            "role": "Commercial Voice/Data Satellite",
            "statusBefore": "OPERATIONAL",
            "massKg": 556.0,
            "orbit": "780 km circular • 86.4° polar LEO",
        },
        "secondarySat": {
            "name": "Cosmos 2251",
            "noradId": 22675,
            "operator": "Russian Space Forces",
            "role": "Strela-2M Military Communications",
            "statusBefore": "DEFUNCT / DERELICT",
            "massKg": 900.0,
            "orbit": "790 km circular • 74.0° LEO",
        },
        "outcome": (
            "Complete catastrophic destruction of both spacecraft. The collision generated over 2,000 catalogued "
            "debris fragments (>10 cm) and hundreds of thousands of untracked lethal fragments, contaminating the "
            "700-900 km LEO orbital highway for decades to centuries."
        ),
        "verificationStatus": "VERIFIED_HISTORICAL_FACT",
        "verificationNote": "Historical event confirmed by CelesTrak, NASA Orbital Debris Program Office, and USSPACECOM.",
        "provenance": "CelesTrak Collision Report & NASA Technical Analysis (NTRS 20100008433)",
        "sourceLinks": [
            {"name": "CelesTrak Collision Report", "url": "https://celestrak.org/events/collision/"},
            {"name": "NASA Technical Report", "url": "https://ntrs.nasa.gov/citations/20100008433"},
        ],
        "isIllustrativeReplay": True,
        "replayNotice": "Historical facts sourced from CelesTrak and NASA. 3D canvas represents an illustrative visualization, not a verified sensor-interpolated state reconstruction.",
    },
    {
        "id": "starlink-incident-1",
        "title": "ESA Aeolus vs Starlink-44 Evasive Maneuver",
        "date": "2019-09-02",
        "timeUtc": "11:05:00Z",
        "altitudeKm": 320.0,
        "relativeVelocityKmS": 14.2,
        "predictedClosestApproachMeters": 400.0,
        "primarySat": {
            "name": "ESA Aeolus",
            "noradId": 43600,
            "operator": "European Space Agency (ESA)",
            "role": "Earth Wind Observation Satellite",
            "statusBefore": "OPERATIONAL",
            "massKg": 1360.0,
            "orbit": "320 km circular LEO",
        },
        "secondarySat": {
            "name": "Starlink-44",
            "noradId": 44265,
            "operator": "SpaceX",
            "role": "Megaconstellation Prototype",
            "statusBefore": "OPERATIONAL / LOWERING",
            "massKg": 260.0,
            "orbit": "320 km circular LEO",
        },
        "outcome": (
            "ESA commanded an orbital thruster firing half an orbit prior to TCA to raise Aeolus's altitude "
            "and pass safely over Starlink-44 after the collision probability crossed the 1 in 1,000 emergency threshold. "
            "SpaceX reported an internal paging system glitch prevented timely maneuver coordination."
        ),
        "verificationStatus": "AWAITING_INCIDENT_VERIFICATION",
        "verificationNote": (
            "Status: Awaiting incident verification. Candidate incident: ESA Aeolus vs Starlink-44 (2 Sept 2019). "
            "Awaiting explicit user confirmation whether this event is designated for Case Study B."
        ),
        "provenance": "ESA Space Debris Office (ESOC Darmstadt) Press Release",
        "sourceLinks": [
            {
                "name": "ESA Space Debris Office Official Report",
                "url": "https://www.esa.int/Safety_Security/Space_Debris/ESA_spacecraft_dodges_large_constellation",
            }
        ],
        "isIllustrativeReplay": True,
        "replayNotice": "Candidate incident context provided for evaluation. Awaiting user verification.",
    },
    {
        "id": "starlink-incident-2",
        "title": "China Space Station (Tiangong) vs Starlink-1095 / Starlink-2305",
        "date": "2021-07-01",
        "timeUtc": "13:20:00Z",
        "altitudeKm": 390.0,
        "relativeVelocityKmS": 14.8,
        "predictedClosestApproachMeters": 2500.0,
        "primarySat": {
            "name": "Tiangong Space Station (CSS)",
            "noradId": 48274,
            "operator": "China Manned Space Agency (CMSA)",
            "role": "Crewed Orbital Space Station",
            "statusBefore": "OPERATIONAL (Crewed)",
            "massKg": 22500.0,
            "orbit": "390 km circular LEO • 41.5°",
        },
        "secondarySat": {
            "name": "Starlink-1095 / Starlink-2305",
            "noradId": 45044,
            "operator": "SpaceX",
            "role": "Commercial Broadband Megaconstellation",
            "statusBefore": "OPERATIONAL / MANEUVERING",
            "massKg": 260.0,
            "orbit": "390 km LEO",
        },
        "outcome": (
            "China submitted an official note verbale to the UN COPUOS Secretariat (A/AC.105/1262) documenting "
            "that the Tiangong Space Station had to perform emergency collision avoidance maneuvers on 1 July 2021 and "
            "21 October 2021 to ensure the safety of taikonauts on board."
        ),
        "verificationStatus": "AWAITING_INCIDENT_VERIFICATION",
        "verificationNote": (
            "Status: Awaiting incident verification. Candidate incident: UN COPUOS submission A/AC.105/1262. "
            "Awaiting explicit user confirmation whether this event is designated for Case Study C."
        ),
        "provenance": "UN Office for Outer Space Affairs (A/AC.105/1262 Note Verbale)",
        "sourceLinks": [
            {
                "name": "UN COPUOS Document A/AC.105/1262",
                "url": "https://www.unoosa.org/oosa/en/ourwork/copuos/index.html",
            }
        ],
        "isIllustrativeReplay": True,
        "replayNotice": "Candidate incident context provided for evaluation. Awaiting user verification.",
    },
]


@router.get("", summary="List Real-Life Incidents Library")
def list_incidents() -> List[Dict[str, Any]]:
    """Returns the library of historical collision and close-encounter case studies."""
    return VERIFIED_INCIDENTS


@router.get("/{incident_id}", summary="Get Incident Detail")
def get_incident(incident_id: str) -> Dict[str, Any]:
    """Retrieves full case study metadata for a requested incident ID."""
    for inc in VERIFIED_INCIDENTS:
        if inc["id"] == incident_id:
            return inc
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Incident with ID '{incident_id}' not found.",
    )
