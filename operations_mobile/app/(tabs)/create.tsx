
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { fetchApi } from '../../src/api';
import { useRouter } from 'expo-router';

export default function CreateRequest() {
    const [sites, setSites] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // For simplicity, we just manage one request form here. Multi-shift would be an array of these.
    const [siteId, setSiteId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [reqDate, setReqDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [qty, setQty] = useState('');
    
    const router = useRouter();

    useEffect(() => {
        Promise.all([
            fetchApi('/sites/').then(setSites),
            fetchApi('/suppliers/').then(setSuppliers)
        ]).catch(e => {
            if(e.message === "401: Unauthorized") router.replace('/login');
        }).finally(() => setLoading(false));
    }, []);

    const handleSubmit = async () => {
        if (!siteId || !supplierId || !reqDate || !qty) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        setSubmitting(true);
        try {
            await fetchApi('/requests/', {
                method: 'POST',
                body: JSON.stringify({
                    site_id: parseInt(siteId),
                    required_date: reqDate,
                    start_time: startTime,
                    end_time: endTime,
                    total_required_workers: parseInt(qty),
                    routes: [{ supplier_id: parseInt(supplierId), requested_quantity: parseInt(qty) }]
                })
            });
            Alert.alert('Success', 'Request created successfully');
            router.push('/(tabs)/');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <View style={styles.container}><ActivityIndicator color="#dbb457" /></View>;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.label}>Site ID (Authorized only)</Text>
            <TextInput style={styles.input} placeholder="e.g. 1" value={siteId} onChangeText={setSiteId} keyboardType="numeric" />
            
            <Text style={styles.label}>Supplier ID</Text>
            <TextInput style={styles.input} placeholder="e.g. 1" value={supplierId} onChangeText={setSupplierId} keyboardType="numeric" />
            
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2026-10-01" value={reqDate} onChangeText={setReqDate} />
            
            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 5}}>
                    <Text style={styles.label}>Start Time</Text>
                    <TextInput style={styles.input} placeholder="09:00" value={startTime} onChangeText={setStartTime} />
                </View>
                <View style={{flex: 1, marginLeft: 5}}>
                    <Text style={styles.label}>End Time</Text>
                    <TextInput style={styles.input} placeholder="18:00" value={endTime} onChangeText={setEndTime} />
                </View>
            </View>

            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} placeholder="10" value={qty} onChangeText={setQty} keyboardType="numeric" />

            <Button title={submitting ? "Submitting..." : "Create Request"} onPress={handleSubmit} color="#dbb457" disabled={submitting} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: '#f3f4f6' },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: '#374151' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 6, marginBottom: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between' }
});
