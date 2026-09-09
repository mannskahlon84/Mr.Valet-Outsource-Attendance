import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getTodayAssignment, checkIn, checkOut } from '../api/attendance';
import { useAuth } from '../contexts/AuthContext';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
    const { logout } = useAuth();
    const [assignment, setAssignment] = useState<any>(null);
    const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // SCANNER & FACE STATE
    const [permission, requestPermission] = useCameraPermissions();
    const [scanAction, setScanAction] = useState<'IN' | 'OUT' | null>(null);
    const [cameraMode, setCameraMode] = useState<'qr' | 'face' | null>(null);
    const [scannedQr, setScannedQr] = useState<string | null>(null);
    const cameraRef = useRef<any>(null);

    const loadData = async () => {
        try {
            const data = await getTodayAssignment();
            setAssignment(data.assignment);
            setAttendanceRecord(data.attendance_record);
        } catch (err) {
            console.log("No assignment found or error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Location permission is required to verify your attendance.');
            return null;
        }

        try {
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            return location;
        } catch (error) {
            Alert.alert('GPS Error', 'Failed to obtain GPS location. Please try again.');
            return null;
        }
    };

    const handleScanRequest = async (action: 'IN' | 'OUT') => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Camera Permission Denied', 'Camera permission is required.');
                return;
            }
        }
        setScanAction(action);
        setCameraMode('qr');
    };

    const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
        setScannedQr(data);
        setCameraMode('face'); // Move to selfie capture
    };

    const handleTakePicture = async () => {
        if (!cameraRef.current) return;
        setActionLoading(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
            const base64Face = `data:image/jpeg;base64,${photo.base64}`;
            
            setCameraMode(null);
            
            const action = scanAction;
            const qrData = scannedQr!;
            setScanAction(null);
            setScannedQr(null);

            const loc = await getLocation();
            if (!loc) {
                setActionLoading(false);
                return;
            }

            if (action === 'IN') {
                await checkIn(assignment.id, loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy || 0, qrData, base64Face);
                Alert.alert('Success', 'Checked in successfully');
            } else {
                await checkOut(assignment.id, loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy || 0, qrData, base64Face);
                Alert.alert('Success', 'Checked out successfully');
            }
            await loadData();
        } catch (err: any) {
            setCameraMode(null);
            Alert.alert('Action Failed', err.message || 'Unknown error');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

    if (cameraMode === 'qr') {
        return (
            <View style={styles.scannerContainer}>
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    onBarcodeScanned={handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Scan Location QR</Text>
                </View>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraMode(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (cameraMode === 'face') {
        return (
            <View style={styles.scannerContainer}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="front"
                />
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Face Verification</Text>
                </View>
                {actionLoading ? (
                    <ActivityIndicator size="large" color="#fff" style={{ marginBottom: 50 }} />
                ) : (
                    <View style={styles.cameraControls}>
                        <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraMode(null)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    const isCheckedIn = attendanceRecord && attendanceRecord.status !== 'ABSENT' && attendanceRecord.status !== 'SCHEDULED';
    const isCheckedOut = attendanceRecord && attendanceRecord.status === 'CHECKED_OUT';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Duty Roster</Text>
                <TouchableOpacity onPress={async () => { await logout(); onLogout(); }}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
            
            {assignment ? (
                <View style={styles.card}>
                    <Text style={styles.label}>TODAY'S LOCATION</Text>
                    <Text style={styles.valueLarge}>{assignment.site_name}</Text>
                    
                    <Text style={styles.label}>SCHEDULE</Text>
                    <Text style={styles.value}>{new Date(assignment.required_date).toDateString()}</Text>
                    <Text style={styles.value}>{assignment.start_time} - {assignment.end_time}</Text>
                    
                    <Text style={styles.label}>STATUS</Text>
                    <Text style={[styles.value, { color: isCheckedOut ? 'green' : (isCheckedIn ? 'blue' : 'gray') }]}>
                        {attendanceRecord ? attendanceRecord.status.replace('_', ' ') : 'NOT CHECKED IN'}
                    </Text>

                    {attendanceRecord && attendanceRecord.check_in_time && (
                        <>
                            <Text style={styles.label}>CHECK-IN TIME</Text>
                            <Text style={styles.value}>{new Date(attendanceRecord.check_in_time).toLocaleTimeString()}</Text>
                        </>
                    )}

                    {attendanceRecord && attendanceRecord.check_out_time && (
                        <>
                            <Text style={styles.label}>CHECK-OUT TIME</Text>
                            <Text style={styles.value}>{new Date(attendanceRecord.check_out_time).toLocaleTimeString()}</Text>
                            <Text style={styles.label}>TOTAL DUTY HOURS</Text>
                            <Text style={styles.valueLarge}>{attendanceRecord.duty_hours} hrs</Text>
                        </>
                    )}
                    
                    <View style={styles.actions}>
                        {actionLoading ? <ActivityIndicator size="large" /> : (
                            <>
                                {!isCheckedIn && !isCheckedOut && (
                                    <TouchableOpacity style={[styles.bigButton, { backgroundColor: '#007AFF' }]} onPress={() => handleScanRequest('IN')}>
                                        <Text style={styles.bigButtonText}>CHECK IN</Text>
                                    </TouchableOpacity>
                                )}
                                {isCheckedIn && !isCheckedOut && (
                                    <TouchableOpacity style={[styles.bigButton, { backgroundColor: '#FF3B30' }]} onPress={() => handleScanRequest('OUT')}>
                                        <Text style={styles.bigButtonText}>CHECK OUT</Text>
                                    </TouchableOpacity>
                                )}
                                {isCheckedOut && (
                                    <View style={styles.completedBox}>
                                        <Text style={styles.completedText}>Duty Completed</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.center}>
                    <Text style={styles.noAssignment}>You have no assignment scheduled for today.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f0f2f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center', marginTop: 40 },
    title: { fontSize: 28, fontWeight: 'bold' },
    logoutText: { color: 'red', fontSize: 16, fontWeight: 'bold' },
    card: { padding: 25, backgroundColor: '#fff', borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#888', marginTop: 15, marginBottom: 2 },
    value: { fontSize: 18, color: '#333', fontWeight: '500' },
    valueLarge: { fontSize: 24, color: '#000', fontWeight: 'bold' },
    actions: { marginTop: 30 },
    noAssignment: { textAlign: 'center', fontSize: 18, color: '#666' },
    scannerContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: '#000' },
    overlay: { position: 'absolute', top: 50, backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 10 },
    overlayText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    cameraControls: { alignItems: 'center', marginBottom: 30 },
    captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ddd', borderWidth: 2, borderColor: '#000' },
    cancelButton: { backgroundColor: 'red', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, marginBottom: 20 },
    cancelText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    bigButton: { padding: 20, borderRadius: 10, alignItems: 'center', elevation: 2 },
    bigButtonText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    completedBox: { padding: 20, borderRadius: 10, alignItems: 'center', backgroundColor: '#34C759' },
    completedText: { color: 'white', fontSize: 22, fontWeight: 'bold' }
});
