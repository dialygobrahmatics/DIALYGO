"""Lightweight keyword-based medical-document suitability check.

NOT a medically authoritative classifier. It only catches obviously non-medical
uploads (marksheets, certificates, exam documents). Replaceable later by an
LLMDocumentClassifier without changing the router or the frontend contract.
"""
import re

# --- Keyword lists (single place to extend) ---------------------------------
MEDICAL_KEYWORDS = {
    "patient": 1, "hospital": 1, "laboratory": 1, "lab report": 2, "diagnosis": 2,
    "clinical": 1, "prescription": 2, "doctor": 1, "physician": 1, "discharge": 2,
    "creatinine": 3, "urea": 2, "hemoglobin": 3, "haemoglobin": 3, "potassium": 2,
    "sodium": 1, "dialysis": 3, "kidney": 2, "renal": 3, "nephrology": 3,
    "fistula": 3, "vascular": 3, "doppler": 3, "blood pressure": 2, "blood report": 2,
    "medical": 1, "clinical history": 2, "treatment": 1, "medication": 2,
    "specimen": 1, "reference range": 2, "mg dl": 2, "mmol": 2,
}

NON_MEDICAL_KEYWORDS = {
    "marksheet": 3, "mark sheet": 3, "marks obtained": 3, "percentage": 2, "grade": 2,
    "semester": 3, "subject": 2, "mathematics": 3, "physics": 3, "chemistry": 2,
    "student": 3, "roll number": 3, "college": 2, "university": 2, "school": 2,
    "exam": 2, "examination": 3, "certificate": 2, "invoice": 2, "employee": 2,
    "purchase order": 2,
}

# --- Thresholds (single place to tune) --------------------------------------
MEDICAL_ACCEPT_SCORE = 3
NON_MEDICAL_STRONG_SCORE = 4

MESSAGES = {
    "non_medical_document": (
        "This document does not appear to be a medical report. Please upload only medical reports such as "
        "laboratory reports, clinical notes, prescriptions, discharge summaries, or vascular reports."
    ),
    "ambiguous_document": (
        "We could not verify this document as a medical report. Please upload a medical report such as a "
        "laboratory report, clinical note, prescription, discharge summary, or vascular report."
    ),
}


def normalize(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _score(text: str, keywords: dict) -> int:
    return sum(weight for word, weight in keywords.items() if word in text)


class MedicalDocumentChecker:
    """Scores a small text sample. Missing medical keywords alone never rejects."""

    def check(self, sample_text: str) -> dict:
        text = normalize(sample_text)
        medical = _score(text, MEDICAL_KEYWORDS)
        non_medical = _score(text, NON_MEDICAL_KEYWORDS)

        if medical >= MEDICAL_ACCEPT_SCORE and medical >= non_medical:
            return {"accepted": True, "reason": "medical_document"}
        if non_medical >= NON_MEDICAL_STRONG_SCORE and medical < MEDICAL_ACCEPT_SCORE:
            return {"accepted": False, "reason": "non_medical_document", "message": MESSAGES["non_medical_document"]}
        if len(text) < 40:
            # Too little readable text to judge (poor scan) — do not reject on absence of keywords.
            return {"accepted": True, "reason": "medical_document"}
        return {"accepted": False, "reason": "ambiguous_document", "message": MESSAGES["ambiguous_document"]}


def get_checker() -> MedicalDocumentChecker:
    return MedicalDocumentChecker()
