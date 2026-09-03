import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import ScanFrame from '../../components/ScanFrame';

export default function QRScannerScreen({ navigation }) {
  const [flashOn, setFlashOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const isFocused = useIsFocused();

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <Text style={styles.instruction}>Camera permission is needed to scan bins</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={{ color: '#fff' }}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return; // prevent double-firing while navigating
    setScanned(true);

    // `data` is the raw QR code content — adjust parsing to however your
    // bin QR codes are encoded (e.g. a bin ID, or a URL containing one).
    const binId = data;

    // `replace` (not `navigate`) so this screen — and its CameraView — fully
    // unmounts before BinPhotoScreen mounts its own CameraView. Two mounted
    // CameraViews at once causes the second camera to render black.
    navigation.replace('BinPhoto', { binId });
  };

  return (
    <View style={styles.screen}>
      {/* Only mount the camera while this screen is actually focused, so it
          releases the camera hardware as soon as we navigate away. */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
      )}

      {/* Flash toggle */}
      <TouchableOpacity
        style={styles.flashBtn}
        onPress={() => setFlashOn(!flashOn)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={flashOn ? 'flash' : 'flash-off'}
          size={24}
          color={colors.secondary}
        />
      </TouchableOpacity>

      {/* Scan area */}
      <View style={styles.scanArea} pointerEvents="none">
        <ScanFrame />
        <Text style={styles.instruction}>Align QR code within the frame</Text>
        <Text style={styles.subInstruction}>
          Scan a bin's QR code to earn ECO
        </Text>
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
  flashBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 10,
    borderRadius: 9999,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
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
});