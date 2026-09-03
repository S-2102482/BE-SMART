import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { analyzePhoto } from '../../services/api';

export default function BinPhotoScreen({ route, navigation }) {
  const { binId } = route.params;
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <Text style={styles.instruction}>Camera permission is needed to check the bin</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={{ color: '#fff' }}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      const { verdict, s3_key } = await analyzePhoto(photo.uri);

      navigation.replace('Result', {
        verdict,
        s3Key: s3_key,
        photoUri: photo.uri,
        binId, // carried through so the result screen knows which bin this was
      });
    } catch (error) {
      console.error(error);
      // Analysis failed — let the user know, then send them back to Home
      // rather than leaving them stuck on the camera for this bin.
      Alert.alert(
        'Photo cannot be processed',
        "We couldn't process this photo right now. Please try again later.",
        [
          {
            text: 'OK',
            onPress: () =>
              // Explicitly target the Home tab — popToTop() alone would land
              // wherever ResidentTabsMain last was (e.g. the QR tab).
              navigation.navigate('ResidentTabsMain', { screen: 'Home' }),
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />

      <View style={styles.overlay}>
        <Text style={styles.instruction}>Bin {binId}</Text>
        <Text style={styles.subInstruction}>Take a photo of the bin to check if it's full</Text>

        {isProcessing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={styles.subInstruction}>Analyzing photo…</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1A1A1A' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20, gap: 16 },
  permissionBtn: {
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
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
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  processingBox: { alignItems: 'center', gap: 8, marginTop: 8 },
});