// ISO 3166-1 Numeric Country Code Map commonly present in Qatar QID records
export const QID_COUNTRY_CODES: Record<string, string> = {
    "634": "Qatar",
    "356": "India",
    "586": "Pakistan",
    "524": "Nepal",
    "050": "Bangladesh",
    "144": "Sri Lanka",
    "608": "Philippines",
    "818": "Egypt",
    "404": "Kenya",
    "800": "Uganda",
    "288": "Ghana",
    "566": "Nigeria",
    "231": "Ethiopia",
    "729": "Sudan",
    "760": "Syria",
    "400": "Jordan",
    "422": "Lebanon",
    "788": "Tunisia",
    "504": "Morocco",
    "887": "Yemen",
    "840": "United States",
    "826": "United Kingdom",
    "784": "United Arab Emirates",
    "682": "Saudi Arabia",
    "512": "Oman",
    "048": "Bahrain",
    "414": "Kuwait",
    "392": "Japan",
    "156": "China",
    "360": "Indonesia",
    "704": "Vietnam"
};

export interface QidValidationResult {
    isValid: boolean;
    errorMessage: string | null;
    cleanedQid: string;
    birthYear?: number;
    age?: number;
    countryCode?: string;
    nationality?: string;
    summary?: string;
}

export function validateQatarIdClient(rawQid: string): QidValidationResult {
    if (!rawQid) {
        return {
            isValid: false,
            errorMessage: "Qatar ID (QID) is required.",
            cleanedQid: ""
        };
    }

    const cleaned = rawQid.trim().replace(/\s+/g, "");

    if (!/^\d+$/.test(cleaned)) {
        return {
            isValid: false,
            errorMessage: "Qatar ID must contain digits only.",
            cleanedQid: cleaned
        };
    }

    if (cleaned.length !== 11) {
        return {
            isValid: false,
            errorMessage: `QID must be exactly 11 digits (currently ${cleaned.length} digits).`,
            cleanedQid: cleaned
        };
    }

    // Anti-bogus check: repeating identical digits (e.g. 11111111111, 22222222222)
    if (new Set(cleaned.split("")).size === 1) {
        return {
            isValid: false,
            errorMessage: "Invalid QID: Dummy repeating digits detected.",
            cleanedQid: cleaned
        };
    }

    // Anti-bogus: sequential ascending/descending
    if (cleaned === "12345678901" || cleaned === "01234567890" || cleaned === "98765432109") {
        return {
            isValid: false,
            errorMessage: "Invalid QID: Dummy sequential digits detected.",
            cleanedQid: cleaned
        };
    }

    // Century indicator
    const centuryDigit = cleaned[0];
    let centuryBase = 0;
    if (centuryDigit === "2") {
        centuryBase = 1900;
    } else if (centuryDigit === "3") {
        centuryBase = 2000;
    } else {
        return {
            isValid: false,
            errorMessage: "Invalid century indicator (First digit of QID must be '2' for 1900s or '3' for 2000s).",
            cleanedQid: cleaned
        };
    }

    // Year of birth
    const yy = parseInt(cleaned.slice(1, 3), 10);
    const birthYear = centuryBase + yy;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    if (age < 18) {
        return {
            isValid: false,
            errorMessage: `Employee estimated age is ${age} years (born ${birthYear}). Qatar labor law requires minimum working age of 18.`,
            cleanedQid: cleaned,
            birthYear,
            age
        };
    }

    if (age > 65) {
        return {
            isValid: false,
            errorMessage: `Employee estimated age is ${age} years (born ${birthYear}). Working visa age limit exceeded (>65).`,
            cleanedQid: cleaned,
            birthYear,
            age
        };
    }

    // ISO country code (digits 4-6)
    const countryCode = cleaned.slice(3, 6);
    const nationality = QID_COUNTRY_CODES[countryCode] || `Country Code ${countryCode}`;

    // Sequence check (last 5 digits)
    const seq = cleaned.slice(6);
    if (seq === "00000") {
        return {
            isValid: false,
            errorMessage: "Invalid QID: Serial sequence cannot be all zeros.",
            cleanedQid: cleaned
        };
    }

    return {
        isValid: true,
        errorMessage: null,
        cleanedQid: cleaned,
        birthYear,
        age,
        countryCode,
        nationality,
        summary: `Valid QID • ${nationality} (Born ${birthYear}, Age ${age})`
    };
}
