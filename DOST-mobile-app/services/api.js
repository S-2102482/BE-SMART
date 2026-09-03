// Base URL of the FastAPI backend. Point this at your deployed API,
// or your local machine's LAN IP when testing with Expo Go
// (e.g. "http://192.168.1.50:8082" — "localhost" won't work from a phone).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8082';

// How long to wait before giving up on a stalled/unreachable connection.
// fetch() has no built-in timeout, so without this a bad connection can
// hang far longer than feels acceptable to the user.

/**
 * Uploads a captured photo for bin-fullness analysis.
 * Returns: { verdict: "full" | "not full", s3_key: string }
 * Throws on timeout, network failure, or a non-2xx response from the API —
 * callers (e.g. BinPhotoScreen) should wrap this in try/catch.
 */
export async function analyzePhoto(photoUri) {
  const formData = new FormData();
  formData.append('photo', {
    uri: photoUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let detail = `Analysis failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // fallback if response isn't JSON
    }
    throw new Error(detail);
  }

  return response.json();
}