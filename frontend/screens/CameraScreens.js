// screens/CameraScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { analyzePhoto } from '../src/api';

// Native (phone) camera implementation
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({ navigation }) {
  if (Platform.OS === 'web') {
    return <WebCameraScreen navigation={navigation} />;
  }
  return <NativeCameraScreen navigation={navigation} />;
}

// ---------------------------------------------------------------------
// Native (iOS/Android via Expo Go or a built app)
// ---------------------------------------------------------------------
function NativeCameraScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
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
      navigation.replace('Result', { verdict, s3Key: s3_key, photoUri: photo.uri });
    } catch (error) {
      console.error(error);
      Alert.alert('Something went wrong', 'Could not analyze the photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.overlay}>
          {isProcessing ? (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>Analyzing photo…</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

// ---------------------------------------------------------------------
// Web (browser camera via getUserMedia + canvas)
// ---------------------------------------------------------------------
function WebCameraScreen({ navigation }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error(e);
        setError('Camera access was denied or is unavailable in this browser.');
      }
    })();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const takePicture = async () => {
    if (isProcessing || !videoRef.current || !canvasRef.current) return;
    try {
      setIsProcessing(true);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      );
      const localPreviewUrl = URL.createObjectURL(blob);

      const { verdict, s3_key } = await analyzePhoto(localPreviewUrl, blob);
      navigation.replace('Result', { verdict, s3Key: s3_key, photoUri: localPreviewUrl });
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong', 'Could not analyze the photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} style={{ width: '100%', height: '80%', objectFit: 'cover' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <View style={styles.overlay}>
        {isProcessing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#333" />
            <Text style={[styles.processingText, { color: '#333' }]}>Analyzing photo…</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  processingBox: { alignItems: 'center' },
  processingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  message: { textAlign: 'center', marginBottom: 12, fontSize: 16, marginTop: 40 },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16 },
});
