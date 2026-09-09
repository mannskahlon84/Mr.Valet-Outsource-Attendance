import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://192.168.100.216:8000/api/v1';

export const fetchApi = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: \Bearer \\ } : {}),
    ...options.headers,
  };
  
  const res = await fetch(\\\\, { ...options, headers });
  if (!res.ok) {
    let msg = 'API Error';
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch(e) {}
    throw new Error(msg);
  }
  return res.json();
};
