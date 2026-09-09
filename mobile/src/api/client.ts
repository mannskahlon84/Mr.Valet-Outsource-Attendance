import * as SecureStore from 'expo-secure-store';

// Emulator URL: 'http://10.0.2.2:8000/api/v1'
// Physical Device URL (Active):
const API_BASE_URL = 'http://192.168.100.216:8000/api/v1';

export const getToken = async () => await SecureStore.getItemAsync('auth_token');
export const setToken = async (token: string) => await SecureStore.setItemAsync('auth_token', token);
export const removeToken = async () => await SecureStore.deleteItemAsync('auth_token');

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        let errStr = 'API Error';
        try {
            const errJson = await response.json();
            errStr = errJson.detail || errStr;
        } catch (e) {}
        throw new Error(errStr);
    }
    return response.json();
};
