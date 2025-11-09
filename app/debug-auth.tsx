import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { authService } from '@/services/auth';
import { auth, db, googleProvider } from '@/services/firebase';

export default function DebugAuthScreen() {
  const [initState, setInitState] = useState({ auth: false, db: false, googleProvider: false });
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setInitState({ auth: !!auth, db: !!db, googleProvider: !!googleProvider });
    setUser(authService.getCurrentUser());
  }, []);

  const appendLog = (msg: string) => setLogs((s) => [new Date().toISOString() + ' - ' + msg, ...s].slice(0, 200));

  const testSignIn = async () => {
    appendLog('Triggering authService.signInWithGoogle()');
    try {
      const result = await authService.signInWithGoogle();
      appendLog('signInWithGoogle returned: ' + JSON.stringify(result));
      setUser(authService.getCurrentUser());
    } catch (err: any) {
      appendLog('signInWithGoogle failed: ' + (err?.message || String(err)));
      console.error('Debug sign-in error:', err);
    }
  };

  const refresh = () => {
    setInitState({ auth: !!auth, db: !!db, googleProvider: !!googleProvider });
    setUser(authService.getCurrentUser());
    appendLog('Refreshed debug state');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Debug Auth</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Firebase Auth initialized:</Text>
        <Text>{String(initState.auth)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Firestore DB initialized:</Text>
        <Text>{String(initState.db)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Google Provider present:</Text>
        <Text>{String(initState.googleProvider)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Current user:</Text>
        <Text>{user ? JSON.stringify(user) : 'null'}</Text>
      </View>

      <View style={{ marginVertical: 12 }}>
        <Button title="Test Google Sign-In (native/web)" onPress={testSignIn} />
      </View>

      <View style={{ marginVertical: 12 }}>
        <Button title="Refresh Debug State" onPress={refresh} />
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={styles.subTitle}>Recent debug logs</Text>
        {logs.map((l, i) => (
          <Text key={i} style={styles.logLine}>{l}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  label: { fontWeight: '600' },
  logLine: { fontSize: 12, color: '#333', marginBottom: 4 },
});
