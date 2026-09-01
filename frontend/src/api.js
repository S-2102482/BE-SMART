// src/api.js
import { Platform } from 'react-native';

// Point this at your backend. While developing:
// - Web: localhost works fine.
// - Physical phone via Expo Go: localhost means the PHONE, not your computer.
//   Use your computer's LAN IP instead, e.g. "http://192.168.1.23:8000".
//   Find it with `ipconfig` (Windows) or `ifconfig`/`ipconfig getifaddr en0` (Mac).
const BACKEND_URL = 'http://192.168.1.23:8000'; // <-- change this

/**
 * Sends a captured photo to the backend for S3 upload + Rekognition analysis.
 * @param {string} uri - local file uri (native) or blob/object URL (web)
 * @param {Blob} [webBlob] - on web, pass the actual Blob captured from the canvas
 * @returns {Promise<{verdict: 'full'|'not full', s3_key: string}>}
 */
export async function analyzePhoto(uri, webBlob) {
  const formData = new FormData();

  if (Platform.OS === 'web' && webBlob) {
    formData.append('photo', webBlob, 'photo.jpg');
  } else {
    formData.append('photo', {
      uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
  }

  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error (${response.status}): ${text}`);
  }

  return response.json();
}
