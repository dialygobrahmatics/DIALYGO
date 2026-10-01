"""Best-effort structured extraction from UNVERIFIED OCR text.

Values produced here are labelled unverified everywhere they are displayed and are never
used by the Dialygo web rule engine.
"""
import re
from typing import Dict, List

# name -> (regex, unit, reference range)
LAB_PATTERNS: Dict[str, tuple] = {
    "Haemoglobin": (r"(?:h(?:a)?emoglobin|hb)\D{0,12}(\d{1,2}(?:\.\d{1,2})?)", "g/dL", "12.0 - 16.0"),
    "Potassium": (r"(?:potassium|k\+)\D{0,12}(\d(?:\.\d{1,2})?)", "mmol/L", "3.5 - 5.1"),
    "Sodium": (r"(?:sodium|na\+)\D{0,12}(\d{2,3}(?:\.\d)?)", "mmol/L", "135 - 145"),
    "Creatinine": (r"creatinine\D{0,12}(\d{1,2}(?:\.\d{1,2})?)", "mg/dL", "0.6 - 1.3"),
    "Urea": (r"(?:blood urea|urea)\D{0,12}(\d{1,3}(?:\.\d{1,2})?)", "mg/dL", "17 - 43"),
    "Calcium": (r"calcium\D{0,12}(\d{1,2}(?:\.\d{1,2})?)", "mg/dL", "8.5 - 10.5"),
    "Phosphate": (r"(?:phosphorus|phosphate)\D{0,12}(\d{1,2}(?:\.\d{1,2})?)", "mg/dL", "2.5 - 4.5"),
    "Albumin": (r"albumin\D{0,12}(\d(?:\.\d{1,2})?)", "g/dL", "3.5 - 5.2"),
}

BP_PATTERN = r"(?:blood pressure|bp)\D{0,12}(\d{2,3})\s*/\s*(\d{2,3})"
PULSE_PATTERN = r"(?:pulse|heart rate|hr)\D{0,12}(\d{2,3})"
WEIGHT_PATTERN = r"(?:weight)\D{0,12}(\d{2,3}(?:\.\d)?)\s*kg"


def extract_fields(text: str) -> dict:
    """Returns {labs: [...], vitals: {...}} — empty when nothing reliable is found."""
    flat = re.sub(r"\s+", " ", (text or "")).lower()
    labs: List[dict] = []
    for name, (pattern, unit, ref) in LAB_PATTERNS.items():
        match = re.search(pattern, flat)
        if match:
            labs.append({"test_name": name, "test_value": match.group(1), "unit": unit, "reference_range": ref})

    vitals: dict = {}
    bp = re.search(BP_PATTERN, flat)
    if bp:
        vitals["systolic_bp"] = int(bp.group(1))
        vitals["diastolic_bp"] = int(bp.group(2))
    pulse = re.search(PULSE_PATTERN, flat)
    if pulse:
        vitals["heart_rate"] = int(pulse.group(1))
    weight = re.search(WEIGHT_PATTERN, flat)
    if weight:
        vitals["weight"] = float(weight.group(1))

    return {"labs": labs, "vitals": vitals}
