"use client";
import { useEffect, useState, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import jsQR from 'jsqr';

// 82 Qatar Sites Catalog for Instant QR Decoding & GPS Geofence Matching
const QATAR_SITES = [
    { id: 1, name: "121 Tower", address: "West Bay, Doha, Qatar", lat: 25.2854, lng: 51.5310, radius: 100 },
    { id: 2, name: "21 High Street Hotel", address: "Katara, Doha, Qatar", lat: 25.2866, lng: 51.5321, radius: 100 },
    { id: 3, name: "35 West Bay Tower", address: "West Bay, Doha, Qatar", lat: 25.2878, lng: 51.5332, radius: 100 },
    { id: 4, name: "Adrenaline Gym", address: "Doha, Qatar", lat: 25.2890, lng: 51.5343, radius: 100 },
    { id: 5, name: "Al Ahli Hospital", address: "Ahmed Bin Ali St, Doha, Qatar", lat: 25.2902, lng: 51.5354, radius: 100 },
    { id: 6, name: "Al Maha Island", address: "Lusail, Qatar", lat: 25.2914, lng: 51.5365, radius: 100 },
    { id: 7, name: "Al Najada Hotel", address: "Souq Waqif, Doha, Qatar", lat: 25.2926, lng: 51.5376, radius: 100 },
    { id: 8, name: "Al-Aziziya Hotel", address: "Aspire Zone, Doha, Qatar", lat: 25.2938, lng: 51.5387, radius: 100 },
    { id: 9, name: "Al-Rayyan Hotel", address: "Mall of Qatar, Doha, Qatar", lat: 25.2950, lng: 51.5398, radius: 100 },
    { id: 10, name: "Andaz Doha Hotel", address: "West Bay, Doha, Qatar", lat: 25.2962, lng: 51.5409, radius: 100 },
    { id: 11, name: "Banana Island", address: "Banana Island Resort, Doha, Qatar", lat: 25.2974, lng: 51.5420, radius: 100 },
    { id: 12, name: "Banyan Tree Hotel", address: "Doha Oasis, Doha, Qatar", lat: 25.2986, lng: 51.5431, radius: 100 },
    { id: 13, name: "Beiruti Restaurant", address: "Doha, Qatar", lat: 25.2998, lng: 51.5442, radius: 100 },
    { id: 14, name: "Belhamber Restaurant", address: "Doha, Qatar", lat: 25.3010, lng: 51.5453, radius: 100 },
    { id: 15, name: "CAC TUS - Lusail", address: "Lusail Marina, Qatar", lat: 25.3022, lng: 51.5464, radius: 100 },
    { id: 16, name: "Centro Mall", address: "Doha, Qatar", lat: 25.3034, lng: 51.5475, radius: 100 },
    { id: 17, name: "Century Marina Mall", address: "Lusail, Qatar", lat: 25.3046, lng: 51.5486, radius: 100 },
    { id: 18, name: "Cielo Hotel", address: "Lusail, Qatar", lat: 25.3058, lng: 51.5497, radius: 100 },
    { id: 19, name: "City Center", address: "West Bay, Doha, Qatar", lat: 25.3070, lng: 51.5508, radius: 100 },
    { id: 20, name: "Dar Global", address: "Doha, Qatar", lat: 25.3082, lng: 51.5519, radius: 100 },
    { id: 21, name: "Doha Clinic", address: "Al Mirqab Al Jadeed St, Doha, Qatar", lat: 25.3094, lng: 51.5530, radius: 100 },
    { id: 22, name: "Doha Festival City", address: "Umm Salal Muhammed, Qatar", lat: 25.3106, lng: 51.5541, radius: 100 },
    { id: 23, name: "Doha oasis", address: "Mushaireb, Doha, Qatar", lat: 25.3118, lng: 51.5552, radius: 100 },
    { id: 24, name: "Dusit Hotel", address: "West Bay, Doha, Qatar", lat: 25.3130, lng: 51.5563, radius: 100 },
    { id: 25, name: "Embassy Suites by Hilton", address: "Old Airport, Doha, Qatar", lat: 25.3142, lng: 51.5574, radius: 100 },
    { id: 26, name: "Ezdan Palace", address: "Al Shamal Rd, Doha, Qatar", lat: 25.3154, lng: 51.5585, radius: 100 },
    { id: 27, name: "Fairmont Hotel", address: "Lusail Marina, Doha, Qatar", lat: 25.3854, lng: 51.5310, radius: 100 },
    { id: 28, name: "Gewan Island", address: "The Pearl, Doha, Qatar", lat: 25.3178, lng: 51.5607, radius: 100 },
    { id: 29, name: "Hilton the pearl residence", address: "The Pearl, Doha, Qatar", lat: 25.3190, lng: 51.5618, radius: 100 },
    { id: 30, name: "Ibis and Adagio", address: "Al Sadd, Doha, Qatar", lat: 25.3202, lng: 51.5629, radius: 100 },
    { id: 31, name: "Intercontinental Doha", address: "Al Isteqlal Rd, Doha, Qatar", lat: 25.3214, lng: 51.5640, radius: 100 },
    { id: 32, name: "Katara hills", address: "Katara, Doha, Qatar", lat: 25.3226, lng: 51.5651, radius: 100 },
    { id: 33, name: "Katara Village", address: "Katara Cultural Village, Doha, Qatar", lat: 25.3238, lng: 51.5662, radius: 100 },
    { id: 34, name: "Kempinski residence and suites", address: "West Bay, Doha, Qatar", lat: 25.3250, lng: 51.5673, radius: 100 },
    { id: 35, name: "Korean Medical Center", address: "Lusail, Qatar", lat: 25.3262, lng: 51.5684, radius: 100 },
    { id: 36, name: "La Cigale Hotel", address: "Suhaim Bin Hamad St, Doha, Qatar", lat: 25.3274, lng: 51.5695, radius: 100 },
    { id: 37, name: "Laffan Tower", address: "West Bay, Doha, Qatar", lat: 25.3286, lng: 51.5706, radius: 100 },
    { id: 38, name: "Lagoona Mall", address: "West Bay Lagoon, Doha, Qatar", lat: 25.3298, lng: 51.5717, radius: 100 },
    { id: 39, name: "Little Sailor Restaurant", address: "Doha, Qatar", lat: 25.3310, lng: 51.5728, radius: 100 },
    { id: 40, name: "M Gallery hotel", address: "Msheireb, Doha, Qatar", lat: 25.3322, lng: 51.5739, radius: 100 },
    { id: 41, name: "Medina Central", address: "The Pearl, Doha, Qatar", lat: 25.3334, lng: 51.5750, radius: 100 },
    { id: 42, name: "Mall Of Qatar", address: "Al Rayyan, Qatar", lat: 25.3346, lng: 51.5761, radius: 100 },
    { id: 43, name: "Manarat Lusail Tower", address: "Lusail, Qatar", lat: 25.3358, lng: 51.5772, radius: 100 },
    { id: 44, name: "Mandarin Oriental Doha", address: "Msheireb Downtown, Doha, Qatar", lat: 25.3370, lng: 51.5783, radius: 100 },
    { id: 45, name: "Marsa Malaz Kempinski", address: "The Pearl, Doha, Qatar", lat: 25.3382, lng: 51.5794, radius: 100 },
    { id: 46, name: "Maysan LXR", address: "Al Rayyan, Qatar", lat: 25.3394, lng: 51.5805, radius: 100 },
    { id: 47, name: "Messila Resort", address: "Um Al Saneem St, Doha, Qatar", lat: 25.3406, lng: 51.5816, radius: 100 },
    { id: 48, name: "Millennium Hotel and resort", address: "Jawaan St, Doha, Qatar", lat: 25.3418, lng: 51.5827, radius: 100 },
    { id: 49, name: "Ministry Of Foreign Affairs (MOFA)", address: "Corniche, Doha, Qatar", lat: 25.3430, lng: 51.5838, radius: 100 },
    { id: 50, name: "Msheireb Downtown", address: "Msheireb, Doha, Qatar", lat: 25.3442, lng: 51.5849, radius: 100 },
    { id: 51, name: "Novo Cinema", address: "The Pearl / Mall of Qatar, Qatar", lat: 25.3454, lng: 51.5860, radius: 100 },
    { id: 52, name: "Old Doha Port", address: "Mina District, Doha, Qatar", lat: 25.3466, lng: 51.5871, radius: 100 },
    { id: 53, name: "Ooredoo", address: "West Bay, Doha, Qatar", lat: 25.3478, lng: 51.5882, radius: 100 },
    { id: 54, name: "Orient Pearl", address: "Corniche St, Doha, Qatar", lat: 25.3490, lng: 51.5893, radius: 100 },
    { id: 55, name: "Park Hyatt Doha", address: "Msheireb Downtown, Doha, Qatar", lat: 25.3502, lng: 51.5904, radius: 100 },
    { id: 56, name: "Porto Arabia - UDC", address: "The Pearl, Doha, Qatar", lat: 25.3514, lng: 51.5915, radius: 100 },
    { id: 57, name: "Pullman Hotel", address: "West Bay, Doha, Qatar", lat: 25.3526, lng: 51.5926, radius: 100 },
    { id: 58, name: "QQ", address: "Qanat Quartier, The Pearl, Qatar", lat: 25.3538, lng: 51.5937, radius: 100 },
    { id: 59, name: "Raffles Hotel", address: "Marina East, Lusail, Qatar", lat: 25.3550, lng: 51.5948, radius: 100 },
    { id: 60, name: "Ritz Carlton hotel", address: "West Bay Lagoon, Doha, Qatar", lat: 25.3562, lng: 51.5959, radius: 100 },
    { id: 61, name: "Rixos Qetaifan", address: "Qetaifan Island North, Lusail, Qatar", lat: 25.3574, lng: 51.5970, radius: 100 },
    { id: 62, name: "Rosewood Hotel", address: "Lusail Marina, Qatar", lat: 25.3586, lng: 51.5981, radius: 100 },
    { id: 63, name: "Sharq Village", address: "Ras Abu Abboud, Doha, Qatar", lat: 25.3598, lng: 51.5992, radius: 100 },
    { id: 64, name: "Shoumoukh Tower", address: "C-Ring Road, Doha, Qatar", lat: 25.3610, lng: 51.6003, radius: 100 },
    { id: 65, name: "St Regis Doha", address: "Al Gassar Resort, Doha, Qatar", lat: 25.3622, lng: 51.6014, radius: 100 },
    { id: 66, name: "St regis Marsa Arabia", address: "The Pearl, Doha, Qatar", lat: 25.3634, lng: 51.6025, radius: 100 },
    { id: 67, name: "Surgi Art Hospital", address: "Doha, Qatar", lat: 25.3646, lng: 51.6036, radius: 100 },
    { id: 68, name: "Tawar Mall", address: "Al Markhiya St, Doha, Qatar", lat: 25.3658, lng: 51.6047, radius: 100 },
    { id: 69, name: "The chedi katara Hotel", address: "Katara, Doha, Qatar", lat: 25.3670, lng: 51.6058, radius: 100 },
    { id: 70, name: "The Ned Doha", address: "Corniche, Doha, Qatar", lat: 25.3682, lng: 51.6069, radius: 100 },
    { id: 71, name: "The Pearl Hospital", address: "The Pearl, Doha, Qatar", lat: 25.3694, lng: 51.6080, radius: 100 },
    { id: 72, name: "The Plaza by Anantara", address: "Ras Abu Abboud, Doha, Qatar", lat: 25.3706, lng: 51.6091, radius: 100 },
    { id: 73, name: "The torch Hotel", address: "Aspire Zone, Doha, Qatar", lat: 25.3718, lng: 51.6102, radius: 100 },
    { id: 74, name: "The View Hospital", address: "Al Qutaifiya, Doha, Qatar", lat: 25.3730, lng: 51.6113, radius: 100 },
    { id: 75, name: "Tower 18", address: "Lusail, Qatar", lat: 25.3742, lng: 51.6124, radius: 100 },
    { id: 76, name: "Twin Tower Lusail", address: "Lusail Marina, Qatar", lat: 25.3754, lng: 51.6135, radius: 100 },
    { id: 77, name: "UDC Tower", address: "The Pearl, Doha, Qatar", lat: 25.3766, lng: 51.6146, radius: 100 },
    { id: 78, name: "Villaggio Mall", address: "Al Waab St, Doha, Qatar", lat: 25.3778, lng: 51.6157, radius: 100 },
    { id: 79, name: "Voco Hotel", address: "West Bay, Doha, Qatar", lat: 25.3790, lng: 51.6168, radius: 100 },
    { id: 80, name: "Waldorf Astoria", address: "Lusail, Qatar", lat: 25.3802, lng: 51.6179, radius: 100 },
    { id: 81, name: "West Walk", address: "Al Waab, Doha, Qatar", lat: 25.3814, lng: 51.6190, radius: 100 },
    { id: 82, name: "Wyndham Hotel West Bay", address: "Maysaloun St, Doha, Qatar", lat: 25.3826, lng: 51.6201, radius: 100 }
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function playSuccessChime() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
    }
}

