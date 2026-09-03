import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function ResultScreen({ route, navigation }) {
  const { verdict, photoUri, binId } = route.params;
  const isFull = verdict === 'full';

  const retakePhoto = () => {
    // BinPhoto was removed from the stack (takePicture used `.replace`),
    // so we push it again rather than goBack — goBack would land on the tabs.
    navigation.replace('BinPhoto', { binId });
  };

  const continueFlow = () => {
    // NOTE: 'FullFlowScreen' / 'NotFullFlowScreen' aren't registered in
    // ResidentRootStack yet — add them there the same way BinPhoto/Result
    // were added, then swap this back to isFull ? 'FullFlowScreen' : 'NotFullFlowScreen'.
    navigation.navigate('ResidentTabsMain');
  };

  return (
    <View style={styles.screen}>
      <Image source={{ uri: photoUri }} style={styles.image} />

      <View style={styles.overlay}>
        <Text style={styles.instruction}>Bin {binId}</Text>

        <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeNotFull]}>
          <Ionicons
            name={isFull ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={colors.secondary}
          />
          <Text style={styles.badgeText}>{isFull ? 'FULL' : 'NOT FULL'}</Text>
        </View>

        <Text style={styles.subInstruction}>
          {isFull
            ? 'This bin looks full. Continue to report it for collection.'
            : 'This bin still has room. Thanks for checking in!'}
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={continueFlow} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>
            {isFull ? 'Continue' : 'Done'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={18} color={colors.secondary} />
          <Text style={styles.retakeButtonText}>Retake photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1A1A1A' },
  image: {
    width: '100%',
    height: '45%',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  instruction: {
    color: colors.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  subInstruction: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.size.sm,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 9999,
  },
  badgeFull: { backgroundColor: '#C0392B' },
  badgeNotFull: { backgroundColor: colors.primary },
  badgeText: {
    color: colors.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
  },
  primaryButton: {
    marginTop: 16,
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retakeButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});