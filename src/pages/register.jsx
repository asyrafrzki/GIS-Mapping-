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

      <div style={s.card} className="glass">
        <div style={s.logoWrap}>
          <img src="/ppks.png" alt="PPKS" style={s.logo} />
        </div>

        <div style={s.kicker}>REGISTER</div>
        <h1 style={s.title}>Daftar Akun SoilMap</h1>
        <p style={s.desc}>
          Buat akun untuk memantau lahan, menyimpan digitasi, dan mengirim laporan.
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

const primary = '#12b24b';

const s = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top right, rgba(18,178,75,0.14), transparent 24%), linear-gradient(135deg, #020817 0%, #06111f 45%, #071827 100%)',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    padding: 32,
    borderRadius: 28,
    color: '#fff',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 88,
    height: 88,
    objectFit: 'contain',
    borderRadius: 999,
    background: '#fff',
    padding: 6,
    boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#82f2a8',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    margin: 0,
    textAlign: 'center',
    fontSize: 34,
    letterSpacing: '-1px',
  },
  desc: {
    marginTop: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.64)',
    lineHeight: 1.8,
    fontSize: 15,
    marginBottom: 22,
  },
  label: {
    display: 'block',
    marginTop: 14,
    marginBottom: 8,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: 600,
    fontSize: 14,
  },
  input: {
    width: '100%',
    padding: '15px 16px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.045)',
    color: '#fff',
    outline: 'none',
    fontSize: 15,
  },
  error: {
    marginTop: 14,
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(239,68,68,0.14)',
    border: '1px solid rgba(239,68,68,0.22)',
    color: '#fca5a5',
    fontSize: 14,
  },
  primaryBtn: {
    width: '100%',
    marginTop: 22,
    padding: '15px 16px',
    borderRadius: 16,
    border: 'none',
    background: `linear-gradient(135deg, ${primary} 0%, #16a34a 100%)`,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 16,
    boxShadow: '0 14px 28px rgba(18,178,75,0.2)',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
  },
  bottomText: {
    color: 'rgba(255,255,255,0.6)',
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#5ab8ff',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 700,
    fontSize: 15,
  },
};

const css = `
  * { box-sizing: border-box; }

  .glass {
    background: rgba(10,18,32,0.84);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(14px);
    box-shadow: 0 18px 60px rgba(0,0,0,0.28);
  }

  input::placeholder {
    color: rgba(255,255,255,0.28);
  }

  button {
    transition: transform .18s ease, opacity .18s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: .97;
  }

  @media (max-width: 640px) {
    button:hover {
      transform: none;
    }
  }
`;