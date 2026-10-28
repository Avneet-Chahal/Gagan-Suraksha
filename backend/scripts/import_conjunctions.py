"""
Gagan Suraksha - CLI Ingestion Script for Historical Conjunctions
================================================================
A robust, repeatable CLI command to inspect and ingest historical conjunction
records from conjunctions_data.json into the SQLite database.

Usage Examples:
  # Inspect structure, date coverage, distributions, and field meanings
  python backend/scripts/import_conjunctions.py --inspect

  # Dry-run validation of 500 records
  python backend/scripts/import_conjunctions.py --limit 500 --dry-run

  # Ingest default batch of 250 records prioritized for ISRO/Indian assets
  python backend/scripts/import_conjunctions.py --limit 250

  # Ingest all 10,960 records with batch size 500
  python backend/scripts/import_conjunctions.py --all --batch-size 500

  # Force update existing records
  python backend/scripts/import_conjunctions.py --all --force-update
"""

import argparse
import json
import logging
import sys
from pathlib import Path

# Ensure workspace root is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.database import SessionLocal, engine, run_migrations
from backend.services.historical_ingestion import (
    import_historical_conjunctions,
    inspect_historical_dataset,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("import_conjunctions")


def print_inspection_report(report: dict) -> None:
    print("\n" + "=" * 65)
    print("      GAGAN SURAKSHA — HISTORICAL DATASET INSPECTION REPORT      ")
    print("=" * 65)
    print(f"File Path:                {report.get('filepath')}")
    print(f"Total Records:            {report.get('total_records')}")
    print(f"Valid Records:            {report.get('valid_records')}")
    print(f"Invalid Records:          {report.get('invalid_records')}")
    print(f"Duplicate Events:         {report.get('duplicate_events_count')}")

    missing = report.get("field_missing_counts", {})
    nulls = report.get("field_null_counts", {})
    has_missing = any(v > 0 for v in missing.values()) or any(v > 0 for v in nulls.values())
    print(f"Data Completeness:        {'100% COMPLETE (No missing/null fields)' if not has_missing else 'Has missing/nulls'}")

    print("\n--- Verified Units & Astrodynamic Definitions ---")
    for field, meaning in report.get("units_and_meanings", {}).items():
        print(f"  * {field:<24}: {meaning}")

    dist = report.get("distributions", {})
    print("\n--- Numerical Distributions ---")
    mr = dist.get("min_range_km", {})
    if mr:
        print(f"  * min_range (km):       Min: {mr['min']:.4f} | 25%: {mr['p25']:.4f} | Median: {mr['median']:.4f} | 75%: {mr['p75']:.4f} | Max: {mr['max']:.4f}")
    rv = dist.get("relative_velocity_km_s", {})
    if rv:
        print(f"  * rel_vel (km/s):       Min: {rv['min']:.2f} | 25%: {rv['p25']:.2f} | Median: {rv['median']:.2f} | 75%: {rv['p75']:.2f} | Max: {rv['max']:.2f}")
    p1 = dist.get("prop_time_1_days", {})
    if p1:
        print(f"  * prop_time_1 (days):   Min: {p1['min']:.2f} | Median: {p1['median']:.2f} | Max: {p1['max']:.2f}")

    cov = report.get("temporal_coverage", {})
    print("\n--- Temporal Coverage ---")
    print(f"  * Earliest TCA:         {cov.get('earliest_tca_utc')}")
    print(f"  * Latest TCA:           {cov.get('latest_tca_utc')}")
    print(f"  * Earliest TLE Epoch:   {cov.get('earliest_tle_epoch_utc')}")
    print(f"  * Latest TLE Epoch:     {cov.get('latest_tle_epoch_utc')}")

    ind = report.get("indian_spacecraft", {})
    print("\n--- Indian / ISRO Space Situational Awareness ---")
    print(f"  * Conjunctions involving ISRO Assets: {ind.get('total_encounters')}")
    print(f"  * Unique Monitored Indian Spacecraft: {ind.get('spacecraft_count')}")
    if ind.get("spacecraft_list"):
        sample_sats = ind["spacecraft_list"][:8]
        print(f"  * Spacecraft Samples:                 {', '.join(sample_sats)}")
    print("=" * 65 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Gagan Suraksha: Robust Historical Conjunction Data Ingestion CLI"
    )
    parser.add_argument(
        "--file",
        default="backend/data/conjunctions_data.json",
        help="Path to conjunctions_data.json (default: backend/data/conjunctions_data.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=250,
        help="Maximum records to ingest if not --all (default: 250)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Ingest all available records in the dataset (10,960 records)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch commit size for database transactions (default: 500)",
    )
    parser.add_argument(
        "--inspect",
        action="store_true",
        help="Run forensic dataset inspection and display distribution summary without importing",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform parsing, propagation, and risk evaluation without writing to database",
    )
    parser.add_argument(
        "--force-update",
        action="store_true",
        help="Update existing conjunction records if already present in database",
    )
    parser.add_argument(
        "--no-prioritize",
        action="store_true",
        help="Disable sorting by Indian spacecraft priority",
    )

    args = parser.parse_args()

    # If inspect flag is specified, perform inspection and exit
    if args.inspect:
        logger.info("Executing forensic dataset inspection on %s...", args.file)
        report = inspect_historical_dataset(args.file)
        print_inspection_report(report)
        return

    # Ensure database migrations / columns are up to date
    run_migrations(engine)

    limit = None if args.all else args.limit
    logger.info(
        "Starting historical conjunction import (target: %s, file: %s, dry_run: %s)...",
        "ALL" if args.all else limit,
        args.file,
        args.dry_run,
    )

    db = SessionLocal()
    try:
        results = import_historical_conjunctions(
            db=db,
            filepath=args.file,
            limit=limit,
            batch_size=args.batch_size,
            prioritize_indian=not args.no_prioritize,
            force_update=args.force_update,
            dry_run=args.dry_run,
        )
        print("\n" + "=" * 50)
        print("        HISTORICAL INGESTION RESULTS        ")
        print("=" * 50)
        for k, v in results.items():
            print(f"  {k:<26}: {v}")
        print("=" * 50 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
