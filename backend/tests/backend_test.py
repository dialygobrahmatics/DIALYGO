"""Dialygo Mobile backend tests — auth, patient, reports, doctor, isolation, OTP security."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vascular-access-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PATIENT_MOBILE = "9876543210"
DOCTOR_MOBILE = "9876500001"
FIXED_OTP = "123456"
SEEDED_AADHAAR = "123456789012"


# ---------- helpers ----------
def _new_mobile() -> str:
    # random valid 10-digit starting with 9
    return "9" + str(uuid.uuid4().int)[:9]


def _login(mobile: str) -> dict:
    r = requests.post(f"{API}/auth/send-otp", json={"mobile_number": mobile}, timeout=15)
    assert r.status_code == 200, f"send-otp failed: {r.status_code} {r.text}"
    code = r.json().get("devOtp") or FIXED_OTP
    v = requests.post(f"{API}/auth/verify-otp", json={"mobile_number": mobile, "otp": code}, timeout=15)
    assert v.status_code == 200, f"verify-otp failed: {v.status_code} {v.text}"
    return v.json()


@pytest.fixture(scope="session")
def patient_token() -> str:
    return _login(PATIENT_MOBILE)["accessToken"]


@pytest.fixture(scope="session")
def doctor_token() -> str:
    return _login(DOCTOR_MOBILE)["accessToken"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_send_otp_invalid_mobile(self):
        r = requests.post(f"{API}/auth/send-otp", json={"mobile_number": "12345"}, timeout=10)
        assert r.status_code == 400

    def test_send_otp_valid_returns_dev_otp(self):
        r = requests.post(f"{API}/auth/send-otp", json={"mobile_number": PATIENT_MOBILE}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("devOtp") == FIXED_OTP
        assert d.get("mobileNumber", "").endswith(PATIENT_MOBILE[-4:])

    def test_verify_wrong_code(self):
        requests.post(f"{API}/auth/send-otp", json={"mobile_number": PATIENT_MOBILE}, timeout=10)
        r = requests.post(f"{API}/auth/verify-otp",
                         json={"mobile_number": PATIENT_MOBILE, "otp": "111111"}, timeout=10)
        assert r.status_code == 400

    def test_verify_correct_returns_patient_session(self):
        d = _login(PATIENT_MOBILE)
        assert "accessToken" in d
        assert d["userType"] == "PATIENT"
        assert d["registrationRequired"] is False
        assert d["profile"]["name"] == "Ravi Kumar"

    def test_verify_doctor_session(self):
        d = _login(DOCTOR_MOBILE)
        assert d["userType"] == "DOCTOR"
        assert d["registrationRequired"] is False

    def test_verify_new_patient_needs_registration(self):
        d = _login(_new_mobile())
        assert d["userType"] == "PATIENT"
        assert d["registrationRequired"] is True
        assert d["profile"] is None

    def test_missing_auth_401(self):
        r = requests.get(f"{API}/auth/session", timeout=10)
        assert r.status_code == 401

    def test_invalid_token_401(self):
        r = requests.get(f"{API}/auth/session", headers=_auth("garbage"), timeout=10)
        assert r.status_code == 401

    def test_otp_rate_limit_429(self):
        mobile = _new_mobile()
        requests.post(f"{API}/auth/send-otp", json={"mobile_number": mobile}, timeout=10)
        codes = []
        for _ in range(5):
            r = requests.post(f"{API}/auth/verify-otp",
                              json={"mobile_number": mobile, "otp": "000000"}, timeout=10)
            codes.append(r.status_code)
        # 6th attempt should be 429
        r = requests.post(f"{API}/auth/verify-otp",
                          json={"mobile_number": mobile, "otp": "000000"}, timeout=10)
        assert r.status_code == 429, f"expected 429, got {r.status_code}; prior={codes}"


# ---------- Patient dashboard/profile ----------
class TestPatientAPI:
    def test_session(self, patient_token):
        r = requests.get(f"{API}/auth/session", headers=_auth(patient_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["userType"] == "PATIENT"

    def test_profile_masked_aadhaar(self, patient_token):
        r = requests.get(f"{API}/patient/profile", headers=_auth(patient_token), timeout=10)
        assert r.status_code == 200
        p = r.json()["patient"]
        assert p["aadhaarMasked"].startswith("XXXX XXXX ")
        # Full aadhaar must never leak anywhere in payload
        assert SEEDED_AADHAAR not in r.text

    def test_dashboard(self, patient_token):
        r = requests.get(f"{API}/patient/dashboard", headers=_auth(patient_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "clinicalOverview" in d
        assert "recentReports" in d
        assert d["clinicalOverview"]["unverified"] is True
        assert SEEDED_AADHAAR not in r.text

    def test_duplicate_aadhaar_conflict(self):
        # Register with the seeded Aadhaar from a NEW mobile → 409
        new_mobile = _new_mobile()
        token = _login(new_mobile)["accessToken"]
        r = requests.post(f"{API}/patient/register", headers=_auth(token),
                          json={"name": "Test User", "aadhaar_number": SEEDED_AADHAAR}, timeout=10)
        assert r.status_code == 409

    def test_register_short_name(self):
        new_mobile = _new_mobile()
        token = _login(new_mobile)["accessToken"]
        r = requests.post(f"{API}/patient/register", headers=_auth(token),
                          json={"name": "A", "aadhaar_number": "9" * 12}, timeout=10)
        assert r.status_code == 400

    def test_register_invalid_aadhaar(self):
        new_mobile = _new_mobile()
        token = _login(new_mobile)["accessToken"]
        r = requests.post(f"{API}/patient/register", headers=_auth(token),
                          json={"name": "Valid Name", "aadhaar_number": "12345"}, timeout=10)
        assert r.status_code == 400

    def test_register_and_persist_new_patient(self):
        new_mobile = _new_mobile()
        token = _login(new_mobile)["accessToken"]
        aadhaar = str(uuid.uuid4().int)[:12]
        r = requests.post(f"{API}/patient/register", headers=_auth(token),
                          json={"name": "TEST New Patient", "aadhaar_number": aadhaar}, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["created"] is True
        assert d["patient"]["name"] == "TEST New Patient"
        assert d["patient"]["aadhaarMasked"].endswith(aadhaar[-4:])
        # Verify GET
        prof = requests.get(f"{API}/patient/profile", headers=_auth(token), timeout=10).json()
        assert prof["patient"]["name"] == "TEST New Patient"

    def test_update_profile_name(self, patient_token):
        r = requests.patch(f"{API}/patient/profile", headers=_auth(patient_token),
                           json={"name": "Ravi Kumar"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["patient"]["name"] == "Ravi Kumar"


# ---------- Reports ----------
MEDICAL_PDF_TEXT = (
    "CITY HOSPITAL LABORATORY REPORT\nPatient: Ravi Kumar\nDepartment: Nephrology / Dialysis\n"
    "Haemoglobin: 9.6 g/dL\nPotassium: 5.9 mmol/L\nCreatinine: 8.2 mg/dL\nBlood Urea: 120 mg/dL\n"
    "Blood Pressure: 146/94\nSpecimen: Serum\nLaboratory Signature\n"
)
NON_MEDICAL_PDF_TEXT = (
    "STATE BOARD EXAMINATION MARKSHEET\nStudent Name: John Doe\nRoll Number: 12345\n"
    "Mathematics 88\nPhysics 79\nChemistry 82\nPercentage 83%\nGrade: A\nSemester: 4\n"
)


def _make_pdf_bytes(text: str) -> bytes:
    """Minimal valid PDF containing given text (uncompressed)."""
    import zlib
    # simple text stream PDF
    body = f"BT /F1 12 Tf 50 750 Td ({text.replace('(', ' ').replace(')', ' ')}) Tj ET".encode()
    objs = []
    def add(o): objs.append(o)
    add(b"<< /Type /Catalog /Pages 2 0 R >>")
    add(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>")
    add(b"<< /Length " + str(len(body)).encode() + b" >>\nstream\n" + body + b"\nendstream")
    add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out = b"%PDF-1.4\n"
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode()
    return out


class TestReports:
    def test_upload_non_medical_rejected(self, patient_token):
        pdf = _make_pdf_bytes(NON_MEDICAL_PDF_TEXT)
        files = {"file": ("marksheet.pdf", pdf, "application/pdf")}
        r = requests.post(f"{API}/reports/upload", headers=_auth(patient_token),
                         data={"report_type": "LAB_REPORT"}, files=files, timeout=30)
        assert r.status_code == 422, r.text
        detail = r.json().get("detail", {})
        assert isinstance(detail, dict)
        assert detail.get("message") == (
            "This document does not appear to be a medical report. Please upload a valid medical report."
        )

    def test_upload_medical_ok_and_processes(self, patient_token):
        pdf = _make_pdf_bytes(MEDICAL_PDF_TEXT)
        files = {"file": ("labreport.pdf", pdf, "application/pdf")}
        r = requests.post(f"{API}/reports/upload", headers=_auth(patient_token),
                         data={"report_type": "LAB_REPORT"}, files=files, timeout=45)
        assert r.status_code == 200, r.text
        report_id = r.json()["report"]["id"]

        # Poll status up to ~30s
        final = None
        for _ in range(15):
            g = requests.get(f"{API}/reports/{report_id}", headers=_auth(patient_token), timeout=10)
            assert g.status_code == 200
            status = g.json()["report"]["status"]
            final = status
            if status in ("COMPLETED", "FAILED"):
                break
            time.sleep(2)
        assert final in ("COMPLETED", "FAILED"), f"final status {final}"

        # OCR endpoint
        o = requests.get(f"{API}/reports/{report_id}/ocr", headers=_auth(patient_token), timeout=10)
        assert o.status_code == 200
        assert o.json()["unverified"] is True

    def test_list_reports(self, patient_token):
        r = requests.get(f"{API}/reports", headers=_auth(patient_token), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json()["reports"], list)

    def test_get_report_404_for_unknown(self, patient_token):
        r = requests.get(f"{API}/reports/{uuid.uuid4()}", headers=_auth(patient_token), timeout=10)
        assert r.status_code == 404


# ---------- Doctor / isolation ----------
class TestDoctor:
    def test_doctor_list_patients(self, doctor_token):
        r = requests.get(f"{API}/doctor/patients", headers=_auth(doctor_token), timeout=10)
        assert r.status_code == 200
        patients = r.json()["patients"]
        assert any(p["name"] == "Ravi Kumar" for p in patients)

    def test_patient_forbidden_on_doctor_endpoint(self, patient_token):
        r = requests.get(f"{API}/doctor/patients", headers=_auth(patient_token), timeout=10)
        assert r.status_code == 403

    def test_doctor_forbidden_on_patient_dashboard(self, doctor_token):
        r = requests.get(f"{API}/patient/dashboard", headers=_auth(doctor_token), timeout=10)
        assert r.status_code == 403


# ---------- Insights ----------
class TestInsights:
    def test_insights(self, patient_token):
        r = requests.get(f"{API}/insights", headers=_auth(patient_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "insights" in d or "counts" in d or "disclaimer" in d


# ---------- Regression: legacy web docs endpoint ----------
class TestLegacyDocuments:
    def test_legacy_list(self):
        r = requests.get(f"{API}/documents", params={"patient_id": "regression-test"}, timeout=10)
        # Should not 404 the whole endpoint; may return empty list
        assert r.status_code in (200, 400, 422)
