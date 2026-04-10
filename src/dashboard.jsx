import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, LineElement, PointElement,
  RadialLinearScale, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  ArcElement, LineElement, PointElement,
  RadialLinearScale, Filler, Tooltip, Legend
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = 'http://localhost:3001';

const LABELS = {
  1: 'Sangat Rendah',
  2: 'Rendah',
  3: 'Sedang',
  4: 'Tinggi',
  5: 'Sangat Tinggi',
};

const N_COLORS  = ['#1e4d2b','#2d6e3e','#3d9455','#52b96a','#72d48a'];
const MG_COLORS = ['#2e1a4a','#4a2870','#6e3fa0','#9160cc','#b48ae8'];

const TOOLTIP = {
  backgroundColor: 'rgba(10,10,18,0.97)',
  borderColor    : 'rgba(255,255,255,0.07)',
  borderWidth    : 1,
  titleColor     : 'rgba(255,255,255,0.9)',
  bodyColor      : 'rgba(255,255,255,0.5)',
  padding        : 12,
  cornerRadius   : 8,
  titleFont      : { size: 12, weight: '600', family: 'Inter, system-ui, sans-serif' },
  bodyFont       : { size: 11, family: 'Inter, system-ui, sans-serif' },
};

// ─── DATA HOOK ────────────────────────────────────────────────────────────────
function useData() {
  const [d, setD]     = useState(null);
  const [ok, setOk]   = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let dead = false;
    Promise.all([
      fetch(`${API}/api/layer/JABAR_NITROGEN.json/stats`),
      fetch(`${API}/api/layer/JABAR_MAGNESIUM.json/stats`),
      fetch(`${API}/api/layer/JABAR_NITROGEN.json/kabupaten`),
      fetch(`${API}/api/compare?a=JABAR_NITROGEN&b=JABAR_MAGNESIUM`),
      fetch(`${API}/api/layer/JABAR_NITROGEN.json/bbox`),
      fetch(`${API}/api/summary`),
    ])
      .then((rs) => Promise.all(rs.map((r) => r.json())))
      .then(([nSt, mgSt, nKab, cmp, bbox, sum]) => {
        if (!dead) { setD({ nSt, mgSt, nKab, cmp, bbox, sum }); setOk(true); }
      })
      .catch((e) => { if (!dead) setErr(e.message); });
    return () => { dead = true; };
  }, []);

  return { d, ok, err };
}

