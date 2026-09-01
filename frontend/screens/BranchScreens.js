// screens/BranchScreens.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function FullFlowScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👉 This is where the "FULL" flow continues.</Text>
    </View>
  );
}

export function NotFullFlowScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👉 This is where the "NOT FULL" flow continues.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 18, textAlign: 'center' },
});
