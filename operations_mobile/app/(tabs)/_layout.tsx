
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#dbb457', tabBarStyle: { backgroundColor: '#111827' }, headerStyle: { backgroundColor: '#111827' }, headerTintColor: '#dbb457' }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="create" options={{ title: 'Create Request' }} />
    </Tabs>
  );
}