// ─── LOADING ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a12', gap:20 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.08)', borderTop:'2px solid rgba(255,255,255,0.5)', animation:'sp 0.8s linear infinite' }} />
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', margin:0, letterSpacing:2, fontFamily:'Inter, system-ui, sans-serif' }}>MEMUAT DATA</p>
      <style>{`@keyframes sp{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

function Fail({ msg }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a12', gap:12 }}>
      <p style={{ fontSize:13, color:'rgba(255,90,90,0.8)', margin:0, fontFamily:'Inter, system-ui' }}>Tidak dapat terhubung ke API</p>
      <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:0, maxWidth:360, textAlign:'center', lineHeight:1.8 }}>{msg}</p>
      <code style={{ padding:'8px 16px', background:'rgba(255,255,255,0.04)', borderRadius:6, fontSize:11, color:'rgba(255,255,255,0.3)' }}>node server.js</code>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ value, label, sub, accent, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: '24px 24px 20px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      opacity: show ? 1 : 0,
      transform: show ? 'none' : 'translateY(12px)',
      transition: 'opacity 0.55s ease, transform 0.55s ease',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1, fontFamily: 'Inter, system-ui, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.7 }} />
    </div>
  );
}

// ─── CARD WRAPPER ────────────────────────────────────────────────────────────
function Card({ children, style = {}, p = 24 }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', ...style }}>
      <div style={{ padding: p }}>{children}</div>
    </div>
  );
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
function SHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.1, fontFamily: 'Inter, system-ui, sans-serif' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── PROGRESS ROW ────────────────────────────────────────────────────────────
function PRow({ label, pct, color, count }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
      {count !== undefined && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 5, fontFamily: 'Inter, system-ui, sans-serif' }}>
          {count.toLocaleString()} fitur
        </div>
      )}
    </div>
  );
}

// ─── DETAIL ROW ──────────────────────────────────────────────────────────────
function DRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { d, ok, err } = useData();
  const [tab, setTab]   = useState('overview');
  const [nut, setNut]   = useState('n');
  const [kSearch, setKSearch] = useState('');

  if (!ok && !err) return <Spinner />;
  if (err)         return <Fail msg={err} />;

  const nD   = d.nSt.distribution;
  const mgD  = d.mgSt.distribution;
  const nDom  = d.nSt.dominant_class;
  const mgDom = d.mgSt.dominant_class;
  const isN   = nut === 'n';
  const nCol  = isN ? N_COLORS : MG_COLORS;
  const nDist = isN ? nD : mgD;
  const kabList = (d.nKab?.kabupaten || []).filter((k) => k.toLowerCase().includes(kSearch.toLowerCase()));

  const scaleX = {
    ticks : { color: 'rgba(255,255,255,0.25)', font: { size: 11, family: 'Inter, system-ui, sans-serif' } },
    grid  : { display: false },
    border: { color: 'rgba(255,255,255,0.04)' },
  };
  const scaleY = {
    ticks : { color: 'rgba(255,255,255,0.2)', font: { size: 11, family: 'Inter, system-ui, sans-serif' }, callback: (v) => `${v}%` },
    grid  : { color: 'rgba(255,255,255,0.04)' },
    border: { color: 'rgba(255,255,255,0.04)' },
  };

  // ── Chart data ──────────────────────────────────────────────────────────
  const barData = {
    labels: [1,2,3,4,5].map((k) => LABELS[k]),
    datasets: [{
      data: [1,2,3,4,5].map((k) => nDist[k]?.pct || 0),
      backgroundColor: nCol,
      borderRadius: 5,
      borderSkipped: false,
    }],
  };

  const donutData = {
    labels: [1,2,3,4,5].map((k) => LABELS[k]),
    datasets: [{
      data: [1,2,3,4,5].map((k) => nDist[k]?.count || 0),
      backgroundColor: nCol,
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const lineData = {
    labels: [1,2,3,4,5].map((k) => LABELS[k]),
    datasets: [
      { label: 'Nitrogen', data: [1,2,3,4,5].map((k) => nD[k]?.pct || 0), borderColor: '#52b96a', backgroundColor: 'rgba(82,185,106,0.07)', pointBackgroundColor: '#52b96a', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4 },
      { label: 'Magnesium', data: [1,2,3,4,5].map((k) => mgD[k]?.pct || 0), borderColor: '#9160cc', backgroundColor: 'rgba(145,96,204,0.07)', pointBackgroundColor: '#9160cc', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4 },
    ],
  };

  const cmpData = {
    labels: [1,2,3,4,5].map((k) => LABELS[k]),
    datasets: [
      { label: 'Nitrogen', data: [1,2,3,4,5].map((k) => d.cmp.comparison_by_class[k]?.['JABAR_NITROGEN.json']?.pct || 0), backgroundColor: 'rgba(82,185,106,0.55)', borderColor: '#52b96a', borderWidth: 1, borderRadius: 4 },
      { label: 'Magnesium', data: [1,2,3,4,5].map((k) => d.cmp.comparison_by_class[k]?.['JABAR_MAGNESIUM.json']?.pct || 0), backgroundColor: 'rgba(145,96,204,0.55)', borderColor: '#9160cc', borderWidth: 1, borderRadius: 4 },
    ],
  };

  const radarData = {
    labels: [1,2,3,4,5].map((k) => LABELS[k]),
    datasets: [
      { label: 'Nitrogen', data: [1,2,3,4,5].map((k) => nD[k]?.pct || 0), borderColor: '#52b96a', backgroundColor: 'rgba(82,185,106,0.1)', pointBackgroundColor: '#52b96a', borderWidth: 2, pointRadius: 3 },
      { label: 'Magnesium', data: [1,2,3,4,5].map((k) => mgD[k]?.pct || 0), borderColor: '#9160cc', backgroundColor: 'rgba(145,96,204,0.1)', pointBackgroundColor: '#9160cc', borderWidth: 2, pointRadius: 3 },
    ],
  };

  const legendLabels = {
    color: 'rgba(255,255,255,0.4)',
    font: { size: 11, family: 'Inter, system-ui, sans-serif' },
    boxWidth: 10,
    padding: 16,
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          {[
            { id: 'overview',  label: 'Overview' },
            { id: 'compare',   label: 'Perbandingan' },
            { id: 'kabupaten', label: 'Kabupaten' },
            { id: 'detail',    label: 'Detail Data' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="db-tab"
              style={{ ...S.tabBtn, ...(tab === t.id ? S.tabOn : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.headerRight}>
          {/* Nutrient toggle — pill style */}
          <div style={S.nutGroup}>
            <button onClick={() => setNut('n')} className="db-nut"
              style={{ ...S.nutBtn, ...(nut === 'n' ? { background: '#52b96a', color: '#fff', borderColor: '#52b96a' } : {}) }}>
              Nitrogen
            </button>
            <button onClick={() => setNut('mg')} className="db-nut"
              style={{ ...S.nutBtn, ...(nut === 'mg' ? { background: '#9160cc', color: '#fff', borderColor: '#9160cc' } : {}) }}>
              Magnesium
            </button>
          </div>

          <button onClick={() => onNavigate('map')} style={S.mapBtn} className="db-map">
            ← Kembali ke Peta
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={S.main}>

        {/* ════ OVERVIEW ════ */}
        {tab === 'overview' && (
          <div style={S.page}>
            {/* Stat cards */}
            <div style={S.statRow}>
              <StatCard value={d.nSt.total_features.toLocaleString()} label="Total Fitur Nitrogen"  sub="JABAR_NITROGEN.json"  accent="#52b96a" delay={0}   />
              <StatCard value={d.mgSt.total_features.toLocaleString()} label="Total Fitur Magnesium" sub="JABAR_MAGNESIUM.json" accent="#9160cc" delay={80}  />
              <StatCard value={d.nKab?.total_kabupaten || 0}           label="Total Kabupaten"       sub="Jawa Barat"           accent="#60a5fa" delay={160} />
              <StatCard value={`Kelas ${nDom?.code}`}                  label="Kelas Dominan — N"    sub={nDom?.label}          accent="#f59e0b" delay={240} />
            </div>

            {/* Bar + Donut */}
            <div style={S.g2}>
              <Card>
                <SHead title={`Distribusi Kelas — ${isN ? 'Nitrogen' : 'Magnesium'}`} sub="Persentase per kelas gridcode (1–5)" />
                <div style={{ height: 210 }}>
                  <Bar data={barData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: TOOLTIP },
                    scales: { x: scaleX, y: scaleY },
                  }} />
                </div>
              </Card>

              <Card>
                <SHead title={`Proporsi Kelas — ${isN ? 'Nitrogen' : 'Magnesium'}`} sub="Jumlah fitur per kelas" />
                <div style={{ height: 210 }}>
                  <Doughnut data={donutData} options={{
                    responsive: true, maintainAspectRatio: false, cutout: '66%',
                    plugins: {
                      legend: { position: 'right', labels: legendLabels },
                      tooltip: { ...TOOLTIP, callbacks: { label: (i) => ` ${i.raw.toLocaleString()} fitur` } },
                    },
                  }} />
                </div>
              </Card>
            </div>

            {/* Line */}
            <Card>
              <SHead title="Tren Distribusi — Nitrogen vs Magnesium" sub="Perbandingan persentase per kelas gridcode" />
              <div style={{ height: 190 }}>
                <Line data={lineData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { labels: legendLabels }, tooltip: TOOLTIP },
                  scales: { x: scaleX, y: scaleY },
                }} />
              </div>
            </Card>

            {/* Table */}
            <Card p={0}>
              <div style={{ padding: '20px 24px 16px' }}>
                <SHead title="Ringkasan Distribusi" sub="Jumlah dan persentase fitur per kelas" />
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Kelas', 'Label', 'N — Fitur', 'N — %', 'Mg — Fitur', 'Mg — %'].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5].map((k) => (
                    <tr key={k} className="db-tr" style={S.tr}>
                      <td style={S.td}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:N_COLORS[k-1], display:'inline-block' }} />
                          {k}
                        </span>
                      </td>
                      <td style={S.td}>{LABELS[k]}</td>
                      <td style={{ ...S.td, color:'#52b96a' }}>{nD[k]?.count?.toLocaleString()}</td>
                      <td style={{ ...S.td, color:'rgba(82,185,106,0.6)' }}>{nD[k]?.pct}%</td>
                      <td style={{ ...S.td, color:'#9160cc' }}>{mgD[k]?.count?.toLocaleString()}</td>
                      <td style={{ ...S.td, color:'rgba(145,96,204,0.6)' }}>{mgD[k]?.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ════ COMPARE ════ */}
        {tab === 'compare' && (
          <div style={S.page}>
            {/* Diff strip */}
            <div style={{ display:'flex', gap:12 }}>
              {[1,2,3,4,5].map((k) => {
                const c    = d.cmp.comparison_by_class[k];
                const diff = c?.diff_pct ?? 0;
                const pos  = diff >= 0;
                return (
                  <div key={k} style={{ flex:1, padding:'20px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12 }}>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:10, fontFamily:'Inter, system-ui' }}>{LABELS[k]}</div>
                    <div style={{ fontSize:24, fontWeight:700, color: pos ? '#52b96a' : '#9160cc', fontFamily:'Inter, system-ui, sans-serif', letterSpacing:'-0.5px' }}>
                      {pos ? '+' : ''}{diff}%
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:4, marginBottom:14 }}>N vs Mg</div>
                    <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, marginBottom:5 }}>
                      <div style={{ height:'100%', width:`${c?.['JABAR_NITROGEN.json']?.pct||0}%`, background:'#52b96a', borderRadius:2 }} />
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, marginBottom:8 }}>
                      <div style={{ height:'100%', width:`${c?.['JABAR_MAGNESIUM.json']?.pct||0}%`, background:'#9160cc', borderRadius:2 }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, color:'rgba(82,185,106,0.6)', fontFamily:'Inter, system-ui' }}>N {c?.['JABAR_NITROGEN.json']?.pct||0}%</span>
                      <span style={{ fontSize:10, color:'rgba(145,96,204,0.6)', fontFamily:'Inter, system-ui' }}>Mg {c?.['JABAR_MAGNESIUM.json']?.pct||0}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grouped bar */}
            <Card>
              <SHead title="Perbandingan Distribusi" sub="N vs Mg per kelas gridcode" />
              <div style={{ height: 240 }}>
                <Bar data={cmpData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { labels: legendLabels }, tooltip: TOOLTIP },
                  scales: { x: scaleX, y: scaleY },
                }} />
              </div>
            </Card>

            <div style={S.g2}>
              {/* Radar */}
              <Card>
                <SHead title="Radar Profil" sub="Distribusi kelas dalam bentuk radar" />
                <div style={{ height: 250 }}>
                  <Radar data={radarData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: legendLabels }, tooltip: TOOLTIP },
                    scales: { r: {
                      ticks       : { color:'rgba(255,255,255,0.2)', backdropColor:'transparent', font:{ size:10, family:'Inter, system-ui' }, callback:(v)=>`${v}%` },
                      grid        : { color:'rgba(255,255,255,0.06)' },
                      pointLabels : { color:'rgba(255,255,255,0.35)', font:{ size:10, family:'Inter, system-ui' } },
                      angleLines  : { color:'rgba(255,255,255,0.06)' },
                    }},
                  }} />
                </div>
              </Card>

              {/* Insight */}
              <Card>
                <SHead title="Insight" sub="Ringkasan analitik otomatis" />
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'Kelas Dominan N',  val:`Kelas ${nDom?.code} — ${nDom?.label}`,   pct:`${nDom?.pct}%`,  color:'#52b96a' },
                    { label:'Kelas Dominan Mg', val:`Kelas ${mgDom?.code} — ${mgDom?.label}`, pct:`${mgDom?.pct}%`, color:'#9160cc' },
                    { label:'Total Fitur N',    val:d.nSt.total_features.toLocaleString(),     pct:'100%',           color:'#52b96a' },
                    { label:'Total Fitur Mg',   val:d.mgSt.total_features.toLocaleString(),    pct:'100%',           color:'#9160cc' },
                  ].map((item) => (
                    <div key={item.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:item.color, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontFamily:'Inter, system-ui' }}>{item.label}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:item.color, marginTop:3, fontFamily:'Inter, system-ui' }}>{item.val}</div>
                      </div>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)', fontFamily:'Inter, system-ui' }}>{item.pct}</span>
                    </div>
                  ))}

                  <div style={{ padding:'12px 14px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:8, fontSize:12, color:'rgba(245,158,11,0.85)', lineHeight:1.6, fontFamily:'Inter, system-ui' }}>
                    Perbedaan terbesar N vs Mg ada di kelas {(() => {
                      const mx = [1,2,3,4,5].reduce((m,k) => {
                        const v = Math.abs(d.cmp.comparison_by_class[k]?.diff_pct||0);
                        return v > m.v ? { k, v } : m;
                      }, { k:1, v:0 });
                      return `${mx.k} (${LABELS[mx.k]})`;
                    })()}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════ KABUPATEN ════ */}
        {tab === 'kabupaten' && (
          <div style={S.page}>
            <div style={S.statRow}>
              <StatCard value={d.nKab?.total_kabupaten || 0} label="Total Kabupaten"    sub="Jawa Barat"   accent="#60a5fa" delay={0}   />
              <StatCard value={`${d.nKab?.total_kabupaten || 0}`} label="Coverage N"    sub="Nitrogen"     accent="#52b96a" delay={80}  />
              <StatCard value={`${d.nKab?.total_kabupaten || 0}`} label="Coverage Mg"   sub="Magnesium"    accent="#9160cc" delay={160} />
              <StatCard value="Jawa Barat"                        label="Provinsi"       sub="38 Kabupaten" accent="#fb923c" delay={240} />
            </div>

            <Card>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <SHead title={`${kabList.length} Kabupaten`} sub="Data tersedia di kedua layer nutrisi" />
                <input
                  value={kSearch}
                  onChange={(e) => setKSearch(e.target.value)}
                  placeholder="Cari kabupaten..."
                  style={S.search}
                />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {kabList.map((kab, i) => (
                  <div key={kab} className="db-kab" style={S.kabCard}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', minWidth:22, fontFamily:'Inter, system-ui' }}>{String(i+1).padStart(2,'0')}</span>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)', flex:1, fontFamily:'Inter, system-ui' }}>{kab}</span>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#52b96a', display:'block' }} />
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#9160cc', display:'block' }} />
                  </div>
                ))}
                {kabList.length === 0 && (
                  <div style={{ gridColumn:'span 4', textAlign:'center', padding:40, fontSize:12, color:'rgba(255,255,255,0.2)', fontFamily:'Inter, system-ui' }}>
                    Tidak ditemukan
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ════ DETAIL ════ */}
        {tab === 'detail' && (
          <div style={S.page}>

            {/* Info cards + progress bars */}
            <div style={S.g2}>

              {/* Nitrogen */}
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#52b96a' }} />
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:'#fff', fontFamily:'Inter, system-ui' }}>Nitrogen (N)</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>JABAR_NITROGEN.json</div>
                  </div>
                </div>

                <DRow label="Total Fitur"    value={d.nSt.total_features.toLocaleString()} />
                <DRow label="Kelas Dominan"  value={`${nDom?.label} (${nDom?.pct}%)`} />
                <DRow label="Range Gridcode" value={`${d.nSt.gridcode_range?.min} – ${d.nSt.gridcode_range?.max}`} />
                <DRow label="Bounding Box SW" value={`${d.bbox.bounding_box?.min_lat?.toFixed(4)}, ${d.bbox.bounding_box?.min_lng?.toFixed(4)}`} />
                <DRow label="Bounding Box NE" value={`${d.bbox.bounding_box?.max_lat?.toFixed(4)}, ${d.bbox.bounding_box?.max_lng?.toFixed(4)}`} />
                <DRow label="Center"         value={`${d.bbox.center?.lat}, ${d.bbox.center?.lng}`} />
                <DRow label="Luas (deg²)"    value={d.bbox.area_deg2} />

                <div style={{ marginTop:28 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', letterSpacing:1.2, marginBottom:18, fontFamily:'Inter, system-ui' }}>DISTRIBUSI PER KELAS</div>
                  {[1,2,3,4,5].map((k) => (
                    <PRow key={k} label={LABELS[k]} pct={nD[k]?.pct||0} color={N_COLORS[k-1]} count={nD[k]?.count} />
                  ))}
                </div>
              </Card>

              {/* Magnesium */}
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#9160cc' }} />
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:'#fff', fontFamily:'Inter, system-ui' }}>Magnesium (Mg)</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>JABAR_MAGNESIUM.json</div>
                  </div>
                </div>

                <DRow label="Total Fitur"    value={d.mgSt.total_features.toLocaleString()} />
                <DRow label="Kelas Dominan"  value={`${mgDom?.label} (${mgDom?.pct}%)`} />
                <DRow label="Range Gridcode" value={`${d.mgSt.gridcode_range?.min} – ${d.mgSt.gridcode_range?.max}`} />

                <div style={{ marginTop:28 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', letterSpacing:1.2, marginBottom:18, fontFamily:'Inter, system-ui' }}>DISTRIBUSI PER KELAS</div>
                  {[1,2,3,4,5].map((k) => (
                    <PRow key={k} label={LABELS[k]} pct={mgD[k]?.pct||0} color={MG_COLORS[k-1]} count={mgD[k]?.count} />
                  ))}
                </div>

                {/* Mini bar chart compare di card Mg */}
                <div style={{ marginTop:32 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', letterSpacing:1.2, marginBottom:18, fontFamily:'Inter, system-ui' }}>PERBANDINGAN DENGAN N</div>
                  <div style={{ height:160 }}>
                    <Bar
                      data={{
                        labels: [1,2,3,4,5].map((k) => `K${k}`),
                        datasets: [
                          { label:'N', data:[1,2,3,4,5].map((k)=>nD[k]?.pct||0), backgroundColor:'rgba(82,185,106,0.6)', borderColor:'#52b96a', borderWidth:1, borderRadius:3 },
                          { label:'Mg', data:[1,2,3,4,5].map((k)=>mgD[k]?.pct||0), backgroundColor:'rgba(145,96,204,0.6)', borderColor:'#9160cc', borderWidth:1, borderRadius:3 },
                        ],
                      }}
                      options={{
                        responsive:true, maintainAspectRatio:false,
                        plugins:{ legend:{ labels:{ ...legendLabels, font:{ size:10, family:'Inter, system-ui' } } }, tooltip:TOOLTIP },
                        scales:{ x:scaleX, y:scaleY },
                      }}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Summary stats */}
            <div style={S.g2}>
              <Card>
                <SHead title="Ringkasan Statistik — Nitrogen" sub="Distribusi lengkap per kelas" />
                <table style={S.table}>
                  <thead>
                    <tr>{['Kelas','Label','Fitur','%'].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[1,2,3,4,5].map((k) => (
                      <tr key={k} className="db-tr" style={S.tr}>
                        <td style={S.td}><span style={{ width:8, height:8, borderRadius:2, background:N_COLORS[k-1], display:'inline-block', marginRight:8 }} />{k}</td>
                        <td style={S.td}>{LABELS[k]}</td>
                        <td style={{ ...S.td, color:'#52b96a' }}>{nD[k]?.count?.toLocaleString()}</td>
                        <td style={{ ...S.td, color:'rgba(82,185,106,0.6)' }}>{nD[k]?.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card>
                <SHead title="Ringkasan Statistik — Magnesium" sub="Distribusi lengkap per kelas" />
                <table style={S.table}>
                  <thead>
                    <tr>{['Kelas','Label','Fitur','%'].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[1,2,3,4,5].map((k) => (
                      <tr key={k} className="db-tr" style={S.tr}>
                        <td style={S.td}><span style={{ width:8, height:8, borderRadius:2, background:MG_COLORS[k-1], display:'inline-block', marginRight:8 }} />{k}</td>
                        <td style={S.td}>{LABELS[k]}</td>
                        <td style={{ ...S.td, color:'#9160cc' }}>{mgD[k]?.count?.toLocaleString()}</td>
                        <td style={{ ...S.td, color:'rgba(145,96,204,0.6)' }}>{mgD[k]?.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  root  : { minHeight:'100vh', background:'#0a0a12', color:'#fff', fontFamily:'Inter, system-ui, sans-serif' },
  header: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 28px', height:52,
    borderBottom:'1px solid rgba(255,255,255,0.06)',
    position:'sticky', top:0,
    background:'rgba(10,10,18,0.92)',
    backdropFilter:'blur(16px)',
    zIndex:100,
  },
  headerLeft : { display:'flex', alignItems:'center', gap:2 },
  headerRight: { display:'flex', alignItems:'center', gap:10 },

  tabBtn: {
    padding:'6px 16px', fontSize:12, fontWeight:500, background:'none', border:'none',
    cursor:'pointer', color:'rgba(255,255,255,0.35)', borderRadius:7,
    transition:'all 0.15s', fontFamily:'Inter, system-ui, sans-serif',
  },
  tabOn: { color:'#fff', background:'rgba(255,255,255,0.08)' },

  nutGroup: { display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:3, gap:2 },
  nutBtn  : {
    padding:'5px 14px', fontSize:12, fontWeight:500, border:'none',
    borderRadius:6, cursor:'pointer',
    color:'rgba(255,255,255,0.4)', background:'transparent',
    transition:'all 0.2s', fontFamily:'Inter, system-ui, sans-serif',
  },

  mapBtn: {
    padding:'6px 14px', fontSize:12, fontWeight:500, background:'none',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, cursor:'pointer',
    color:'rgba(255,255,255,0.45)', transition:'all 0.15s',
    fontFamily:'Inter, system-ui, sans-serif',
  },

  main   : { padding:'28px', maxWidth:1440, margin:'0 auto' },
  page   : { display:'flex', flexDirection:'column', gap:18 },
  statRow: { display:'flex', gap:12 },
  g2     : { display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 },

  table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th   : { padding:'10px 20px', textAlign:'left', fontSize:11, fontWeight:500, color:'rgba(255,255,255,0.25)', letterSpacing:0.5, borderBottom:'1px solid rgba(255,255,255,0.06)', fontFamily:'Inter, system-ui, sans-serif' },
  tr   : { borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' },
  td   : { padding:'12px 20px', color:'rgba(255,255,255,0.65)', fontSize:13, fontFamily:'Inter, system-ui, sans-serif' },

  search : { padding:'7px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, color:'#fff', fontSize:12, outline:'none', width:200, fontFamily:'Inter, system-ui, sans-serif' },
  kabCard: { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, transition:'all 0.15s', cursor:'default' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing:border-box; }
  body { margin:0; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }
  .db-tab:hover  { color:rgba(255,255,255,0.75) !important; background:rgba(255,255,255,0.06) !important; }
  .db-nut:hover  { opacity:0.85 !important; }
  .db-map:hover  { color:rgba(255,255,255,0.7) !important; border-color:rgba(255,255,255,0.2) !important; }
  .db-tr:hover   { background:rgba(255,255,255,0.03) !important; }
  .db-kab:hover  { background:rgba(255,255,255,0.05) !important; border-color:rgba(255,255,255,0.1) !important; }
  @keyframes sp  { to { transform:rotate(360deg); } }
`;