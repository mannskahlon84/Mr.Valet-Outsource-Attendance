import re
from datetime import datetime
from typing import Dict, Any, Optional

# ISO 3166-1 numeric country codes commonly present in Qatar ID
QATAR_ID_COUNTRIES: Dict[str, str] = {
    "634": "Qatar",
    "356": "India",
    "586": "Pakistan",
    "524": "Nepal",
    "050": "Bangladesh",
    "608": "Philippines",
    "144": "Sri Lanka",
    "818": "Egypt",
    "400": "Jordan",
    "729": "Sudan",
    "422": "Lebanon",
    "760": "Syria",
    "414": "Kuwait",
    "682": "Saudi Arabia",
    "784": "United Arab Emirates",
    "512": "Oman",
    "048": "Bahrain",
    "887": "Yemen",
    "504": "Morocco",
    "788": "Tunisia",
    "012": "Algeria",
    "434": "Libya",
    "231": "Ethiopia",
    "404": "Kenya",
    "800": "Uganda",
    "566": "Nigeria",
    "288": "Ghana",
    "716": "Zimbabwe",
    "710": "South Africa",
    "834": "Tanzania",
    "646": "Rwanda",
    "706": "Somalia",
    "840": "United States",
    "826": "United Kingdom",
    "124": "Canada",
    "036": "Australia",
    "276": "Germany",
    "250": "France",
    "380": "Italy",
    "724": "Spain",
    "804": "Ukraine",
    "643": "Russia",
    "792": "Turkey",
    "364": "Iran",
    "368": "Iraq",
    "156": "China",
    "392": "Japan",
    "410": "South Korea",
    "360": "Indonesia",
    "458": "Malaysia",
    "764": "Thailand",
    "704": "Vietnam",
}

def validate_qatar_id(qid: Optional[str]) -> Dict[str, Any]:
    """
    Validates a Qatar ID (QID) according to the official Ministry of Interior (MOI) rules:
    - 11 digits numeric only.
    - Digit 1: Century of birth (2 for 1900-1999, 3 for 2000-2099).
    - Digits 2-3: Birth year in century.
    - Digits 4-6: ISO 3166-1 numeric country code.
    - Digits 7-11: 5-digit sequence number.
    - Anti-bogus filters: rejects all-repeating digits, sequential runs, invalid ages.
    """
    if not qid:
        return {
            "is_valid": False,
            "error_message": "QID cannot be empty.",
            "birth_year": None,
            "age": None,
            "nationality": None,
            "country_code": None
        }

    cleaned = str(qid).strip().replace(" ", "").replace("-", "")

    # 1. Length & numeric check
    if not re.fullmatch(r"\d{11}", cleaned):
        return {
            "is_valid": False,
            "error_message": f"Qatar ID must be exactly 11 numeric digits (received {len(cleaned)} digits).",
            "birth_year": None,
            "age": None,
            "nationality": None,
            "country_code": None
        }

    # 2. Anti-bogus check: all same digits (e.g. 11111111111, 22222222222, 99999999999, 00000000000)
    if len(set(cleaned)) == 1:
        return {
            "is_valid": False,
            "error_message": "Invalid QID: Dummy repeating digits detected.",
            "birth_year": None,
            "age": None,
            "nationality": None,
            "country_code": None
        }

    # 3. Anti-bogus check: sequential numbers (e.g. 12345678901, 01234567890, 98765432109)
    if cleaned in "012345678901" or cleaned in "987654321098":
        return {
            "is_valid": False,
            "error_message": "Invalid QID: Dummy sequential digits pattern detected.",
            "birth_year": None,
            "age": None,
            "nationality": None,
            "country_code": None
        }

    # 4. First digit: Century of birth
    century_digit = cleaned[0]
    if century_digit not in ("2", "3"):
        return {
            "is_valid": False,
            "error_message": f"Invalid QID century digit '{century_digit}'. Qatar IDs must begin with 2 (born 1900-1999) or 3 (born 2000-2099).",
            "birth_year": None,
            "age": None,
            "nationality": None,
            "country_code": None
        }

    # 5. Birth year & working age verification
    year_prefix = 1900 if century_digit == "2" else 2000
    birth_year = year_prefix + int(cleaned[1:3])
    current_year = datetime.utcnow().year  # e.g. 2026

    estimated_age = current_year - birth_year

    if estimated_age < 18:
        return {
            "is_valid": False,
            "error_message": f"Invalid QID: Driver estimated age is {estimated_age} years (born {birth_year}). Qatar labor law requires minimum working age of 18.",
            "birth_year": birth_year,
            "age": estimated_age,
            "nationality": None,
            "country_code": None
        }

    if estimated_age > 65:
        return {
            "is_valid": False,
            "error_message": f"Invalid QID: Driver estimated age is {estimated_age} years (born {birth_year}). Exceeds standard Qatar labor visa threshold.",
            "birth_year": birth_year,
            "age": estimated_age,
            "nationality": None,
            "country_code": None
        }

    # 6. Country code (digits 4 to 6)
    country_code = cleaned[3:6]
    if country_code == "000":
        return {
            "is_valid": False,
            "error_message": "Invalid QID: Country code cannot be '000'.",
            "birth_year": birth_year,
            "age": estimated_age,
            "nationality": None,
            "country_code": country_code
        }

    nationality = QATAR_ID_COUNTRIES.get(country_code, f"International (Code {country_code})")

    # 7. Sequence number (digits 7 to 11)
    sequence_part = cleaned[6:11]
    if sequence_part == "00000":
        return {
            "is_valid": False,
            "error_message": "Invalid QID: Sequence number cannot be all zeros.",
            "birth_year": birth_year,
            "age": estimated_age,
            "nationality": nationality,
            "country_code": country_code
        }

    # Excessive repeated sequence in last 5 digits
    if len(set(sequence_part)) == 1:
        return {
            "is_valid": False,
            "error_message": "Invalid QID: Sequence suffix cannot contain identical repeating digits.",
            "birth_year": birth_year,
            "age": estimated_age,
            "nationality": nationality,
            "country_code": country_code
        }

    return {
        "is_valid": True,
        "error_message": None,
        "cleaned_qid": cleaned,
        "birth_year": birth_year,
        "age": estimated_age,
        "nationality": nationality,
        "country_code": country_code,
        "summary": f"Valid Qatar ID • {nationality} (Born {birth_year}, Age {estimated_age})"
    }
