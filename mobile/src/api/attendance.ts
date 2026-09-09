import { apiClient } from './client';

export const getTodayAssignment = () => apiClient('/assignments/today');

export const getAttendanceReport = () => apiClient('/reports/attendance');

export const checkIn = (assignmentId: number, lat: number, lng: number, acc: number, qrData: string, liveFaceImage: string) => {
    return apiClient('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({
            assignment_id: assignmentId,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            qr_data: qrData,
            live_face_image: liveFaceImage
        })
    });
};

export const checkOut = (assignmentId: number, lat: number, lng: number, acc: number, qrData: string, liveFaceImage: string) => {
    return apiClient('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({
            assignment_id: assignmentId,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            qr_data: qrData,
            live_face_image: liveFaceImage
        })
    });
};
