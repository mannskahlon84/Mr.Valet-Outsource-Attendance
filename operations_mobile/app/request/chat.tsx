
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchApi } from '../../src/api';

export default function Chat() {
    const { id } = useLocalSearchParams();
    const [messages, setMessages] = useState([]);
    const [msg, setMsg] = useState('');

    const loadMessages = async () => {
        try {
            const data = await fetchApi(/requests//messages);
            setMessages(data);
        } catch (e) {
            console.log(e);
        }
    };

    useEffect(() => {
        loadMessages();
        const timer = setInterval(loadMessages, 5000);
        return () => clearInterval(timer);
    }, [id]);

    const sendMsg = async () => {
        if (!msg.trim()) return;
        try {
            await fetchApi(/requests//messages, {
                method: 'POST',
                body: JSON.stringify({ message: msg.trim() })
            });
            setMsg('');
            loadMessages();
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.msgBubble, item.sender_role === 'Operations Manager' ? styles.msgSelf : styles.msgOther]}>
                        <Text style={styles.msgText}>{item.message}</Text>
                        <Text style={styles.msgDate}>{item.created_at?.split('.')[0].replace('T', ' ')}</Text>
                    </View>
                )}
            />
            <View style={styles.inputRow}>
                <TextInput style={styles.input} value={msg} onChangeText={setMsg} placeholder="Type a message..." />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMsg}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    msgBubble: { padding: 10, borderRadius: 8, margin: 10, maxWidth: '80%' },
    msgSelf: { backgroundColor: '#dbb457', alignSelf: 'flex-end' },
    msgOther: { backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
    msgText: { fontSize: 16, color: '#111827' },
    msgDate: { fontSize: 10, color: '#6b7280', marginTop: 5, textAlign: 'right' },
    inputRow: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#d1d5db' },
    input: { flex: 1, backgroundColor: '#f3f4f6', padding: 10, borderRadius: 20, marginRight: 10 },
    sendBtn: { backgroundColor: '#dbb457', padding: 12, borderRadius: 20, justifyContent: 'center' }
});
