
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchApi } from '../../src/api';

export default function RequestDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [req, setReq] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);

    const loadRequest = useCallback(async () => {
        setLoading(true);
        try {
            const list = await fetchApi('/requests/');
            const found = list.find((r: any) => r.id === parseInt(id as string));
            if (!found) throw new Error("404: Not Found");
            setReq(found);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Could not load request");
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

    const handleFinalize = (res: any) => {
        Alert.alert(
            "Confirm supplier proposal?",
            Required: \nSupplier offered: \nFinal quantity: \n\nRequested time: -\nProposed time: -,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => submitFinalize(res) }
            ]
        );
    };

    const submitFinalize = async (res: any) => {
        setFinalizing(true);
        try {
            await fetchApi(/requests//responses//finalize, {
                method: 'PATCH',
                body: JSON.stringify({
                    accepted_quantity: res.requested_quantity,
                    accepted_start_time: res.proposed_start_time || req.start_time,
                    accepted_end_time: res.proposed_end_time || req.end_time,
                    last_seen_responded_at: res.responded_at
                })
            });
            Alert.alert("Success", "Request finalized successfully");
            loadRequest();
        } catch (e: any) {
            if (e.status === 409) {
                Alert.alert("Proposal Changed", "The supplier has updated the proposal. Refreshing data...");
                loadRequest();
            } else {
                Alert.alert("Error", e.message || "Failed to finalize");
            }
        } finally {
            setFinalizing(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#dbb457" /></View>;
    if (!req) return <View style={styles.center}><Text>Not found</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.headerText}>ORIGINAL REQUEST</Text>
                <Text style={styles.txt}>Site: {req.site?.name}</Text>
                <Text style={styles.txt}>Date: {req.required_date?.split('T')[0]}</Text>
                <Text style={styles.txt}>Timing: {req.start_time} - {req.end_time}</Text>
                <Text style={styles.txt}>Required Quantity: {req.total_required_workers}</Text>
                <Text style={styles.txt}>Status: {req.status}</Text>
            </View>

            <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(/request/chat?id=)}>
                <Text style={styles.chatBtnTxt}>Open Request Chat</Text>
            </TouchableOpacity>

            <Text style={styles.subTitle}>Supplier Responses</Text>
            {req.routes?.map((res: any, idx: number) => (
                <View key={idx} style={[styles.card, { borderColor: '#dbb457', borderWidth: 1 }]}>
                    <Text style={styles.headerText}>SUPPLIER PROPOSAL</Text>
                    <Text style={styles.txt}>Supplier ID: {res.supplier_id}</Text>
                    <Text style={styles.txt}>Status: {res.status}</Text>
                    
                    {res.status === 'ACCEPTED_BY_OM' ? (
                        <>
                            <Text style={styles.finalText}>FINAL CONFIRMATION</Text>
                            <Text style={styles.txt}>Confirmed Qty: {res.confirmed_quantity}</Text>
                            <Text style={styles.txt}>Confirmed Time: {res.confirmed_start_time} - {res.confirmed_end_time}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.txt}>Proposed Qty: {res.requested_quantity}</Text>
                            <Text style={styles.txt}>Proposed Time: {res.proposed_start_time} - {res.proposed_end_time}</Text>
                            <Text style={styles.txt}>Message: {res.supplier_message || 'None'}</Text>
                            
                            {['PENDING', 'COUNTER_PROPOSED', 'PARTIAL'].includes(res.status) && !['CONFIRMED', 'CANCELLED'].includes(req.status) && (
                                <TouchableOpacity style={styles.confirmBtn} onPress={() => handleFinalize(res)} disabled={finalizing}>
                                    <Text style={styles.confirmBtnTxt}>{finalizing ? "Confirming..." : "Confirm This Proposal"}</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#f3f4f6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
    headerText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 10, letterSpacing: 1 },
    finalText: { fontSize: 12, fontWeight: 'bold', color: '#10b981', marginTop: 10, marginBottom: 5, letterSpacing: 1 },
    txt: { fontSize: 15, marginBottom: 4, color: '#1f2937' },
    subTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#111827' },
    confirmBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 15 },
    confirmBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    chatBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 15 },
    chatBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
