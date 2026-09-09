import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchApi } from '../../api';

export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const [reqData, setReqData] = useState<any>(null);
  const [srData, setSrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { loadDetails(); }, [id]);

  const loadDetails = async () => {
    try {
      const data = await fetchApi('/requests/supplier');
      const request = data.find((r: any) => r.id.toString() === id);
      if (request) {
        setReqData(request);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async (type: string) => {
    if (!reqData) return;
    Alert.alert('Submitting', 'Please wait...');
    // Real implementation would POST to /api/v1/requests/{sr_id}/respond or similar.
    // Assuming backend takes the request ID and auth knows which SR it is.
    try {
      await fetchApi(\/requests/\/respond\, {
        method: 'PATCH',
        body: JSON.stringify({
          status: type,
          confirmed_quantity: parseInt(quantity || '0'),
          proposed_start_time: start,
          proposed_end_time: end,
          supplier_message: msg,
          response_type: type
        })
      });
      Alert.alert('Success', 'Response submitted');
      loadDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading || !reqData) return <View style={{padding:20}}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Request #{reqData.id}</Text>
      <Text>Location: {reqData.site?.name}</Text>
      <Text>Date: {new Date(reqData.required_date).toLocaleDateString()}</Text>
      <Text>Required Time: {reqData.start_time} - {reqData.end_time}</Text>
      <Text>Requested Employees: {reqData.total_required_workers}</Text>
      <Text>Notes: {reqData.notes}</Text>

      <View style={styles.actions}>
        <Button title="Chat with Manager" onPress={() => router.push(\/request/chat?id=\\)} />
      </View>

      <Text style={styles.sectionHeader}>Respond to Request</Text>
      <TextInput style={styles.input} placeholder="Confirmed Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Proposed Start Time (e.g. 14:00)" value={start} onChangeText={setStart} />
      <TextInput style={styles.input} placeholder="Proposed End Time (e.g. 23:00)" value={end} onChangeText={setEnd} />
      <TextInput style={styles.input} placeholder="Reason / Message" value={msg} onChangeText={setMsg} multiline />

      <View style={styles.row}>
        <Button title="Accept" onPress={() => submitResponse('ACCEPTED')} color="green" />
        <Button title="Partial" onPress={() => submitResponse('PARTIAL')} color="orange" />
      </View>
      <View style={[styles.row, {marginTop: 10}]}>
        <Button title="Counter Propose" onPress={() => submitResponse('COUNTER_PROPOSED')} color="blue" />
        <Button title="Reject" onPress={() => submitResponse('REJECTED')} color="red" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  actions: { marginVertical: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-around' }
});
