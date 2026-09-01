// screens/ResultScreen.js
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function ResultScreen({ route, navigation }) {
  const { verdict, photoUri } = route.params;
  const isFull = verdict === 'full';

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.image} />

      <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeNotFull]}>
        <Text style={styles.badgeText}>{isFull ? 'FULL' : 'NOT FULL'}</Text>
      </View>

      {isFull ? (
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('FullFlowScreen')}>
          <Text style={styles.buttonText}>Continue (Full flow)</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NotFullFlowScreen')}>
          <Text style={styles.buttonText}>Continue (Not full flow)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, styles.retakeButton]} onPress={() => navigation.navigate('Camera')}>
        <Text style={styles.buttonText}>Retake photo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', padding: 20 },
  image: { width: '100%', height: 300, borderRadius: 12, marginTop: 20 },
  badge: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
  badgeFull: { backgroundColor: '#e53935' },
  badgeNotFull: { backgroundColor: '#43a047' },
  badgeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  button: { marginTop: 24, backgroundColor: '#2196F3', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retakeButton: { backgroundColor: '#757575' },
  buttonText: { color: '#fff', fontSize: 16 },
});
