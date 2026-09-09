import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchApi } from '../../api';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  const loadMessages = async () => {
    try {
      const data = await fetchApi(\/requests/\/messages\);
      setMessages(data);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      await fetchApi(\/requests/\/messages\, {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });
      setText('');
      loadMessages();
    } catch (e) {
      console.log(e);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={[styles.msgBubble, item.is_mine ? styles.myMsg : styles.theirMsg]}>
      <Text style={styles.sender}>{item.sender_name}</Text>
      <Text style={styles.msgText}>{item.message}</Text>
      <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={i => i.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Type a message..." />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  msgBubble: { padding: 10, borderRadius: 8, marginVertical: 4, maxWidth: '80%' },
  myMsg: { backgroundColor: '#dbb457', alignSelf: 'flex-end' },
  theirMsg: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start' },
  sender: { fontSize: 10, color: '#333', marginBottom: 2 },
  msgText: { fontSize: 16, color: '#000' },
  time: { fontSize: 10, color: '#666', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 }
});
