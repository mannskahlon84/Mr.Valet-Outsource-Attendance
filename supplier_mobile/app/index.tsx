import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchApi } from '../api';
import { router, useFocusEffect } from 'expo-router';

export default function Home() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/requests/supplier');
      setRequests(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const renderItem = ({ item }: any) => {
    // Assuming backend returns related Site data as part of ManpowerRequestOut or we just show request_id
    const siteName = item.site ? item.site.name : \Site #\\;
    const dutyTime = \\ - \\;
    const date = new Date(item.required_date).toLocaleDateString();

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => router.push(\/request/\\)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.siteName}>{siteName}</Text>
          <Text style={styles.statusBadge}>{item.status}</Text>
        </View>
        <Text>Date: {date}</Text>
        <Text>Duty: {dutyTime}</Text>
        <Text>Required: {item.total_required_workers} employees</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manpower Requests</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i) => i.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          onRefresh={loadRequests}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  siteName: { fontSize: 16, fontWeight: '600' },
  statusBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', fontSize: 12 }
});
