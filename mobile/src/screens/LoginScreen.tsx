import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { login } from '../api/auth';
import { setToken } from '../api/client';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!mobileNumber || !password) {
            Alert.alert('Error', 'Please enter your mobile number and password');
            return;
        }

        setLoading(true);
        try {
            const data = await login(mobileNumber, password);
            await setToken(data.access_token);
            onLogin();
        } catch (err: any) {
            Alert.alert('Login Failed', err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Worker Login</Text>
            
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput 
                style={styles.input}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                autoCapitalize="none"
            />
            
            <Text style={styles.label}>Password / PIN</Text>
            <TextInput 
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
            />

            {loading ? <ActivityIndicator size="large" /> : (
                <View style={styles.buttonContainer}>
                    <Button title="Login" onPress={handleLogin} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
    label: { fontSize: 16, marginBottom: 5, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
    buttonContainer: { marginTop: 10 }
});
