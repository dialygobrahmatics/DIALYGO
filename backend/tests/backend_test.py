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
class TestSendOtpByUserCode:
    def test_known_user_code_returns_masked_destinations(self):
        r = requests.post(f"{API}/auth/send-otp", json={"user_code": "doc-0071"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["mobileNumber"] == "XXXXXX0001" and data["email"].endswith("@example.com")
        assert "***" in data["email"]

    def test_unknown_user_code_is_404(self):
        r = requests.post(f"{API}/auth/send-otp", json={"user_code": "NOPE-0000"}, timeout=15)
        assert r.status_code == 404

    def test_user_type_must_match_the_account(self):
        ok = requests.post(f"{API}/auth/send-otp", json={"user_code": "DOC-0071", "user_type": "DOCTOR"}, timeout=15)
        bad = requests.post(f"{API}/auth/send-otp", json={"user_code": "DOC-0071", "user_type": "PATIENT"}, timeout=15)
        assert ok.status_code == 200 and bad.status_code == 404

    def test_requires_exactly_one_identifier(self):
        assert requests.post(f"{API}/auth/send-otp", json={}, timeout=15).status_code == 422
        both = {"user_code": "DOC-0071", "mobile_number": DOCTOR_MOBILE}
        assert requests.post(f"{API}/auth/send-otp", json=both, timeout=15).status_code == 422


class TestProfileContactChange:
    """Email and mobile number updates use fresh patients so the seeded account is never changed."""

    @staticmethod
    def _new_patient() -> dict:
        mobile = _new_mobile()
        otp = requests.post(f"{API}/auth/send-otp", json={"mobile_number": mobile}, timeout=15).json().get("devOtp") or FIXED_OTP
        r = requests.post(f"{API}/auth/signup", timeout=15, json={
            "user_type": "PATIENT", "name": "Contact Test", "mobile_number": mobile, "otp": otp,
            "aadhaar_number": str(uuid.uuid4().int)[:12]})
        assert r.status_code == 201, r.text
        return {"mobile": mobile, "headers": _auth(r.json()["accessToken"]), "code": r.json()["userCode"]}

    def test_email_update_clear_and_validation(self):
        p = self._new_patient()
        url = f"{API}/patient/profile"
        r = requests.patch(url, headers=p["headers"], json={"email": " New.Mail@Example.com "}, timeout=10)
        assert r.status_code == 200 and r.json()["account"]["email"] == "new.mail@example.com"
        assert requests.patch(url, headers=p["headers"], json={"email": "not-an-email"}, timeout=10).status_code == 400
        other = self._new_patient()
        assert requests.patch(url, headers=other["headers"], json={"email": "NEW.mail@example.com"}, timeout=10).status_code == 409
        cleared = requests.patch(url, headers=p["headers"], json={"email": ""}, timeout=10)
        assert cleared.status_code == 200 and cleared.json()["account"]["email"] is None

    def test_mobile_change_needs_no_otp_and_moves_sign_in(self):
        p = self._new_patient()
        url, new_mobile = f"{API}/patient/profile", _new_mobile()
        r = requests.patch(url, headers=p["headers"], json={"mobile_number": new_mobile}, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["account"]["mobileNumber"] == new_mobile
        # sign-in by user code now targets the new number
        sent = requests.post(f"{API}/auth/send-otp", json={"user_code": p["code"]}, timeout=15).json()
        assert sent["mobileNumber"] == f"XXXXXX{new_mobile[-4:]}"

    def test_mobile_change_rejects_taken_and_invalid_numbers(self):
        p = self._new_patient()
        url = f"{API}/patient/profile"
        assert requests.patch(url, headers=p["headers"], json={"mobile_number": "12345"}, timeout=10).status_code == 400
        assert requests.patch(url, headers=p["headers"], json={"mobile_number": PATIENT_MOBILE}, timeout=10).status_code == 409

    def test_same_mobile_number_needs_no_otp(self):
        p = self._new_patient()
        r = requests.patch(f"{API}/patient/profile", headers=p["headers"], json={"mobile_number": p["mobile"]}, timeout=10)
        assert r.status_code == 200


class TestSignup:
    def _otp(self, mobile):
        r = requests.post(f"{API}/auth/send-otp", json={"mobile_number": mobile}, timeout=15)
        assert r.status_code == 200
        return r.json().get("devOtp") or FIXED_OTP

    def _signup(self, body):
        return requests.post(f"{API}/auth/signup", json=body, timeout=15)

    def test_patient_signup_returns_token(self):
        mobile = _new_mobile()
        aadhaar = str(uuid.uuid4().int)[:12]
        r = self._signup({"user_type": "PATIENT", "name": "Test Patient", "mobile_number": mobile,
                          "otp": self._otp(mobile), "aadhaar_number": aadhaar})
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["status"] == "ACTIVE" and data["userCode"].startswith("DUR-PT-") and data["accessToken"]

    def test_signup_stores_master_details_and_consents(self):
        mobile = _new_mobile()
        r = self._signup({"user_type": "PATIENT", "name": "Detail Patient", "mobile_number": mobile,
                          "otp": self._otp(mobile), "aadhaar_number": str(uuid.uuid4().int)[:12],
                          "blood_group": "ab+", "emergency_contact": "Kin - 90000 22222", "occupation": "Driver",
                          "consent_data_sharing": True, "consent_privacy_notice": True})
        assert r.status_code == 201, r.text
        d = requests.get(f"{API}/patient/profile", headers=_auth(r.json()["accessToken"]), timeout=10).json()
        assert d["details"] == {"bloodGroup": "AB+", "emergencyContact": "Kin - 90000 22222",
                                "knownAllergies": None, "occupation": "Driver"}
        assert d["consents"]["dataSharing"] and d["consents"]["privacyNotice"] and not d["consents"]["research"]
        assert d["consents"]["updatedAt"]

    def test_signup_rejects_invalid_blood_group_without_burning_the_otp(self):
        mobile = _new_mobile()
        otp = self._otp(mobile)
        body = {"user_type": "OPERATOR", "name": "Bad Blood", "mobile_number": mobile, "otp": otp, "blood_group": "Z+"}
        assert self._signup(body).status_code == 400
        assert self._signup({**body, "blood_group": "O+"}).status_code == 201

    def test_operator_signup_is_pending_and_cannot_sign_in(self):
        mobile = _new_mobile()
        r = self._signup({"user_type": "OPERATOR", "name": "Test Operator", "mobile_number": mobile,
                          "otp": self._otp(mobile)})
        assert r.status_code == 201, r.text
        assert r.json()["status"] == "PENDING_APPROVAL" and "accessToken" not in r.json()
        requests.post(f"{API}/auth/send-otp", json={"mobile_number": mobile}, timeout=15)
        v = requests.post(f"{API}/auth/verify-otp", json={"mobile_number": mobile, "otp": FIXED_OTP}, timeout=15)
        assert v.status_code == 403

    def test_duplicate_mobile_conflicts(self):
        r = self._signup({"user_type": "OPERATOR", "name": "Dup", "mobile_number": PATIENT_MOBILE,
                          "otp": self._otp(PATIENT_MOBILE)})
        assert r.status_code == 409

    def test_wrong_otp_and_missing_fields_rejected(self):
        mobile = _new_mobile()
        self._otp(mobile)
        assert self._signup({"user_type": "OPERATOR", "name": "Bad Otp", "mobile_number": mobile,
                             "otp": "000000"}).status_code == 400
        assert self._signup({"user_type": "DOCTOR", "name": "No Reg", "mobile_number": mobile,
                             "otp": FIXED_OTP}).status_code == 400
        assert self._signup({"user_type": "PATIENT", "name": "No Aadhaar", "mobile_number": mobile,
                             "otp": FIXED_OTP}).status_code == 400


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

    def test_profile_returns_master_details_and_consents(self, patient_token):
        d = requests.get(f"{API}/patient/profile", headers=_auth(patient_token), timeout=10).json()
        assert d["account"]["userCode"] == "DUR-PT-00218"
        assert d["account"]["mobileNumber"] == PATIENT_MOBILE and d["account"]["email"] == "ravi.kumar@example.com"
        assert set(d["details"]) == {"bloodGroup", "emergencyContact", "knownAllergies", "occupation"}
        assert set(d["consents"]) == {"dataSharing", "privacyNotice", "research", "updatedAt"}

    def test_update_master_details_and_consents(self, patient_token):
        url, headers = f"{API}/patient/profile", _auth(patient_token)
        before = requests.get(url, headers=headers, timeout=10).json()
        try:
            r = requests.patch(url, headers=headers, timeout=10, json={
                "blood_group": " o- ", "emergency_contact": "Test Person - 90000 11111",
                "known_allergies": "", "occupation": "Engineer", "consent_research": True})
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["details"] == {"bloodGroup": "O-", "emergencyContact": "Test Person - 90000 11111",
                                    "knownAllergies": None, "occupation": "Engineer"}
            assert d["consents"]["research"] is True and d["consents"]["updatedAt"]
            # omitted fields are untouched, and the change persists
            again = requests.get(url, headers=headers, timeout=10).json()
            assert again["consents"]["dataSharing"] == before["consents"]["dataSharing"]
            assert again["details"]["occupation"] == "Engineer"
        finally:
            requests.patch(url, headers=headers, timeout=10, json={
                "blood_group": before["details"]["bloodGroup"] or "",
                "emergency_contact": before["details"]["emergencyContact"] or "",
                "known_allergies": before["details"]["knownAllergies"] or "",
                "occupation": before["details"]["occupation"] or "",
                "consent_research": before["consents"]["research"]})

    def test_update_rejects_invalid_values(self, patient_token):
        url, headers = f"{API}/patient/profile", _auth(patient_token)
        assert requests.patch(url, headers=headers, json={"blood_group": "Z+"}, timeout=10).status_code == 400
        assert requests.patch(url, headers=headers, json={"occupation": "x" * 151}, timeout=10).status_code == 400
        assert requests.patch(url, headers=headers, json={"consent_research": "maybe"}, timeout=10).status_code == 422

    def test_doctor_cannot_use_patient_profile(self, doctor_token):
        assert requests.get(f"{API}/patient/profile", headers=_auth(doctor_token), timeout=10).status_code == 403

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
