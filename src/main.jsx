import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App          from './app.jsx'
import Dashboard    from './dashboard.jsx'
import Rekomendasi  from './rekomendasi.jsx'
import Digitasi      from './digitasi.jsx'
import 'leaflet/dist/leaflet.css'

function Root() {
  const [page, setPage] = useState('map')

  if (page === 'dashboard')   return <Dashboard   onNavigate={setPage} />
  if (page === 'rekomendasi') return <Rekomendasi onNavigate={setPage} />
  if (page === 'digitasi')    return <Digitasi onNavigate={setPage} />
  return <App onNavigate={setPage} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)