// Use localhost:3000 if opened as file://, otherwise use current origin
const API_BASE = (window && window.location && window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : (window && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';

async function signup(data) {
  try {
    const res = await fetch(API_BASE + '/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 201) return { ok: true };
    const body = await res.json();
    return { ok: false, error: body.message || body.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function signupAdmin(data) {
  try {
    const res = await fetch(API_BASE + '/api/auth/signup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 201) return { ok: true };
    const body = await res.json();
    return { ok: false, error: body.message || body.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function login(data) {
  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function meReq(token) {
  try {
    const res = await fetch(API_BASE + '/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    return res.json();
  } catch (err) {
    return null;
  }
}

if (typeof module !== 'undefined') module.exports = { signup, signupAdmin, login, meReq }; 
