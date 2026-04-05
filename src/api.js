const BASE = 'http://localhost:5000/api';
const TIMEOUT_MS = 3000; // 3 second timeout

const headers = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Fetch with timeout + graceful failure
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    console.warn('[API] Backend unreachable, using local fallback:', url);
    return { error: 'backend_offline' };
  }
}

export const api = {
  register: (data) => fetchWithTimeout(`${BASE}/auth/register`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }),
  login: (data) => fetchWithTimeout(`${BASE}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }),
  me: (token) => fetchWithTimeout(`${BASE}/auth/me`, { headers: headers(token) }),
  saveKyc: (token, data) => fetchWithTimeout(`${BASE}/user/kyc`, { method: 'POST', headers: headers(token), body: JSON.stringify(data) }),
  getPlaces: () => fetchWithTimeout(`${BASE}/places`),
  getHostPlaces: (hostId) => fetchWithTimeout(`${BASE}/places/host/${hostId}`),
  createPlace: (token, data) => fetchWithTimeout(`${BASE}/places`, { method: 'POST', headers: headers(token), body: JSON.stringify(data) }),
  updateFood: (token, id, foodMenu) => fetchWithTimeout(`${BASE}/places/${id}/food`, { method: 'POST', headers: headers(token), body: JSON.stringify({ foodMenu }) }),
  updateMustVisit: (token, id, mustVisit) => fetchWithTimeout(`${BASE}/places/${id}/mustvisit`, { method: 'POST', headers: headers(token), body: JSON.stringify({ mustVisit }) }),
  getUserChats: (userId) => fetchWithTimeout(`${BASE}/chats/user/${userId}`),
  getHostChats: (hostId) => fetchWithTimeout(`${BASE}/chats/host/${hostId}`),
  createChat: (token, data) => fetchWithTimeout(`${BASE}/chats`, { method: 'POST', headers: headers(token), body: JSON.stringify(data) }),
  sendMessage: (token, id, text, senderName) => fetchWithTimeout(`${BASE}/chats/${id}/message`, { method: 'POST', headers: headers(token), body: JSON.stringify({ text, senderName }) }),
  acceptOffer: (token, id, userName) => fetchWithTimeout(`${BASE}/chats/${id}/accept-offer`, { method: 'POST', headers: headers(token), body: JSON.stringify({ userName }) }),
  confirmChat: (token, id, isGroup, finalPrice) => fetchWithTimeout(`${BASE}/chats/${id}/confirm`, { method: 'POST', headers: headers(token), body: JSON.stringify({ isGroup, finalPrice }) }),
  saveFoodSelection: (token, id, foodSelection, totalFoodCost) => fetchWithTimeout(`${BASE}/chats/${id}/food`, { method: 'POST', headers: headers(token), body: JSON.stringify({ foodSelection, totalFoodCost }) }),
  sendEmergency: (token, id, message) => fetchWithTimeout(`${BASE}/chats/${id}/emergency`, { method: 'POST', headers: headers(token), body: JSON.stringify({ message }) }),
  getWeather: (location) => fetchWithTimeout(`${BASE}/weather/${encodeURIComponent(location)}`),
  getTransport: (from, to) => fetchWithTimeout(`${BASE}/transport?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};
