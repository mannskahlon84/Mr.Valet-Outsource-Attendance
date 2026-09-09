
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { fetchApi } from '../src/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const registerPushToken = async () => {
        if (!Device.isDevice) return;
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        
        try {
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            await fetchApi('/auth/push-token', {
                method: 'POST',
                body: JSON.stringify({ token, device_type: 'android' })
            });
        } catch (e) {
            console.log("Failed to register push token", e);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetchApi('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            await AsyncStorage.setItem('userToken', res.access_token);
            const role = res.role;
            if (role !== 'Operations Manager' && role !== 'Super Admin') {
                await AsyncStorage.removeItem('userToken');
                Alert.alert('Unauthorized', 'Only Operations Managers can access this app.');
                setLoading(false);
                return;
            }
            
            await registerPushToken();
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Operations Portal</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} color="#dbb457" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#111827' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#dbb457', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: '#1f2937', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 }
});
