import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    checkAuth();
    
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data.url;
      if (url) {
        // Simple manual routing for the demo
        const route = url.replace('valetsupplier://', '/');
        if(route.startsWith('/request/')) {
            router.push(route as any);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
    setAuthResolved(true);
  };

  if (!authResolved) return <View><Text>Loading...</Text></View>;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Supplier Dashboard' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="request/[id]" options={{ title: 'Request Details' }} />
      <Stack.Screen name="request/chat" options={{ title: 'Chat' }} />
    </Stack>
  );
}
