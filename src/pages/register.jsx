import React, { useState } from 'react';
import { apiRequest, saveSession } from '../services/api';

export default function RegisterPage({ onLogin, onNavigate }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
        },
      });

      saveSession(data);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.card} className="auth-card">
        <div style={s.logoWrap}>
          <img src="/ppks.png" alt="PPKS" style={s.logo} />
        </div>

        <div style={s.kicker}>REGISTER</div>

        <h1 style={s.title}>Daftar Akun</h1>

        <p style={s.desc}>
          Buat akun untuk menyimpan digitasi dan memantau lahan.
        </p>

        <form onSubmit={submit}>
          <label style={s.label}>Nama Lengkap</label>
          <input
            style={s.input}
            type="text"
            placeholder="Nama lengkap"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="Buat password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <label style={s.label}>Konfirmasi Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="Ulangi password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />

          {error && <div style={s.error}>{error}</div>}

          <button style={s.primaryBtn} type="submit">
            Register
          </button>
        </form>

        <div style={s.bottomRow}>
          <span style={s.bottomText}>Sudah punya akun?</span>
          <button style={s.linkBtn} onClick={() => onNavigate('login')}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

const colors = {
  soft: '#5de70e',
  pastel: '#94D49D',
  medium: '#46AB68',
  dark: '#028739',
  text: '#12351f',
  muted: '#6b7b70',
  page: '#E3FED3',
  card: '#fcfcfc',
  input: '#FFFEF8',
};

const s = {
  page: {
    minHeight: '100svh',
    height: '100svh',
    background: colors.page,
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
  },

  card: {
    width: '100%',
    maxWidth: 390,
    padding: '18px 24px',
    borderRadius: 24,
    background: colors.card,
    color: colors.text,
    border: '1px solid rgba(148, 212, 157, 0.35)',
    boxShadow: '0 20px 55px rgba(18, 53, 31, 0.10)',
  },

  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 8,
  },

  logo: {
    width: 54,
    height: 54,
    objectFit: 'contain',
    borderRadius: 999,
    background: '#fff',
    padding: 5,
    border: `3px solid ${colors.dark}`,
    boxShadow: '0 10px 22px rgba(2, 135, 57, 0.14)',
  },

  kicker: {
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: colors.dark,
    fontWeight: 900,
    textAlign: 'center',
    marginBottom: 6,
  },

  title: {
    margin: 0,
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 1.15,
    letterSpacing: '-0.8px',
    color: colors.text,
  },

  desc: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.muted,
    lineHeight: 1.45,
    fontSize: 13,
    marginBottom: 12,
  },

  label: {
    display: 'block',
    marginTop: 8,
    marginBottom: 5,
    color: colors.text,
    fontWeight: 800,
    fontSize: 13,
  },

  input: {
    width: '100%',
    padding: '10px 13px',
    borderRadius: 14,
    border: '1px solid rgba(148, 212, 157, 0.55)',
    background: colors.input,
    color: colors.text,
    outline: 'none',
    fontSize: 14,
  },

  error: {
    marginTop: 10,
    padding: '9px 11px',
    borderRadius: 12,
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: 13,
  },

  primaryBtn: {
    width: '100%',
    marginTop: 13,
    padding: '11px 14px',
    borderRadius: 14,
    border: 'none',
    background: colors.dark,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: 15,
    boxShadow: '0 12px 24px rgba(2, 135, 57, 0.20)',
  },

  bottomRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 7,
    alignItems: 'center',
    marginTop: 11,
    flexWrap: 'wrap',
  },

  bottomText: {
    color: colors.muted,
    fontSize: 14,
  },

  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.dark,
    cursor: 'pointer',
    padding: 0,
    fontWeight: 900,
    fontSize: 14,
  },
};

const css = `
  html,
  body,
  #root {
    margin: 0;
    width: 100%;
    min-height: 100%;
  }

  body {
    overflow: hidden;
  }

  * {
    box-sizing: border-box;
  }

  input::placeholder {
    color: rgba(18, 53, 31, 0.34);
  }

  input:focus {
    border-color: #46AB68 !important;
    box-shadow: 0 0 0 3px rgba(70, 171, 104, 0.14);
    background: #ffffff !important;
  }

  button {
    transition: transform .18s ease, opacity .18s ease, box-shadow .18s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: .96;
  }

  @media (max-width: 520px) {
    .auth-card {
      max-width: 100% !important;
    }

    button:hover {
      transform: none;
    }
  }
`;