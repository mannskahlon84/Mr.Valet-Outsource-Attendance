
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const token = await AsyncStorage.getItem('userToken');
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) headers['Authorization'] = Bearer ;

    const response = await fetch(${API_URL}, { ...options, headers });
    
    if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        throw new Error("401: Unauthorized");
    }
    
    let data;
    try {
        data = await response.json();
    } catch(e) {
        data = null;
    }

    if (!response.ok) {
        throw { status: response.status, data, message: data?.detail || "Request failed" };
    }
    return data;
};