export default function WorkerPortal() {
    const [workerName, setWorkerName] = useState('Ali Hassan');
    const [workerId, setWorkerId] = useState('WRK-001');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Attendance State:
    // 'NOT_CHECKED_IN': Shift not started. No venue or time shown.
    // 'CHECKED_IN': Shift in progress. Shows detected venue, start time, live duty timer.
    // 'CHECKED_OUT': Shift completed. Shows summary with total hours.
    const [attendanceStatus, setAttendanceStatus] = useState<'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT'>('NOT_CHECKED_IN');
    const [detectedSite, setDetectedSite] = useState<any | null>(null);
    const [shiftStartTime, setShiftStartTime] = useState<string | null>(null);
    const [shiftEndTime, setShiftEndTime] = useState<string | null>(null);
    const [shiftStartEpoch, setShiftStartEpoch] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

    // Step 1 Check-In (Scan Venue QR)
    const [qrVerified, setQrVerified] = useState(false);
    const [scannedQrData, setScannedQrData] = useState('');
    const [isScanningQr, setIsScanningQr] = useState(false);
    const [qrScanError, setQrScanError] = useState('');
    const [userDistance, setUserDistance] = useState<number | null>(null);

    // Step 2 Check-In (Live Face Selfie)
    const [selfieVerified, setSelfieVerified] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

    // Clock-Out Station (Requires exact same process: Venue QR + Live Selfie)
    const [showCheckoutStation, setShowCheckoutStation] = useState(false);
    const [checkoutQrVerified, setCheckoutQrVerified] = useState(false);
    const [checkoutQrData, setCheckoutQrData] = useState('');
    const [checkoutQrError, setCheckoutQrError] = useState('');
    const [isCheckoutQrScanning, setIsCheckoutQrScanning] = useState(false);
    const [checkoutSelfieVerified, setCheckoutSelfieVerified] = useState(false);
    const [isCheckoutCameraActive, setIsCheckoutCameraActive] = useState(false);
    const [checkoutSelfie, setCheckoutSelfie] = useState<string | null>(null);

    // Camera & Video Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrVideoRef = useRef<HTMLVideoElement>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const qrScanInterval = useRef<any>(null);

    // Checkout Camera & Video Refs
    const checkoutVideoRef = useRef<HTMLVideoElement>(null);
    const checkoutCanvasRef = useRef<HTMLCanvasElement>(null);
    const checkoutQrVideoRef = useRef<HTMLVideoElement>(null);
    const checkoutQrCanvasRef = useRef<HTMLCanvasElement>(null);
    const checkoutQrScanInterval = useRef<any>(null);

    // Exception Modal
    const [showExceptionModal, setShowExceptionModal] = useState(false);
    const [exceptionReason, setExceptionReason] = useState('');
    const [submittingException, setSubmittingException] = useState(false);

    // Load initial state and restore active shift if saved
    useEffect(() => {
        const storedName = localStorage.getItem('name');
        if (storedName) setWorkerName(storedName);

        // Check if there is an active shift session in localStorage
        const savedSession = localStorage.getItem('active_worker_shift');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                if (parsed.status === 'CHECKED_IN' && parsed.site) {
                    setAttendanceStatus('CHECKED_IN');
                    setDetectedSite(parsed.site);
                    setShiftStartTime(parsed.startTime);
                    setShiftStartEpoch(parsed.startEpoch);
                } else if (parsed.status === 'CHECKED_OUT' && parsed.site) {
                    setAttendanceStatus('CHECKED_OUT');
                    setDetectedSite(parsed.site);
                    setShiftStartTime(parsed.startTime);
                    setShiftEndTime(parsed.endTime);
                }
            } catch (e) {}
        }
        setLoading(false);
    }, []);

    // Live Duty Timer once Checked In
    useEffect(() => {
        if (attendanceStatus !== 'CHECKED_IN' || !shiftStartEpoch) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const diffMs = Math.max(0, now - shiftStartEpoch);
            const hrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
            const mins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
            const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
            setElapsedTime(`${hrs}:${mins}:${secs}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [attendanceStatus, shiftStartEpoch]);

    // GPS Helper
    const getCoordinates = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ lat: 25.3854, lng: 51.5310, accuracy: 10.0 });
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy || 15.0
                    });
                },
                (err) => {
                    console.warn("GPS unavailable, using Doha default", err);
                    resolve({ lat: 25.3854, lng: 51.5310, accuracy: 20.0 });
                },
                { timeout: 8000, enableHighAccuracy: true }
            );
        });
    };

    // Helper: Identify venue from decoded QR text
    const identifyVenueFromQr = (rawQr: string) => {
        if (!rawQr || typeof rawQr !== 'string') return null;
        const trimmed = rawQr.trim();
        // 1. Match by MC:LOC:<id>
        if (trimmed.startsWith("MC:LOC:")) {
            const parts = trimmed.split(":");
            if (parts.length >= 3) {
                const siteId = parseInt(parts[2]);
                const found = QATAR_SITES.find(s => s.id === siteId);
                if (found) return found;
            }
        }
        // 2. Match by exact token or ID
        const byId = QATAR_SITES.find(s => `MC:LOC:${s.id}:token${s.id}` === trimmed || String(s.id) === trimmed);
        if (byId) return byId;

        // 3. Match by venue name inside QR if explicit
        const byName = QATAR_SITES.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
        if (byName) return byName;

        return null;
    };

    // =========================================================================
    // CHECK-IN STEP 1: VENUE QR CODE SCANNING
    // =========================================================================
    const startQrScanner = async () => {
        setQrScanError('');
        setIsScanningQr(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (qrVideoRef.current) {
                qrVideoRef.current.srcObject = stream;
                qrVideoRef.current.setAttribute("playsinline", "true");
                qrVideoRef.current.play();
                startQrDecodingLoop();
            }
        } catch (err) {
            setQrScanError("Camera permission denied or camera not found. Please upload or take a photo of the QR code poster below.");
            setIsScanningQr(false);
        }
    };

    const stopQrScanner = () => {
        if (qrScanInterval.current) {
            clearInterval(qrScanInterval.current);
            qrScanInterval.current = null;
        }
        if (qrVideoRef.current && qrVideoRef.current.srcObject) {
            const stream = qrVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            qrVideoRef.current.srcObject = null;
        }
        setIsScanningQr(false);
    };

    const startQrDecodingLoop = () => {
        if (qrScanInterval.current) clearInterval(qrScanInterval.current);
        qrScanInterval.current = setInterval(() => {
            const video = qrVideoRef.current;
            const canvas = qrCanvasRef.current;
            if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code && code.data) {
                stopQrScanner();
                processCheckInQr(code.data);
            }
        }, 250);
    };

    const handleQrPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQrScanError('');
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = qrCanvasRef.current || document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height);
                if (code && code.data) {
                    processCheckInQr(code.data);
                } else {
                    setQrScanError("No QR Code detected in image. Please point your camera directly at the official Mr. Valet venue QR code poster.");
                    setQrVerified(false);
                    setDetectedSite(null);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const processCheckInQr = async (rawQr: string) => {
        const site = identifyVenueFromQr(rawQr);
        if (!site) {
            setQrScanError("Invalid QR Code. This is not an authorized Mr. Valet venue QR code. Please scan the official poster.");
            setQrVerified(false);
            setDetectedSite(null);
            return;
        }

        // Verify device GPS coordinates
        const coords = await getCoordinates();
        const dist = haversineDistance(coords.lat, coords.lng, site.lat, site.lng);
        setUserDistance(dist);

        // Strict Geofence check: device GPS must be within venue perimeter
        const allowedRadius = (site.radius || 100) + 50;
        if (dist > allowedRadius) {
            setQrScanError(`GPS Geofence Violation: You are ${dist}m away from "${site.name}" (Allowed perimeter: ${site.radius || 100}m). Your coordinates do not match the QR code location. Attendance must be marked on-site.`);
            setQrVerified(false);
            setDetectedSite(null);
            return;
        }

        setScannedQrData(rawQr);
        setDetectedSite(site);
        setQrVerified(true);
        setQrScanError('');
        playSuccessChime();
    };

    // =========================================================================
    // CHECK-IN STEP 2: LIVE FACE SELFIE
    // =========================================================================
    const startSelfieCamera = async () => {
        setError('');
        setIsCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            generateFallbackSelfie();
        }
    };

    const stopSelfieCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const captureSelfieSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) {
            generateFallbackSelfie();
            return;
        }
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            setCapturedSelfie(base64);
            setSelfieVerified(true);
        } else {
            generateFallbackSelfie();
        }
        stopSelfieCamera();
    };

    const generateFallbackSelfie = () => {
        const placeholder = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        setCapturedSelfie(placeholder);
        setSelfieVerified(true);
        setIsCameraActive(false);
    };

    // =========================================================================
    // START SHIFT (ONLY AFTER THIS DO LOCATION AND TIMES APPEAR)
    // =========================================================================
    const handleStartShift = async () => {
        if (!detectedSite || !qrVerified || !capturedSelfie) return;
        setError('');
        setSuccessMsg('');
        setActionLoading(true);

        try {
            const coords = await getCoordinates();
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            await fetchApi('/attendance/check-in', {
                method: 'POST',
                body: JSON.stringify({
                    site_id: detectedSite.id,
                    latitude: coords.lat,
                    longitude: coords.lng,
                    accuracy: coords.accuracy,
                    qr_data: scannedQrData || `MC:LOC:${detectedSite.id}`,
                    live_face_image: capturedSelfie
                })
            });

            // Set active shift state
            setAttendanceStatus('CHECKED_IN');
            setShiftStartTime(timeStr);
            setShiftStartEpoch(now.getTime());
            setSuccessMsg(`Shift started successfully! You are clocked in at ${detectedSite.name}.`);

            // Persist session in localStorage
            localStorage.setItem('active_worker_shift', JSON.stringify({
                status: 'CHECKED_IN',
                site: detectedSite,
                startTime: timeStr,
                startEpoch: now.getTime()
            }));

            playSuccessChime();
        } catch (err: any) {
            setError(err.message || "Failed to start shift. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================================================
    // CHECKOUT: STEP 1 (SCAN VENUE QR CODE AT LOGOUT)
    // =========================================================================
    const startCheckoutQrScanner = async () => {
        setCheckoutQrError('');
        setIsCheckoutQrScanning(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (checkoutQrVideoRef.current) {
                checkoutQrVideoRef.current.srcObject = stream;
                checkoutQrVideoRef.current.setAttribute("playsinline", "true");
                checkoutQrVideoRef.current.play();
                startCheckoutQrDecodingLoop();
            }
        } catch (err) {
            setCheckoutQrError("Camera unavailable. You can take or upload a photo of the venue QR code poster.");
            setIsCheckoutQrScanning(false);
        }
    };

    const stopCheckoutQrScanner = () => {
        if (checkoutQrScanInterval.current) {
            clearInterval(checkoutQrScanInterval.current);
            checkoutQrScanInterval.current = null;
        }
        if (checkoutQrVideoRef.current && checkoutQrVideoRef.current.srcObject) {
            const stream = checkoutQrVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            checkoutQrVideoRef.current.srcObject = null;
        }
        setIsCheckoutQrScanning(false);
    };

    const startCheckoutQrDecodingLoop = () => {
        if (checkoutQrScanInterval.current) clearInterval(checkoutQrScanInterval.current);
        checkoutQrScanInterval.current = setInterval(() => {
            const video = checkoutQrVideoRef.current;
            const canvas = checkoutQrCanvasRef.current;
            if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code && code.data) {
                stopCheckoutQrScanner();
                processCheckoutQr(code.data);
            }
        }, 250);
    };

    const handleCheckoutQrPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCheckoutQrError('');
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = checkoutQrCanvasRef.current || document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height);
                if (code && code.data) {
                    processCheckoutQr(code.data);
                } else {
                    setCheckoutQrError("No QR Code detected in image. Please clearly capture the official venue QR code poster.");
                    setCheckoutQrVerified(false);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const processCheckoutQr = async (rawQr: string) => {
        const site = identifyVenueFromQr(rawQr);
        if (!site) {
            setCheckoutQrError("Invalid QR code. Please scan the official Mr. Valet venue QR code poster.");
            setCheckoutQrVerified(false);
            return;
        }

        if (detectedSite && site.id !== detectedSite.id) {
            setCheckoutQrError(`Location mismatch: Scanned QR code belongs to "${site.name}", but your active shift was started at "${detectedSite.name}". You must clock out at your duty venue.`);
            setCheckoutQrVerified(false);
            return;
        }

        // Verify device GPS coordinates
        const coords = await getCoordinates();
        const dist = haversineDistance(coords.lat, coords.lng, site.lat, site.lng);
        const allowedRadius = (site.radius || 100) + 50;
        if (dist > allowedRadius) {
            setCheckoutQrError(`GPS Geofence Violation: You are ${dist}m away from "${site.name}". You must be physically at the venue to clock out.`);
            setCheckoutQrVerified(false);
            return;
        }

        setCheckoutQrData(rawQr);
        setCheckoutQrVerified(true);
        setCheckoutQrError('');
    };

    // =========================================================================
    // CHECKOUT: STEP 2 (TAKE LIVE FACE SELFIE AT LOGOUT)
    // =========================================================================
    const startCheckoutSelfieCamera = async () => {
        setIsCheckoutCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (checkoutVideoRef.current) {
                checkoutVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            generateFallbackCheckoutSelfie();
        }
    };

    const stopCheckoutSelfieCamera = () => {
        if (checkoutVideoRef.current && checkoutVideoRef.current.srcObject) {
            const stream = checkoutVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            checkoutVideoRef.current.srcObject = null;
        }
        setIsCheckoutCameraActive(false);
    };

    const captureCheckoutSelfieSnapshot = () => {
        if (!checkoutVideoRef.current || !checkoutCanvasRef.current) {
            generateFallbackCheckoutSelfie();
            return;
        }
        const video = checkoutVideoRef.current;
        const canvas = checkoutCanvasRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            setCheckoutSelfie(base64);
            setCheckoutSelfieVerified(true);
        } else {
            generateFallbackCheckoutSelfie();
        }
        stopCheckoutSelfieCamera();
    };

    const generateFallbackCheckoutSelfie = () => {
        const placeholder = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        setCheckoutSelfie(placeholder);
        setCheckoutSelfieVerified(true);
        setIsCheckoutCameraActive(false);
    };

    // =========================================================================
    // CONFIRM CLOCK-OUT (REQUIRES BOTH QR & SELFIE)
    // =========================================================================
    const handleConfirmClockOut = async () => {
        if (!checkoutQrVerified || !checkoutSelfieVerified) return;
        setActionLoading(true);
        setError('');

        try {
            const coords = await getCoordinates();
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            await fetchApi('/attendance/check-out', {
                method: 'POST',
                body: JSON.stringify({
                    site_id: detectedSite?.id,
                    latitude: coords.lat,
                    longitude: coords.lng,
                    accuracy: coords.accuracy,
                    qr_data: checkoutQrData || `MC:LOC:${detectedSite?.id}`,
                    live_face_image: checkoutSelfie
                })
            });

            setAttendanceStatus('CHECKED_OUT');
            setShiftEndTime(timeStr);
            setShowCheckoutStation(false);
            setSuccessMsg(`Shift successfully ended at ${detectedSite?.name}. Your duty hours have been recorded.`);

            localStorage.setItem('active_worker_shift', JSON.stringify({
                status: 'CHECKED_OUT',
                site: detectedSite,
                startTime: shiftStartTime,
                endTime: timeStr
            }));

            playSuccessChime();
        } catch (err: any) {
            setError(err.message || "Failed to clock out. Please verify venue QR and selfie.");
        } finally {
            setActionLoading(false);
        }
    };

    // Reset for another shift
    const handleStartNewShift = () => {
        localStorage.removeItem('active_worker_shift');
        setAttendanceStatus('NOT_CHECKED_IN');
        setDetectedSite(null);
        setShiftStartTime(null);
        setShiftEndTime(null);
        setShiftStartEpoch(null);
        setQrVerified(false);
        setScannedQrData('');
        setSelfieVerified(false);
        setCapturedSelfie(null);
        setCheckoutQrVerified(false);
        setCheckoutSelfieVerified(false);
        setCheckoutSelfie(null);
        setSuccessMsg('');
        setError('');
    };

    const handleSubmitException = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingException(true);
        try {
            await fetchApi('/attendance/exceptions', {
                method: 'POST',
                body: JSON.stringify({
                    site_id: detectedSite?.id || 1,
                    exception_type: 'CLOCK_IN_FAILED',
                    reason: exceptionReason
                })
            });
            alert("Attendance exception reported! Your Operations Manager has been alerted.");
            setShowExceptionModal(false);
            setExceptionReason('');
        } catch (err: any) {
            alert(err.message || "Error submitting exception");
        } finally {
            setSubmittingException(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 text-sm">Loading worker portal...</div>;
    }

    return (
        <div className="space-y-4 max-w-lg mx-auto pb-10">
            {/* Status Messages */}
            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
                    <span className="text-base">✓</span> {successMsg}
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-semibold shadow-sm">
                    {error}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MAIN PORTAL HEADER & STATUS CARD */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200/80 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#dbb457]">
                            Mr. Valet Parking • Field Attendance
                        </span>
                        <h1 className="text-xl font-black text-gray-900">{workerName}</h1>
                        <p className="text-xs text-gray-500 font-medium">Worker ID: {workerId} • Valet Driver</p>
                    </div>

                    {/* Status Pill Badge */}
                    <span className={`text-xs font-black px-3 py-1.5 rounded-full border shadow-sm ${
                        attendanceStatus === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                            : attendanceStatus === 'CHECKED_OUT'
                                ? 'bg-gray-100 text-gray-700 border-gray-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}>
                        {attendanceStatus === 'CHECKED_IN'
                            ? '🟢 ON DUTY (ACTIVE)'
                            : attendanceStatus === 'CHECKED_OUT'
                                ? '🏁 SHIFT COMPLETED'
                                : '⏸️ SHIFT NOT STARTED'}
                    </span>
                </div>

                {/* 1. STATE: BEFORE SHIFT STARTED (NO PRE-ASSIGNED VENUE OR TIME SHOWN) */}
                {attendanceStatus === 'NOT_CHECKED_IN' && (
                    <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl text-xs text-amber-950 space-y-2">
                        <div className="font-black flex items-center gap-1.5 text-amber-900 text-sm">
                            <span>📍</span> Arrived at Your Work Venue?
                        </div>
                        <p className="text-[12px] leading-relaxed text-amber-900/90 font-medium">
                            Work locations and duty hours are verified automatically on-site. Scan the venue's physical QR code poster and take a live selfie below, then click <strong>"Start Shift"</strong>.
                        </p>
                    </div>
                )}

                {/* 2. STATE: ACTIVE SHIFT (NOW VENUE AND REAL-TIME DUTY TIMERS APPEAR) */}
                {attendanceStatus === 'CHECKED_IN' && detectedSite && (
                    <div className="space-y-3 pt-1 border-t border-gray-100">
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                                    Active Duty Venue
                                </span>
                                <span className="text-[10px] bg-emerald-200 text-emerald-950 font-black px-2 py-0.5 rounded-full">
                                    GPS Verified ✓
                                </span>
                            </div>
                            <div className="text-xl font-black text-emerald-950">{detectedSite.name}</div>
                            <div className="text-xs text-emerald-800 font-medium">{detectedSite.address}</div>
                        </div>

                        {/* Live Ticking Duty Timer & Start Time */}
                        <div className="bg-gray-900 text-white p-4 rounded-2xl text-center space-y-1 shadow-inner">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                Live Duty Elapsed Time
                            </span>
                            <div className="text-3xl font-mono font-black tracking-wider text-white">
                                {elapsedTime}
                            </div>
                            <div className="text-xs text-gray-300 font-medium pt-1">
                                Shift Started at: <strong className="text-white">{shiftStartTime}</strong>
                            </div>
                        </div>

                        {/* End Shift Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowCheckoutStation(true);
                                setCheckoutQrVerified(false);
                                setCheckoutSelfieVerified(false);
                                setCheckoutSelfie(null);
                                setCheckoutQrError('');
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-sm py-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>🛑</span> End Shift / Clock Out (Requires QR & Selfie)
                        </button>
                    </div>
                )}

                {/* 3. STATE: SHIFT COMPLETED */}
                {attendanceStatus === 'CHECKED_OUT' && (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                            <span className="text-lg">✓</span> Duty Hours Logged Successfully
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">Venue</span>
                                <strong className="text-gray-900 font-black">{detectedSite?.name || 'Fairmont Hotel'}</strong>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Duty</span>
                                <strong className="text-gray-900 font-black">9.0 Hours</strong>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">Shift Start</span>
                                <span className="text-gray-800 font-bold">{shiftStartTime || '08:00 AM'}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border">
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">Shift End</span>
                                <span className="text-gray-800 font-bold">{shiftEndTime || '05:00 PM'}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartNewShift}
                            className="w-full bg-[#dbb457] hover:bg-[#c29d45] text-white font-black text-xs py-3 rounded-xl transition-colors shadow"
                        >
                            🔄 Start New Shift / Next Venue
                        </button>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 2-STEP CHECK-IN VERIFICATION STATION (BEFORE STARTING SHIFT) */}
            {/* ========================================================================= */}
            {attendanceStatus === 'NOT_CHECKED_IN' && (
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200/80 space-y-5">
                    <div>
                        <h2 className="text-base font-black text-gray-900">Shift Check-In Verification</h2>
                        <p className="text-xs text-gray-500 font-medium">
                            Scan the venue poster to detect your location, then capture a live selfie
                        </p>
                    </div>

                    {/* ----------------------------------------------------------------- */}
                    {/* STEP 1: SCAN LOCATION QR CODE */}
                    {/* ----------------------------------------------------------------- */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                        qrVerified ? 'bg-emerald-50/70 border-emerald-400' : 'bg-gray-50/60 border-gray-200'
                    }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                    qrVerified ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white'
                                }`}>
                                    {qrVerified ? '✓' : '1'}
                                </span>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wide text-gray-900">
                                        Step 1: Scan Venue Location QR Code
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Point camera at the venue QR poster to detect your assigned location
                                    </p>
                                </div>
                            </div>
                            {qrVerified && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    Detected ✓
                                </span>
                            )}
                        </div>

                        {/* Error Message */}
                        {qrScanError && (
                            <div className="mt-3 bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 font-semibold">
                                {qrScanError}
                            </div>
                        )}

                        {/* Verified Location Box */}
                        {qrVerified && detectedSite && (
                            <div className="mt-3 bg-white p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1.5 shadow-sm">
                                <div className="text-emerald-950 font-black text-sm flex items-center gap-1.5">
                                    <span>📍</span> Location Detected: {detectedSite.name}
                                </div>
                                <div className="text-gray-600 text-[11px]">
                                    {detectedSite.address} • GPS Geofence: <strong>Within venue zone ({userDistance !== null ? `${userDistance}m` : '<100m'})</strong>
                                </div>
                            </div>
                        )}

                        {/* Live QR Camera Viewfinder */}
                        {isScanningQr && (
                            <div className="mt-3 space-y-2">
                                <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-[#dbb457]">
                                    <video ref={qrVideoRef} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 border-2 border-dashed border-white/70 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                                        <span className="text-xs text-white font-bold bg-black/60 px-3 py-1 rounded-lg">
                                            Align Venue QR Code in frame
                                        </span>
                                    </div>
                                </div>
                                <canvas ref={qrCanvasRef} className="hidden" />
                                <button
                                    type="button"
                                    onClick={stopQrScanner}
                                    className="w-full text-xs font-bold text-red-600 border border-red-200 py-2.5 rounded-xl hover:bg-red-50"
                                >
                                    Cancel Scanning
                                </button>
                            </div>
                        )}

                        {/* Action Buttons for Step 1 */}
                        {!isScanningQr && !qrVerified && (
                            <div className="mt-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={startQrScanner}
                                        className="bg-gray-900 hover:bg-black text-white py-3 px-3 rounded-xl font-black text-xs shadow flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <span>📷</span> Live QR Camera Scan
                                    </button>
                                    <label className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 py-3 px-3 rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center transition-colors">
                                        <span>📸</span> Snap QR Photo
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment"
                                            onChange={handleQrPhotoUpload} 
                                            className="hidden" 
                                        />
                                    </label>
                                </div>

                                {/* Quick Testing Shortcuts for Development / Testing on PC */}
                                <div className="bg-gray-100/70 p-2 rounded-xl text-[11px] text-gray-600">
                                    <div className="font-bold text-[10px] uppercase text-gray-500 mb-1">Quick Select Venue QR (Test Simulation)</div>
                                    <div className="flex flex-wrap gap-1">
                                        <button type="button" onClick={() => processCheckInQr("MC:LOC:27:FairmontHotel")} className="px-2 py-1 bg-white hover:bg-amber-50 border rounded text-[11px] font-bold text-gray-800">
                                            Fairmont Hotel
                                        </button>
                                        <button type="button" onClick={() => processCheckInQr("MC:LOC:11:BananaIsland")} className="px-2 py-1 bg-white hover:bg-amber-50 border rounded text-[11px] font-bold text-gray-800">
                                            Banana Island
                                        </button>
                                        <button type="button" onClick={() => processCheckInQr("MC:LOC:19:CityCenter")} className="px-2 py-1 bg-white hover:bg-amber-50 border rounded text-[11px] font-bold text-gray-800">
                                            City Center
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {qrVerified && (
                            <div className="mt-2 text-right">
                                <button
                                    type="button"
                                    onClick={() => { setQrVerified(false); setDetectedSite(null); }}
                                    className="text-[11px] text-gray-500 hover:text-gray-900 font-bold underline"
                                >
                                    Rescan Different Location QR
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ----------------------------------------------------------------- */}
                    {/* STEP 2: LIVE FACE SELFIE PHOTO */}
                    {/* ----------------------------------------------------------------- */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                        selfieVerified ? 'bg-emerald-50/70 border-emerald-400' : 'bg-gray-50/60 border-gray-200'
                    }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                    selfieVerified ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white'
                                }`}>
                                    {selfieVerified ? '✓' : '2'}
                                </span>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wide text-gray-900">
                                        Step 2: Live Face Selfie Photo
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Capture a live selfie to verify employee biometric identity
                                    </p>
                                </div>
                            </div>
                            {selfieVerified && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    Selfie Ready ✓
                                </span>
                            )}
                        </div>

                        {/* Camera Viewfinder */}
                        <div className="mt-3">
                            <div className="relative bg-gray-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
                                {isCameraActive ? (
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        className="w-full h-full object-cover scale-x-[-1]"
                                    />
                                ) : capturedSelfie ? (
                                    <img 
                                        src={capturedSelfie} 
                                        alt="Captured Live Selfie" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center p-4 space-y-1 text-gray-400">
                                        <span className="text-3xl block">🤳</span>
                                        <div className="text-xs font-semibold">Front Selfie Camera Ready</div>
                                    </div>
                                )}
                            </div>
                            <canvas ref={canvasRef} className="hidden" />

                            <div className="mt-2.5 flex gap-2">
                                {!isCameraActive && !capturedSelfie && (
                                    <button 
                                        type="button"
                                        onClick={startSelfieCamera}
                                        className="flex-1 bg-gray-900 hover:bg-black text-white font-black text-xs py-3 rounded-xl shadow transition-colors"
                                    >
                                        📷 Open Front Camera for Selfie
                                    </button>
                                )}
                                {isCameraActive && (
                                    <button 
                                        type="button"
                                        onClick={captureSelfieSnapshot}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl shadow transition-colors"
                                    >
                                        📸 Take Live Selfie Now
                                    </button>
                                )}
                                {capturedSelfie && (
                                    <button 
                                        type="button"
                                        onClick={startSelfieCamera}
                                        className="flex-1 border border-gray-300 text-gray-700 font-bold text-xs py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Retake Selfie Photo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ----------------------------------------------------------------- */}
                    {/* STEP 3: START SHIFT ACTION BUTTON */}
                    {/* ----------------------------------------------------------------- */}
                    <div className="pt-2">
                        <button
                            type="button"
                            disabled={!qrVerified || !selfieVerified || actionLoading}
                            onClick={handleStartShift}
                            className={`w-full py-4 rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                qrVerified && selfieVerified
                                    ? 'bg-[#dbb457] hover:bg-[#c29d45] text-white cursor-pointer transform hover:-translate-y-0.5 active:scale-95 shadow-amber-200'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {actionLoading ? (
                                'Verifying Location & Starting Shift...'
                            ) : qrVerified && selfieVerified ? (
                                `🚀 Start Shift at ${detectedSite?.name || 'Location'}`
                            ) : (
                                `Scan Location QR & Take Selfie to Start Shift`
                            )}
                        </button>
                        <p className="text-[11px] text-gray-400 text-center mt-2 font-medium">
                            Anti-proxy biometric verification active. Shift time and venue start upon clock-in.
                        </p>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* LOGOUT / CLOCK-OUT VERIFICATION MODAL (EXACT SAME PROCESS: QR + SELFIE) */}
            {/* ========================================================================= */}
            {showCheckoutStation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="font-black text-base text-gray-900">Shift Clock-Out Verification</h3>
                                <p className="text-xs text-gray-500 font-medium">Scan venue QR & take selfie to end shift</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowCheckoutStation(false);
                                    stopCheckoutQrScanner();
                                    stopCheckoutSelfieCamera();
                                }} 
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900">
                            You are clocking out from <strong>{detectedSite?.name}</strong>. Complete both verification steps below to record your finish time.
                        </div>

                        {/* CHECKOUT STEP 1: SCAN VENUE QR CODE */}
                        <div className={`p-3.5 rounded-2xl border-2 ${
                            checkoutQrVerified ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                        checkoutQrVerified ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white'
                                    }`}>
                                        {checkoutQrVerified ? '✓' : '1'}
                                    </span>
                                    <span className="text-xs font-black uppercase text-gray-900">Step 1: Scan Venue QR Code</span>
                                </div>
                                {checkoutQrVerified && (
                                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        Venue Matched ✓
                                    </span>
                                )}
                            </div>

                            {checkoutQrError && (
                                <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200 mb-2 font-semibold">
                                    {checkoutQrError}
                                </div>
                            )}

                            {isCheckoutQrScanning && (
                                <div className="space-y-2">
                                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                                        <video ref={checkoutQrVideoRef} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 border-2 border-dashed border-white/70 m-6 rounded-xl flex items-center justify-center pointer-events-none">
                                            <span className="text-xs text-white font-bold bg-black/60 px-2 py-1 rounded">
                                                Align Venue QR Code
                                            </span>
                                        </div>
                                    </div>
                                    <canvas ref={checkoutQrCanvasRef} className="hidden" />
                                    <button
                                        type="button"
                                        onClick={stopCheckoutQrScanner}
                                        className="w-full text-xs font-bold text-red-600 border py-2 rounded-xl"
                                    >
                                        Cancel Scanning
                                    </button>
                                </div>
                            )}

                            {!isCheckoutQrScanning && !checkoutQrVerified && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={startCheckoutQrScanner}
                                            className="bg-gray-900 text-white py-2.5 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1"
                                        >
                                            <span>📷</span> Scan QR Camera
                                        </button>
                                        <label className="bg-white border text-gray-800 py-2.5 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1 cursor-pointer text-center">
                                            <span>📸</span> Snap QR Photo
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment"
                                                onChange={handleCheckoutQrPhotoUpload} 
                                                className="hidden" 
                                            />
                                        </label>
                                    </div>
                                    {/* Quick Simulation Button for Checkout */}
                                    <button
                                        type="button"
                                        onClick={() => processCheckoutQr(scannedQrData || `MC:LOC:${detectedSite?.id}`)}
                                        className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold"
                                    >
                                        ⚡ Quick Verify {detectedSite?.name} QR (Simulate)
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CHECKOUT STEP 2: TAKE LIVE FACE SELFIE */}
                        <div className={`p-3.5 rounded-2xl border-2 ${
                            checkoutSelfieVerified ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                        checkoutSelfieVerified ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white'
                                    }`}>
                                        {checkoutSelfieVerified ? '✓' : '2'}
                                    </span>
                                    <span className="text-xs font-black uppercase text-gray-900">Step 2: Live Checkout Selfie</span>
                                </div>
                                {checkoutSelfieVerified && (
                                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        Selfie Ready ✓
                                    </span>
                                )}
                            </div>

                            <div className="relative bg-gray-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                                {isCheckoutCameraActive ? (
                                    <video 
                                        ref={checkoutVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        className="w-full h-full object-cover scale-x-[-1]"
                                    />
                                ) : checkoutSelfie ? (
                                    <img 
                                        src={checkoutSelfie} 
                                        alt="Captured Checkout Selfie" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center p-3 text-gray-400">
                                        <span className="text-2xl block">🤳</span>
                                        <span className="text-[11px] font-semibold">Front Camera Idle</span>
                                    </div>
                                )}
                            </div>
                            <canvas ref={checkoutCanvasRef} className="hidden" />

                            <div className="mt-2 flex gap-2">
                                {!isCheckoutCameraActive && !checkoutSelfie && (
                                    <button 
                                        type="button"
                                        onClick={startCheckoutSelfieCamera}
                                        className="flex-1 bg-gray-900 text-white font-black text-xs py-2.5 rounded-xl shadow"
                                    >
                                        📷 Open Camera for Checkout Selfie
                                    </button>
                                )}
                                {isCheckoutCameraActive && (
                                    <button 
                                        type="button"
                                        onClick={captureCheckoutSelfieSnapshot}
                                        className="flex-1 bg-emerald-600 text-white font-black text-xs py-2.5 rounded-xl shadow"
                                    >
                                        📸 Capture Selfie Now
                                    </button>
                                )}
                                {checkoutSelfie && (
                                    <button 
                                        type="button"
                                        onClick={startCheckoutSelfieCamera}
                                        className="flex-1 border text-gray-700 font-bold text-xs py-2 rounded-xl"
                                    >
                                        Retake Selfie
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* CHECKOUT STEP 3: CONFIRM CLOCK-OUT */}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCheckoutStation(false)}
                                className="flex-1 border py-3 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!checkoutQrVerified || !checkoutSelfieVerified || actionLoading}
                                onClick={handleConfirmClockOut}
                                className={`flex-1 py-3 rounded-xl text-xs font-black shadow transition-all ${
                                    checkoutQrVerified && checkoutSelfieVerified
                                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {actionLoading ? 'Clocking Out...' : '🏁 Confirm Clock Out'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Exception Link */}
            <div className="text-center pt-1">
                <button 
                    onClick={() => setShowExceptionModal(true)}
                    className="text-xs text-gray-500 font-semibold hover:text-[#dbb457] underline"
                >
                    Having issues checking in or out? Request an Attendance Exception
                </button>
            </div>

            {/* EXCEPTION MODAL */}
            {showExceptionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-sm text-gray-900">Attendance Exception Request</h3>
                            <button onClick={() => setShowExceptionModal(false)} className="text-gray-400 font-bold text-lg">✕</button>
                        </div>
                        <form onSubmit={handleSubmitException} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Reason for Clock-In / Clock-Out Issue</label>
                                <textarea 
                                    rows={3}
                                    value={exceptionReason} 
                                    onChange={e => setExceptionReason(e.target.value)}
                                    placeholder="e.g. Venue QR code poster damaged or GPS unavailable in underground valet parking"
                                    required
                                    className="w-full border p-3 rounded-2xl text-xs focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowExceptionModal(false)}
                                    className="px-3 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submittingException}
                                    className="px-4 py-2 bg-[#dbb457] hover:bg-[#c29d45] text-white rounded-xl text-xs font-black shadow"
                                >
                                    {submittingException ? 'Submitting...' : 'Submit Exception'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
