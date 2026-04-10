import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App       from './app.jsx'
import Dashboard from './dashboard.jsx'
import 'leaflet/dist/leaflet.css'

function Root() {
  // 'map' | 'dashboard'
  const [page, setPage] = useState('map')

  return page === 'dashboard'
    ? <Dashboard onNavigate={setPage} />
    : <App       onNavigate={setPage} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)