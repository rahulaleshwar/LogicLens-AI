const BASE_URL = '/api';

async function request(url, options = {}) {
  const config = {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An unknown error occurred' }));
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getKeyStatus() {
  return request('/auth/key');
}

export async function connectGeminiKey(apiKey) {
  return request('/auth/key', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey }),
  });
}

export async function disconnectGeminiKey() {
  return request('/auth/key', { method: 'DELETE' });
}

export async function createScan(data) {
  return request('/scans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getScans() {
  return request('/scans');
}

export async function getScan(id) {
  return request(`/scans/${id}`);
}

export async function deleteScan(id) {
  return request(`/scans/${id}`, {
    method: 'DELETE',
  });
}

export async function getReport(id) {
  return request(`/scans/${id}/report`);
}

export async function getScanFindings(id) {
  return request(`/scans/${id}/findings`);
}

export async function getAttackChains(id) {
  return request(`/scans/${id}/attack-chains`);
}

export async function askAnalysis(id, question) {
  return request(`/scans/${id}/analysis/chat`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}
