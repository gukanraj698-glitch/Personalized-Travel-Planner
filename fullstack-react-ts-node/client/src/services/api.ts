const API_BASE = 'http://localhost:5000/api';

export async function fetchFromAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('wanderly_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'API Error' }));
      throw new Error(err.error || 'Server error');
    }
    return await res.json();
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}
