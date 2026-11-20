#!/usr/bin/env python
"""Refresh tracked SEC filing states without inventing IPO dates or terms."""
from __future__ import annotations
import json, os, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "ipos.json"
CIKS = {
    "lis-technologies-us-2026": "0001973276",
    "nscale-uk-2026": "0002110365",
    "sensing4d-cayman-2026": "0002087307",
    "anthropic-us-2026": "0002130357",
}
FORM_STATUS = {"S-1": "Filed", "F-1": "Filed", "S-1/A": "Amended", "F-1/A": "Amended", "EFFECT": "Effective", "424B4": "Priced", "RW": "Withdrawn"}
FORMS = set(FORM_STATUS)
UA = os.getenv("SEC_USER_AGENT", "IPO-Radar/1.0 contact: tyschcnk20@gmail.com")

def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Host": "data.sec.gov"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)

def latest_ipo_filing(submissions: dict):
    recent = submissions.get("filings", {}).get("recent", {})
    rows = zip(recent.get("form", []), recent.get("filingDate", []), recent.get("accessionNumber", []), recent.get("primaryDocument", []))
    return next((row for row in rows if row[0] in FORMS), None)

def main() -> int:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    changed = 0
    errors = []
    by_id = {r["id"]: r for r in payload["records"]}
    for record_id, cik in CIKS.items():
        try:
            row = latest_ipo_filing(fetch_json(f"https://data.sec.gov/submissions/CIK{cik}.json"))
            if not row:
                continue
            form, filed, accession, document = row
            record = by_id[record_id]
            if filed > record.get("filedAt", ""):
                record["filedAt"] = filed
                if record["status"] not in {"Listed", "Postponed"}:
                    record["status"] = FORM_STATUS[form]
                accession_clean = accession.replace("-", "")
                cik_clean = cik.lstrip("0")
                url = f"https://www.sec.gov/Archives/edgar/data/{cik_clean}/{accession_clean}/{document}"
                title = f"SEC {form} — {filed}"
                record["sources"].insert(0, {"title": title, "publisher": "U.S. SEC", "url": url, "type": "filing"})
                record["sources"] = list({s["url"]: s for s in record["sources"]}.values())[:5]
                record["lastVerified"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
                changed += 1
        except Exception as exc:
            errors.append(f"{record_id}: {exc}")
    payload["generatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    payload["refresh"] = {"secRecordsChecked": len(CIKS), "recordsChanged": changed, "errors": errors}
    DATA.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload["refresh"]))
    return 0 if len(errors) < len(CIKS) else 1

if __name__ == "__main__":
    raise SystemExit(main())
