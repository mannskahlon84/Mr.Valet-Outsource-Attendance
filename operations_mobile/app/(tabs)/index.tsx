
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchApi } from '../../src/api';

export default function Dashboard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchApi('/requests/');
            setRequests(data);
        } catch (e: any) {
            if (e.message === "401: Unauthorized") router.replace('/login');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(/request/)}>
            <Text style={styles.siteName}>{item.site?.name || 'Site'}</Text>
            <Text style={styles.details}>Date: {item.required_date?.split('T')[0]}</Text>
            <Text style={styles.details}>Time: {item.start_time} - {item.end_time}</Text>
            <Text style={styles.details}>Required: {item.total_required_workers}</Text>
            <Text style={styles.statusBadge}>{item.status}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList 
                data={requests}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#dbb457" />}
                ListEmptyComponent={<Text style={{color: '#9ca3af', textAlign: 'center', marginTop: 20}}>No requests found.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6', padding: 10 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    siteName: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 5 },
    details: { fontSize: 14, color: '#4b5563', marginBottom: 2 },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#dbb457', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, marginTop: 5, fontWeight: 'bold' }
});
