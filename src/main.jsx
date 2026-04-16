import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import Dashboard from './dashboard.jsx';
import Rekomendasi from './rekomendasi.jsx';
import Digitasi from './digitasi.jsx';
import LoginPage from './pages/login.jsx';
import RegisterPage from './pages/register.jsx';
import UserDashboard from './pages/userDashboard.jsx';
import AdminDashboard from './pages/adminDashboard.jsx';
import LaporanPage from './pages/laporan.jsx';
import { getSession, clearSession } from './services/api';
import 'leaflet/dist/leaflet.css';

function Root() {
  const [session, setSession] = useState(getSession());
  const [page, setPage] = useState(() => {
    const existing = getSession();
    if (!existing) return 'login';
    return existing.user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard';
  });

  const handleLogin = (data) => {
    setSession(data);
    setPage(data.user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setPage('login');
  };

  if (!session) {
    if (page === 'register') {
      return <RegisterPage onLogin={handleLogin} onNavigate={setPage} />;
    }
    return <LoginPage onLogin={handleLogin} onNavigate={setPage} />;
  }

  if (session.user.role === 'admin') {
    return (
      <AdminDashboard
        token={session.token}
        currentUser={session.user}
        onLogout={handleLogout}
      />
    );
  }

  if (page === 'user-dashboard') {
    return (
      <UserDashboard
        token={session.token}
        currentUser={session.user}
        onNavigate={setPage}
        onLogout={handleLogout}
      />
    );
  }

  if (page === 'laporan') {
    return (
      <LaporanPage
        token={session.token}
        onNavigate={setPage}
      />
    );
  }

  if (page === 'dashboard') {
    return <Dashboard onNavigate={setPage} />;
  }

  if (page === 'rekomendasi') {
    return <Rekomendasi onNavigate={setPage} />;
  }

  if (page === 'digitasi') {
    return (
      <Digitasi
        onNavigate={setPage}
        token={session.token}
      />
    );
  }

  return <App onNavigate={setPage} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);