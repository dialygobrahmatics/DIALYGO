"""Rule-based Dialygo clinical insights for the mobile app.

Observational and non-diagnostic. Language is deliberately neutral: observed trend,
potential clinical consideration, discuss with the treating clinician.
"""
from typing import List

# test_name -> (low, high)
RANGES = {
    "Haemoglobin": (10.0, 12.0),
    "Potassium": (3.5, 5.1),
    "Sodium": (135.0, 145.0),
    "Creatinine": (0.6, 1.3),
    "Urea": (17.0, 43.0),
    "Calcium": (8.5, 10.5),
    "Phosphate": (2.5, 4.5),
    "Albumin": (3.5, 5.2),
}

SEVERITY_ORDER = {"ATTENTION": 0, "MONITOR": 1, "STABLE": 2}


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_insights(lab_rows: List[dict], vital_rows: List[dict], session_count: int) -> List[dict]:
    """lab_rows/vital_rows are newest-first plain dicts."""
    insights: List[dict] = []
    by_test: dict = {}
    for row in lab_rows:
        by_test.setdefault(row["test_name"], []).append(row)

    for test_name, rows in by_test.items():
        low, high = RANGES.get(test_name, (None, None))
        latest = _to_float(rows[0].get("test_value"))
        if latest is None or low is None:
            continue
        previous = _to_float(rows[1].get("test_value")) if len(rows) > 1 else None
        direction = None
        if previous is not None and previous != 0:
            change = (latest - previous) / previous * 100
            if change > 5:
                direction = "increased"
            elif change < -5:
                direction = "decreased"

        if latest < low or latest > high:
            insights.append({
                "insight_type": "ATTENTION",
                "title": f"{test_name} outside the usual reference range",
                "insight_text": (
                    f"The most recent {test_name.lower()} value recorded from your uploaded reports is {latest} "
                    f"{rows[0].get('unit') or ''}".strip()
                    + f", against a reference range of {low}-{high}. This is an observed reading, not a diagnosis. "
                      "Please discuss it with your treating clinician."
                ),
                "supporting_data": {"test_name": test_name, "value": latest, "reference_range": f"{low} - {high}"},
            })
        elif direction:
            insights.append({
                "insight_type": "MONITOR",
                "title": f"{test_name} has {direction} since the previous report",
                "insight_text": (
                    f"{test_name} moved from {previous} to {latest} between your last two uploaded reports. "
                    "The value remains within the reference range. Worth monitoring at your next review."
                ),
                "supporting_data": {"test_name": test_name, "previous": previous, "latest": latest},
            })
        else:
            insights.append({
                "insight_type": "STABLE",
                "title": f"{test_name} is consistent with previous records",
                "insight_text": f"Recent {test_name.lower()} readings are stable and within the reference range.",
                "supporting_data": {"test_name": test_name, "value": latest},
            })

    if vital_rows:
        latest = vital_rows[0]
        sys_bp, dia_bp = latest.get("systolic_bp"), latest.get("diastolic_bp")
        if sys_bp and dia_bp:
            if sys_bp >= 140 or dia_bp >= 90:
                insights.append({
                    "insight_type": "ATTENTION",
                    "title": "Blood pressure above the usual target",
                    "insight_text": (
                        f"The most recent recorded blood pressure is {sys_bp}/{dia_bp} mmHg. "
                        "Elevated readings before dialysis are a potential clinical consideration — "
                        "please discuss with your treating clinician."
                    ),
                    "supporting_data": {"systolic_bp": sys_bp, "diastolic_bp": dia_bp},
                })
            else:
                insights.append({
                    "insight_type": "STABLE",
                    "title": "Blood pressure within the usual target",
                    "insight_text": f"The most recent recorded blood pressure is {sys_bp}/{dia_bp} mmHg.",
                    "supporting_data": {"systolic_bp": sys_bp, "diastolic_bp": dia_bp},
                })

    if not lab_rows:
        insights.append({
            "insight_type": "MONITOR",
            "title": "No laboratory values recorded yet",
            "insight_text": (
                "Upload a recent laboratory report so Dialygo can surface observed trends across your reports."
            ),
            "supporting_data": {},
        })
    if session_count == 0:
        insights.append({
            "insight_type": "MONITOR",
            "title": "No dialysis sessions recorded yet",
            "insight_text": "Add or upload previous dialysis reports to build your session history.",
            "supporting_data": {},
        })

    insights.sort(key=lambda i: SEVERITY_ORDER.get(i["insight_type"], 3))
    return insights
