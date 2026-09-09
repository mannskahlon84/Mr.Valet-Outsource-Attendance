import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { getToken } from './src/api/client';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getToken().then(token => {
            if (token) setIsAuthenticated(true);
            setLoading(false);
        });
    }, []);

    if (loading) return null;

    return (
        <SafeAreaView style={{ flex: 1 }}>
            {isAuthenticated ? (
                <HomeScreen onLogout={() => setIsAuthenticated(false)} />
            ) : (
                <LoginScreen onLogin={() => setIsAuthenticated(true)} />
            )}
        </SafeAreaView>
    );
}
