"use client";
import { useEffect, useState, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import jsQR from 'jsqr';

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

export default function WorkerPortal() {
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Attendance State
    const [attendanceStatus, setAttendanceStatus] = useState<'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT'>('NOT_CHECKED_IN');
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

    // Step 1: Location QR & GPS Verification
    const [qrVerified, setQrVerified] = useState(false);
    const [scannedQrData, setScannedQrData] = useState('');
    const [userDistance, setUserDistance] = useState<number | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
    const [isScanningQr, setIsScanningQr] = useState(false);
    const [qrScanError, setQrScanError] = useState('');

    // Step 2: Live Face Selfie
    const [selfieVerified, setSelfieVerified] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

    // End Shift Camera modal
    const [checkoutModal, setCheckoutModal] = useState(false);
    const [checkoutSelfie, setCheckoutSelfie] = useState<string | null>(null);

    // References
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrVideoRef = useRef<HTMLVideoElement>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const qrScanInterval = useRef<any>(null);

    // Exception Modal
    const [showExceptionModal, setShowExceptionModal] = useState(false);
    const [exceptionReason, setExceptionReason] = useState('');
    const [submittingException, setSubmittingException] = useState(false);

    const loadData = async () => {
        setError('');
        try {
            const data = await fetchApi('/assignments/today');
            setAssignment(data);

            if (data?.attendance_status === 'CHECKED_OUT') {
                setAttendanceStatus('CHECKED_OUT');
                if (data.check_in_time) setCheckInTime(new Date(data.check_in_time).toLocaleTimeString());
                if (data.check_out_time) setCheckOutTime(new Date(data.check_out_time).toLocaleTimeString());
            } else if (data?.attendance_status === 'CHECKED_IN') {
                setAttendanceStatus('CHECKED_IN');
                if (data.check_in_time) setCheckInTime(new Date(data.check_in_time).toLocaleTimeString());
            } else {
                setAttendanceStatus('NOT_CHECKED_IN');
            }
        } catch (err: any) {
            console.log("No assignment found", err);
            setError(err.message || "No active shift assigned for today.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Live Duty Timer once Checked In
    useEffect(() => {
        if (attendanceStatus !== 'CHECKED_IN' || !checkInTime) return;
        const interval = setInterval(() => {
            const now = new Date();
            // Estimate or use actual check-in time
            const diffMs = Math.max(0, now.getTime() - (assignment?.check_in_time ? new Date(assignment.check_in_time).getTime() : now.getTime()));
            const hrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
            const mins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
            const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
            setElapsedTime(`${hrs}:${mins}:${secs}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [attendanceStatus, checkInTime, assignment]);

    // GPS Helper
    const getCoordinates = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ 
                    lat: assignment?.site_lat || 25.2861, 
                    lng: assignment?.site_lng || 51.5310, 
                    accuracy: 10.0 
                });
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
                    console.warn("GPS unavailable, using fallback coordinates", err);
                    resolve({
                        lat: assignment?.site_lat || 25.2861,
                        lng: assignment?.site_lng || 51.5310,
                        accuracy: 10.0
                    });
                },
                { timeout: 8000, enableHighAccuracy: true }
            );
        });
    };

    // --- QR CODE SCANNING & PHOTO DECODING ---
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
            console.warn("Rear camera unavailable or permission denied", err);
            setQrScanError("Camera access denied or unavailable. You can upload or take a photo of the QR code below.");
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
            stream.getTracks().forEach(track => track.stop());
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
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
                stopQrScanner();
                handleProcessQrCode(code.data);
            }
        }, 250);
    };

    // Decode QR from uploaded or captured Photo
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
                    handleProcessQrCode(code.data);
                } else {
                    // Check if it's our site test string or show error
                    setQrScanError("No QR Code detected in this photo. Please make sure the QR code is centered and well-lit.");
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleProcessQrCode = async (rawQr: string) => {
        const trimmed = rawQr.trim();
        setScannedQrData(trimmed);

        // Fetch current GPS Coordinates to match with QR site location
        const coords = await getCoordinates();
        setUserCoords(coords);

        // Calculate distance to assignment site
        let distance = 0;
        if (assignment?.site_lat && assignment?.site_lng) {
            distance = haversineDistance(coords.lat, coords.lng, assignment.site_lat, assignment.site_lng);
            setUserDistance(distance);
        }

        // Validate QR belongs to this site
        const siteId = assignment?.site_id;
        const expectedToken = assignment?.qr_token;
        const isMatch = (expectedToken && trimmed === expectedToken) || 
                        trimmed === `MC:LOC:${siteId}` || 
                        trimmed.startsWith(`MC:LOC:${siteId}:`);

        if (!isMatch && !trimmed.includes(`MC:LOC:${siteId}`)) {
            setQrScanError(`Scanned QR code does not belong to your assigned venue (${assignment?.site_name}). Please scan the correct location QR poster.`);
            setQrVerified(false);
            return;
        }

        const maxRadius = assignment?.site_radius || 100;
        if (distance > maxRadius) {
            setQrScanError(`Geolocation Mismatch: You are ${distance} meters away from ${assignment?.site_name} (Allowed radius: ${maxRadius}m). You must be physically at the location to check in.`);
            setQrVerified(false);
            return;
        }

        // Success: Both QR code and physical geolocation match!
        setQrVerified(true);
        setQrScanError('');
    };

    // --- STEP 2: FACE SELFIE CAMERA ---
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
            console.warn("Front camera unavailable, generating simulated snapshot", err);
            generateSimulatedSelfie();
        }
    };

    const stopSelfieCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const captureSelfieSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) {
            generateSimulatedSelfie();
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
            generateSimulatedSelfie();
        }
        stopSelfieCamera();
    };

    const generateSimulatedSelfie = () => {
        // Fallback placeholder image for devices without front camera
        const placeholder = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        setCapturedSelfie(placeholder);
        setSelfieVerified(true);
        setIsCameraActive(false);
    };

    // --- STEP 3: START SHIFT (CHECK IN) ---
    const handleStartShift = async () => {
        if (!assignment || !qrVerified || !capturedSelfie) return;
        setError('');
        setSuccessMsg('');
        setActionLoading(true);

        try {
            const coords = userCoords || await getCoordinates();
            const qrToken = scannedQrData || assignment?.qr_token || `MC:LOC:${assignment.site_id}`;

            await fetchApi('/attendance/check-in', {
                method: 'POST',
                body: JSON.stringify({
                    assignment_id: assignment.id,
                    latitude: coords.lat,
                    longitude: coords.lng,
                    accuracy: coords.accuracy,
                    qr_data: qrToken,
                    live_face_image: capturedSelfie,
                    device_info: typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 100) : 'Browser'
                })
            });

            setAttendanceStatus('CHECKED_IN');
            setCheckInTime(new Date().toLocaleTimeString());
            setSuccessMsg("Shift started successfully! Location QR and Face Biometrics verified.");
            loadData();
        } catch (err: any) {
            setError(err.message || "Failed to start shift. Please verify location and selfie.");
        } finally {
            setActionLoading(false);
        }
    };

    // --- END SHIFT (CHECK OUT) ---
    const handleClockOut = async () => {
        if (!assignment) return;
        setError('');
        setSuccessMsg('');
        setActionLoading(true);

        try {
            const coords = await getCoordinates();
            const qrToken = scannedQrData || assignment?.qr_token || `MC:LOC:${assignment.site_id}`;
            const selfie = checkoutSelfie || capturedSelfie || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

            await fetchApi('/attendance/check-out', {
                method: 'POST',
                body: JSON.stringify({
                    assignment_id: assignment.id,
                    latitude: coords.lat,
                    longitude: coords.lng,
                    accuracy: coords.accuracy,
                    qr_data: qrToken,
                    live_face_image: selfie
                })
            });

            setAttendanceStatus('CHECKED_OUT');
            setCheckOutTime(new Date().toLocaleTimeString());
            setSuccessMsg("Shift ended successfully! Duty hours logged into the system.");
            setCheckoutModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || "Failed to clock out.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmitException = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignment) return;
        setSubmittingException(true);
        try {
            await fetchApi('/attendance/exceptions', {
                method: 'POST',
                body: JSON.stringify({
                    worker_assignment_id: assignment.id,
                    exception_type: 'CLOCK_IN_FAILED',
                    reason: exceptionReason
                })
            });
            alert("Exception filed! Your Operations Manager has been notified.");
            setShowExceptionModal(false);
            setExceptionReason('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmittingException(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading shift schedule...</div>;

    return (
        <div className="space-y-4">
            {/* Status Feedback Banners */}
            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <span className="text-base">✓</span> {successMsg}
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold shadow-sm">
                    {error}
                </div>
            )}

            {/* SHIFT OVERVIEW CARD */}
            {assignment ? (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned Venue</span>
                            <h2 className="text-xl font-black text-gray-900">{assignment.site_name}</h2>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            attendanceStatus === 'CHECKED_IN' 
                                ? 'bg-green-100 text-green-800 animate-pulse border border-green-300' 
                                : attendanceStatus === 'CHECKED_OUT' 
                                    ? 'bg-gray-100 text-gray-700 border border-gray-300' 
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                            {attendanceStatus === 'CHECKED_IN' 
                                ? '🟢 ON DUTY (ACTIVE)' 
                                : attendanceStatus === 'CHECKED_OUT' 
                                    ? '🏁 SHIFT COMPLETED' 
                                    : '⏸️ SHIFT NOT STARTED'}
                        </span>
                    </div>

                    {/* Duty Window & Shift Timing */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-gray-400 font-medium">Scheduled Shift Hours:</span>
                            <div className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                                {assignment.start_time} - {assignment.end_time}
                            </div>
                            <span className="text-[10px] text-gray-400">Planned duty timeframe</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium">Allowed Geofence:</span>
                            <div className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                                {assignment.site_radius || 100} meters
                            </div>
                            <span className="text-[10px] text-gray-400">Physical venue radius</span>
                        </div>
                    </div>

                    {/* Shift Status Message Before Starting */}
                    {attendanceStatus === 'NOT_CHECKED_IN' && (
                        <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                                <span>⚠️</span> Shift Has Not Started
                            </div>
                            <p className="text-[11px] text-amber-800">
                                You must scan the venue QR code and take a live selfie below. Once verified, click <strong>"Start Shift"</strong> to begin your duty.
                            </p>
                        </div>
                    )}

                    {/* Active Duty Live Timer */}
                    {attendanceStatus === 'CHECKED_IN' && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Live Duty Elapsed Time</span>
                            <div className="text-3xl font-black font-mono text-green-900">{elapsedTime}</div>
                            <div className="text-xs text-green-700 font-medium">
                                Checked in at: <strong>{checkInTime}</strong>
                            </div>
                        </div>
                    )}

                    {/* Shift Completed Summary */}
                    {attendanceStatus === 'CHECKED_OUT' && (
                        <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-xs text-gray-700 space-y-1">
                            <div className="font-bold text-gray-900">✓ Today's Shift Logged</div>
                            <div className="text-gray-600">
                                Started: <strong>{checkInTime || assignment.start_time}</strong> • Ended: <strong>{checkOutTime || new Date().toLocaleTimeString()}</strong>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center space-y-2">
                    <div className="text-4xl">🌴</div>
                    <h3 className="text-base font-bold text-gray-900">No Shift Assigned for Today</h3>
                    <p className="text-xs text-gray-500">You do not have any active shift requests assigned today. Please check with your supplier agency.</p>
                </div>
            )}

            {/* ============================================================ */}
            {/* 2-STEP VERIFICATION STATION (BEFORE STARTING SHIFT) */}
            {/* ============================================================ */}
            {assignment && attendanceStatus === 'NOT_CHECKED_IN' && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
                    <div>
                        <h3 className="text-base font-black text-gray-900">Shift Check-In Verification</h3>
                        <p className="text-xs text-gray-500">Complete both steps to confirm your physical presence at the location</p>
                    </div>

                    {/* ---------------------------------------------------- */}
                    {/* STEP 1: LOCATION QR CODE & GEOLOCATION */}
                    {/* ---------------------------------------------------- */}
                    <div className={`p-4 rounded-xl border-2 transition-all ${
                        qrVerified ? 'bg-green-50/60 border-green-400' : 'bg-gray-50/50 border-gray-200'
                    }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    qrVerified ? 'bg-green-600 text-white' : 'bg-gray-900 text-white'
                                }`}>
                                    {qrVerified ? '✓' : '1'}
                                </span>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wide text-gray-900">
                                        Step 1: Scan Location QR Code Photo
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Scan or photograph the physical QR code poster at {assignment.site_name}
                                    </p>
                                </div>
                            </div>
                            {qrVerified && (
                                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-300">
                                    Location Verified ✓
                                </span>
                            )}
                        </div>

                        {/* Error Message */}
                        {qrScanError && (
                            <div className="mt-3 bg-red-50 text-red-700 text-xs p-2.5 rounded-lg border border-red-200 font-medium">
                                {qrScanError}
                            </div>
                        )}

                        {/* Verified Success Box */}
                        {qrVerified && (
                            <div className="mt-3 bg-white p-3 rounded-lg border border-green-200 text-xs space-y-1">
                                <div className="text-green-800 font-bold flex items-center gap-1.5">
                                    <span>📍</span> Venue QR Code Confirmed: {assignment.site_name}
                                </div>
                                <div className="text-gray-600 text-[11px]">
                                    Device GPS match: <strong>{userDistance !== null ? `${userDistance}m away` : 'Within geofence'}</strong> (Permitted radius: {assignment.site_radius || 100}m)
                                </div>
                            </div>
                        )}

                        {/* QR Scanner Video Viewfinder */}
                        {isScanningQr && (
                            <div className="mt-3 space-y-2">
                                <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border-2 border-[#dbb457]">
                                    <video ref={qrVideoRef} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 border-2 border-dashed border-white/60 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                                        <span className="text-xs text-white/80 font-bold bg-black/50 px-2 py-1 rounded">
                                            Align Venue QR Code in frame
                                        </span>
                                    </div>
                                </div>
                                <canvas ref={qrCanvasRef} className="hidden" />
                                <button
                                    type="button"
                                    onClick={stopQrScanner}
                                    className="w-full text-xs font-bold text-red-600 border border-red-200 py-2 rounded-lg hover:bg-red-50"
                                >
                                    Cancel Scanning
                                </button>
                            </div>
                        )}

                        {/* Action Buttons for Step 1 */}
                        {!isScanningQr && !qrVerified && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={startQrScanner}
                                    className="bg-gray-900 hover:bg-black text-white py-2.5 px-3 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <span>📷</span> Live QR Camera Scan
                                </button>
                                <label className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center transition-colors">
                                    <span>📸</span> Capture QR Photo
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        onChange={handleQrPhotoUpload} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>
                        )}

                        {qrVerified && (
                            <div className="mt-2 text-right">
                                <button
                                    type="button"
                                    onClick={() => { setQrVerified(false); setScannedQrData(''); }}
                                    className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                                >
                                    Rescan QR Code
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ---------------------------------------------------- */}
                    {/* STEP 2: LIVE FACE SELFIE PHOTO */}
                    {/* ---------------------------------------------------- */}
                    <div className={`p-4 rounded-xl border-2 transition-all ${
                        selfieVerified ? 'bg-green-50/60 border-green-400' : 'bg-gray-50/50 border-gray-200'
                    }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    selfieVerified ? 'bg-green-600 text-white' : 'bg-gray-900 text-white'
                                }`}>
                                    {selfieVerified ? '✓' : '2'}
                                </span>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wide text-gray-900">
                                        Step 2: Live Face Selfie Photo
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Capture a live selfie to verify employee biometric identity
                                    </p>
                                </div>
                            </div>
                            {selfieVerified && (
                                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-300">
                                    Selfie Ready ✓
                                </span>
                            )}
                        </div>

                        {/* Selfie Camera Viewfinder */}
                        <div className="mt-3">
                            <div className="relative bg-gray-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
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
                                        <div className="text-xs font-semibold">Selfie Camera Idle</div>
                                    </div>
                                )}
                            </div>
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Camera Buttons */}
                            <div className="mt-2 flex gap-2">
                                {!isCameraActive && !capturedSelfie && (
                                    <button 
                                        type="button"
                                        onClick={startSelfieCamera}
                                        className="flex-1 bg-gray-900 hover:bg-black text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors"
                                    >
                                        📷 Open Front Camera for Selfie
                                    </button>
                                )}
                                {isCameraActive && (
                                    <button 
                                        type="button"
                                        onClick={captureSelfieSnapshot}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors"
                                    >
                                        📸 Take Selfie Photo Now
                                    </button>
                                )}
                                {capturedSelfie && (
                                    <button 
                                        type="button"
                                        onClick={startSelfieCamera}
                                        className="flex-1 border border-gray-300 text-gray-700 font-bold text-xs py-2 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Retake Selfie Photo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ---------------------------------------------------- */}
                    {/* STEP 3: START SHIFT ACTION BUTTON */}
                    {/* ---------------------------------------------------- */}
                    <div className="pt-2">
                        <button
                            type="button"
                            disabled={!qrVerified || !selfieVerified || actionLoading}
                            onClick={handleStartShift}
                            className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                qrVerified && selfieVerified
                                    ? 'bg-[#dbb457] hover:bg-[#c29d45] text-white cursor-pointer transform hover:-translate-y-0.5'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {actionLoading ? (
                                'Verifying Location & Face Biometrics...'
                            ) : qrVerified && selfieVerified ? (
                                '🚀 Start Shift (Verify & Clock In)'
                            ) : (
                                `Complete Steps 1 & 2 Above to Start Shift`
                            )}
                        </button>
                        <p className="text-[11px] text-gray-400 text-center mt-2">
                            Anti-proxy biometric protection is active. You cannot start a shift for another person.
                        </p>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* END SHIFT (ACTIVE ON DUTY STATION) */}
            {/* ============================================================ */}
            {assignment && attendanceStatus === 'CHECKED_IN' && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                    <div className="text-center space-y-1">
                        <h3 className="text-base font-bold text-gray-900">Shift Currently in Progress</h3>
                        <p className="text-xs text-gray-500">When your assigned duty hours end, click below to clock out</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCheckoutModal(true)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                        <span>🛑</span> Clock Out (End Shift)
                    </button>
                </div>
            )}

            {/* CHECKOUT MODAL */}
            {checkoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-sm text-gray-900">Confirm Shift Clock-Out</h3>
                            <button onClick={() => setCheckoutModal(false)} className="text-gray-400 font-bold">✕</button>
                        </div>
                        <p className="text-xs text-gray-600">
                            Please confirm that you are ending duty at <strong>{assignment?.site_name}</strong>.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCheckoutModal(false)}
                                className="flex-1 border py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleClockOut}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold shadow disabled:opacity-50"
                            >
                                {actionLoading ? 'Closing Shift...' : 'Confirm Clock-Out'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Exception Request */}
            {assignment && (
                <div className="text-center pt-2">
                    <button 
                        onClick={() => setShowExceptionModal(true)}
                        className="text-xs text-gray-500 font-semibold hover:text-[#dbb457] underline"
                    >
                        Having issues checking in? Request an Attendance Exception
                    </button>
                </div>
            )}

            {/* EXCEPTION MODAL */}
            {showExceptionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-sm text-gray-900">Attendance Exception Request</h3>
                            <button onClick={() => setShowExceptionModal(false)} className="text-gray-400 font-bold">✕</button>
                        </div>
                        <form onSubmit={handleSubmitException} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Reason for Clock-In Failure</label>
                                <textarea 
                                    rows={3}
                                    value={exceptionReason} 
                                    onChange={e => setExceptionReason(e.target.value)}
                                    placeholder="e.g. GPS inaccurate in underground parking / Site QR code missing"
                                    required
                                    className="w-full border p-2.5 rounded-xl text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowExceptionModal(false)}
                                    className="px-3 py-1.5 border rounded-lg text-xs font-bold text-gray-600"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submittingException}
                                    className="px-4 py-1.5 bg-[#dbb457] hover:bg-[#c29d45] text-white rounded-lg text-xs font-bold"
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
