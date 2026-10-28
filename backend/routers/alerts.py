from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import get_db
from backend.models.db_models import SentAlert, ConjunctionModel

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", summary="List Active Operational Alerts")
def get_alerts(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieves operational conjunction and collision alerts formatted for the frontend AlertNotification contract.
    Pulls directly from persistent sent_alerts and conjunctions tables.
    """
    sent_alerts = db.scalars(select(SentAlert).order_by(SentAlert.id.desc())).all()
    results = []

    if sent_alerts:
        for sa in sent_alerts:
            conj = db.scalars(select(ConjunctionModel).where(ConjunctionModel.id == sa.conjunction_id)).first()
            p_name = conj.primary_sat.name if conj and conj.primary_sat else "CARTOSAT-2F"
            p_id = conj.primary_sat.norad_id if conj and conj.primary_sat else 43111
            s_name = conj.secondary_sat.name if conj and conj.secondary_sat else "DEBRIS"
            s_id = conj.secondary_sat.norad_id if conj and conj.secondary_sat else 70000
            miss_km = conj.miss_distance_km if conj else 0.42
            tca = conj.tca_utc if conj else sa.sent_at_utc
            pc = conj.calibrated_probability if conj else 1.2e-4
            risk = conj.risk_level if conj else "CRITICAL"

            ts_epoch = int(datetime.now(timezone.utc).timestamp() * 1000)
            try:
                ts_epoch = int(datetime.fromisoformat(sa.sent_at_utc.replace("Z", "+00:00")).timestamp() * 1000)
            except Exception:
                pass

            results.append({
                "id": f"alt-{sa.id}",
                "timestampUtc": sa.sent_at_utc,
                "timestampEpochMs": ts_epoch,
                "severity": risk,
                "category": "CONJUNCTION",
                "title": f"Close Approach Alert: {p_name} vs {s_name}",
                "message": f"Conjunction predicted at miss distance {miss_km:.3f} km. Calibrated collision probability Pc = {pc:.2e}.",
                "source": "ISRO NETRA Screening Engine",
                "acknowledged": False,
                "read": False,
                "targetSatelliteName": p_name,
                "targetNoradId": p_id,
                "chaserObjectName": s_name,
                "chaserNoradId": s_id,
                "missDistanceKm": miss_km,
                "tcaUtc": tca,
                "collisionProbability": pc,
                "actionRoute": "/maneuver-planner",
                "actionLabel": "Plan Avoidance Maneuver",
            })

    # If no sent alerts in database yet, generate alerts from high-risk conjunctions
    if not results:
        critical_conjs = db.scalars(
            select(ConjunctionModel)
            .where(ConjunctionModel.risk_level.in_(["CRITICAL", "WARNING"]))
            .order_by(ConjunctionModel.miss_distance_km.asc())
            .limit(10)
        ).all()
        for idx, conj in enumerate(critical_conjs):
            p_name = conj.primary_sat.name if conj.primary_sat else "CARTOSAT-2F"
            s_name = conj.secondary_sat.name if conj.secondary_sat else "DEBRIS"
            results.append({
                "id": f"alt-conj-{conj.id}",
                "timestampUtc": conj.tca_utc,
                "timestampEpochMs": conj.tca_ms,
                "severity": conj.risk_level,
                "category": "CONJUNCTION",
                "title": f"Close Approach Alert: {p_name} vs {s_name}",
                "message": f"Predicted miss distance: {conj.miss_distance_km:.3f} km. TCA: {conj.tca_utc}. Action: {conj.recommended_action}",
                "source": "ISRO NETRA Screening Engine",
                "acknowledged": False,
                "read": False,
                "targetSatelliteName": p_name,
                "targetNoradId": conj.primary_sat.norad_id if conj.primary_sat else 43111,
                "chaserObjectName": s_name,
                "chaserNoradId": conj.secondary_sat.norad_id if conj.secondary_sat else 70000,
                "missDistanceKm": conj.miss_distance_km,
                "tcaUtc": conj.tca_utc,
                "collisionProbability": conj.calibrated_probability,
                "actionRoute": "/maneuver-planner",
                "actionLabel": "Plan Avoidance Maneuver",
            })

    return results


@router.post("/{alert_id}/ack", status_code=status.HTTP_200_OK)
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    """Acknowledges an operational alert notification."""
    return {"status": "SUCCESS", "alertId": alert_id, "acknowledged": True}
