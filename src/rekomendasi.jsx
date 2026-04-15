import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = 'http://localhost:3001';

// ─── REKOMENDASI PUPUK ────────────────────────────────────────────────────────
// Berdasarkan standar pemupukan Kementan RI
const REKOMEN = {
  nitrogen: {
    label    : 'Nitrogen (N)',
    satuan   : 'ppm',
    warna    : '#52b96a',
    kelas: {
      1: {
        label     : 'Sangat Rendah',
        range     : '< 0.1%',
        status    : 'Kritis',
        statusColor: '#ef4444',
        deskripsi : 'Tanah sangat kekurangan Nitrogen. Pertumbuhan tanaman terhambat, daun menguning.',
        pupuk: [
          { nama: 'Urea (46% N)',      dosis: '200–300 kg/ha', waktu: 'Awal tanam + 30 HST', prioritas: 'utama' },
          { nama: 'ZA (21% N)',         dosis: '100–150 kg/ha', waktu: 'Susulan 45 HST',      prioritas: 'utama' },
          { nama: 'Pupuk Organik',      dosis: '5–10 ton/ha',  waktu: 'Sebelum tanam',        prioritas: 'pendukung' },
          { nama: 'NPK (15-15-15)',     dosis: '200 kg/ha',    waktu: 'Awal tanam',           prioritas: 'alternatif' },
        ],
        estimasi_biaya: 'Rp 1.200.000 – 2.000.000/ha',
        catatan: 'Lakukan pemupukan bertahap. Hindari pemberian sekaligus untuk mencegah pencucian.',
      },
      2: {
        label     : 'Rendah',
        range     : '0.1–0.2%',
        status    : 'Perlu Perhatian',
        statusColor: '#f97316',
        deskripsi : 'Kandungan Nitrogen kurang dari optimal. Disarankan pemupukan rutin setiap musim tanam.',
        pupuk: [
          { nama: 'Urea (46% N)',   dosis: '150–200 kg/ha', waktu: 'Awal tanam + 30 HST', prioritas: 'utama' },
          { nama: 'NPK (15-15-15)', dosis: '150 kg/ha',     waktu: 'Awal tanam',          prioritas: 'utama' },
          { nama: 'Pupuk Organik',  dosis: '3–5 ton/ha',   waktu: 'Sebelum tanam',        prioritas: 'pendukung' },
        ],
        estimasi_biaya: 'Rp 800.000 – 1.400.000/ha',
        catatan: 'Kombinasikan dengan bahan organik untuk meningkatkan efisiensi serapan.',
      },
      3: {
        label     : 'Sedang',
        range     : '0.2–0.5%',
        status    : 'Cukup',
        statusColor: '#eab308',
        deskripsi : 'Kandungan Nitrogen cukup untuk pertumbuhan normal. Pemupukan pemeliharaan tetap diperlukan.',
        pupuk: [
          { nama: 'Urea (46% N)', dosis: '100–150 kg/ha', waktu: '30–45 HST',    prioritas: 'utama' },
          { nama: 'NPK (12-12-17)', dosis: '100 kg/ha',   waktu: 'Awal tanam',   prioritas: 'pendukung' },
          { nama: 'Kompos',        dosis: '2–3 ton/ha',   waktu: 'Sebelum tanam', prioritas: 'pendukung' },
        ],
        estimasi_biaya: 'Rp 500.000 – 900.000/ha',
        catatan: 'Lakukan uji tanah berkala setiap 2 musim tanam untuk memantau perubahan status.',
      },
      4: {
        label     : 'Tinggi',
        range     : '0.5–0.75%',
        status    : 'Baik',
        statusColor: '#22c55e',
        deskripsi : 'Kandungan Nitrogen sudah baik. Kurangi dosis pemupukan nitrogen untuk efisiensi biaya.',
        pupuk: [
          { nama: 'NPK (12-12-17)', dosis: '50–75 kg/ha', waktu: 'Awal tanam',  prioritas: 'pendukung' },
          { nama: 'Pupuk Organik',  dosis: '1–2 ton/ha',  waktu: 'Sebelum tanam', prioritas: 'pendukung' },
        ],
        estimasi_biaya: 'Rp 200.000 – 400.000/ha',
        catatan: 'Prioritaskan pupuk kalium dan fosfor untuk keseimbangan nutrisi.',
      },
      5: {
        label     : 'Sangat Tinggi',
        range     : '> 0.75%',
        status    : 'Optimal',
        statusColor: '#16a34a',
        deskripsi : 'Kandungan Nitrogen sangat mencukupi. Tidak diperlukan pupuk Nitrogen tambahan.',
        pupuk: [
          { nama: 'Pupuk Organik', dosis: '0.5–1 ton/ha', waktu: 'Opsional', prioritas: 'opsional' },
        ],
        estimasi_biaya: 'Rp 100.000 – 200.000/ha',
        catatan: 'Fokus pada pemeliharaan struktur tanah. Tambahan N justru berisiko penyakit tanaman.',
      },
    },
  },
  magnesium: {
    label    : 'Magnesium (Mg)',
    satuan   : 'me/100g',
    warna    : '#9160cc',
    kelas: {
      1: {
        label     : 'Sangat Rendah',
        range     : '< 0.3',
        status    : 'Kritis',
        statusColor: '#ef4444',
        deskripsi : 'Kekurangan Magnesium parah. Gejala klorosis (daun menguning di antara tulang daun).',
        pupuk: [
          { nama: 'Kieserit (MgSO₄)',    dosis: '150–200 kg/ha', waktu: 'Sebelum tanam',      prioritas: 'utama' },
          { nama: 'Dolomit (CaMg(CO₃)₂)', dosis: '1.5–2 ton/ha', waktu: 'Sebelum tanam',      prioritas: 'utama' },
          { nama: 'Pupuk Daun Mg',        dosis: '2–3 kg/ha',     waktu: 'Semprot 30 & 60 HST', prioritas: 'pendukung' },
        ],
        estimasi_biaya: 'Rp 900.000 – 1.500.000/ha',
        catatan: 'Aplikasikan dolomit sekaligus untuk memperbaiki pH dan Mg tanah.',
      },
      2: {
        label     : 'Rendah',
        range     : '0.3–0.6',
        status    : 'Perlu Perhatian',
        statusColor: '#f97316',
        deskripsi : 'Kandungan Magnesium di bawah optimal. Perlu penambahan secara rutin.',
        pupuk: [
          { nama: 'Kieserit (MgSO₄)',    dosis: '100–150 kg/ha', waktu: 'Sebelum tanam',  prioritas: 'utama' },
          { nama: 'Dolomit',              dosis: '1–1.5 ton/ha',  waktu: 'Sebelum tanam',  prioritas: 'utama' },
          { nama: 'NPK Mg (12-12-17-2)', dosis: '150 kg/ha',     waktu: 'Awal tanam',     prioritas: 'alternatif' },
        ],
        estimasi_biaya: 'Rp 600.000 – 1.100.000/ha',
        catatan: 'Hindari pemupukan K berlebih yang menghambat serapan Mg.',
      },
      3: {
        label     : 'Sedang',
        range     : '0.6–1.0',
        status    : 'Cukup',
        statusColor: '#eab308',
        deskripsi : 'Kandungan Magnesium cukup. Pemeliharaan dengan pupuk organik sudah memadai.',
        pupuk: [
          { nama: 'Dolomit',       dosis: '500 kg/ha',  waktu: 'Per 2 musim tanam', prioritas: 'pendukung' },
          { nama: 'Kompos/Bokashi', dosis: '2–3 ton/ha', waktu: 'Sebelum tanam',    prioritas: 'pendukung' },
        ],
        estimasi_biaya: 'Rp 300.000 – 600.000/ha',
        catatan: 'Monitor pH tanah agar tetap 5.5–6.5 untuk serapan Mg optimal.',
      },
      4: {
        label     : 'Tinggi',
        range     : '1.0–2.0',
        status    : 'Baik',
        statusColor: '#22c55e',
        deskripsi : 'Kandungan Magnesium baik. Tidak perlu penambahan pupuk Mg khusus.',
        pupuk: [
          { nama: 'Pupuk Organik', dosis: '1 ton/ha', waktu: 'Sebelum tanam', prioritas: 'opsional' },
        ],
        estimasi_biaya: 'Rp 100.000 – 250.000/ha',
        catatan: 'Fokus pada keseimbangan rasio K:Mg:Ca dalam pengelolaan tanah.',
      },
      5: {
        label     : 'Sangat Tinggi',
        range     : '> 2.0',
        status    : 'Optimal',
        statusColor: '#16a34a',
        deskripsi : 'Kandungan Magnesium sangat baik. Tidak diperlukan pupuk Mg.',
        pupuk: [
          { nama: 'Tidak diperlukan', dosis: '—', waktu: '—', prioritas: 'tidak perlu' },
        ],
        estimasi_biaya: '—',
        catatan: 'Perhatikan rasio Mg:K. Mg terlalu tinggi bisa menghambat serapan K dan Ca.',
      },
    },
  },
};

// Warna prioritas
const PRIORITAS_COLOR = {
  utama       : { bg: 'rgba(82,185,106,0.12)', border: 'rgba(82,185,106,0.3)', text: '#52b96a' },
  pendukung   : { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', text: '#60a5fa' },
  alternatif  : { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
  opsional    : { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' },
  'tidak perlu': { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.3)' },
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
    ])
      .then((rs) => Promise.all(rs.map((r) => r.json())))
      .then(([nSt, mgSt, nKab]) => {
        if (!dead) { setD({ nSt, mgSt, nKab }); setOk(true); }
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
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', margin:0, letterSpacing:2, fontFamily:'Inter, system-ui' }}>MEMUAT DATA</p>
      <style>{`@keyframes sp{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden', ...style }}>
      {children}
    </div>
  );
}

// ─── PUPUK CARD ──────────────────────────────────────────────────────────────
function PupukCard({ pupuk }) {
  const pc = PRIORITAS_COLOR[pupuk.prioritas] || PRIORITAS_COLOR.opsional;
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px', background:pc.bg, border:`1px solid ${pc.border}`, borderRadius:10, marginBottom:8 }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#fff', fontFamily:'Inter, system-ui' }}>{pupuk.nama}</span>
          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:pc.bg, border:`1px solid ${pc.border}`, color:pc.text, fontFamily:'Inter, system-ui' }}>
            {pupuk.prioritas}
          </span>
        </div>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:2, letterSpacing:0.5 }}>DOSIS</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', fontFamily:'Inter, system-ui' }}>{pupuk.dosis}</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:2, letterSpacing:0.5 }}>WAKTU APLIKASI</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', fontFamily:'Inter, system-ui' }}>{pupuk.waktu}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KELAS DETAIL PANEL ──────────────────────────────────────────────────────
function KelasPanel({ nutrisiId, kelas, count, total }) {
  const [open, setOpen] = useState(false);
  const rek    = REKOMEN[nutrisiId].kelas[kelas];
  const pct    = total ? Math.round((count / total) * 100) : 0;
  const warna  = REKOMEN[nutrisiId].warna;

  return (
    <div style={{ border:`1px solid rgba(255,255,255,0.06)`, borderRadius:10, overflow:'hidden', marginBottom:8 }}>
      {/* Header — klik untuk expand */}
      <div
        onClick={() => setOpen(!open)}
        className="rek-row"
        style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer', background:'rgba(255,255,255,0.025)', transition:'background 0.15s' }}
      >
        {/* Status dot */}
        <div style={{ width:10, height:10, borderRadius:'50%', background:rek.statusColor, flexShrink:0, boxShadow:`0 0 8px ${rek.statusColor}80` }} />

        {/* Label */}
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#fff', fontFamily:'Inter, system-ui' }}>
              Kelas {kelas} — {rek.label}
            </span>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:`${rek.statusColor}20`, border:`1px solid ${rek.statusColor}50`, color:rek.statusColor }}>
              {rek.status}
            </span>
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:3, fontFamily:'Inter, system-ui' }}>{rek.range} &nbsp;·&nbsp; {rek.label}</div>
        </div>

        {/* Pct + bar */}
        <div style={{ textAlign:'right', minWidth:80 }}>
          <div style={{ fontSize:16, fontWeight:700, color:warna, fontFamily:'Inter, system-ui' }}>{pct}%</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:'Inter, system-ui' }}>{count.toLocaleString()} fitur</div>
        </div>

        {/* Progress mini */}
        <div style={{ width:80 }}>
          <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:warna, borderRadius:3, transition:'width 0.8s ease' }} />
          </div>
        </div>

        {/* Toggle icon */}
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.3)', transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</div>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ padding:'20px 18px', background:'rgba(0,0,0,0.2)', borderTop:'1px solid rgba(255,255,255,0.05)', animation:'fadeIn 0.2s ease' }}>

          {/* Deskripsi */}
          <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:8, marginBottom:20, fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.7, fontFamily:'Inter, system-ui' }}>
            {rek.deskripsi}
          </div>

          {/* Rekomendasi Pupuk */}
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:12, fontFamily:'Inter, system-ui' }}>REKOMENDASI PUPUK</div>
          {rek.pupuk.map((p, i) => <PupukCard key={i} pupuk={p} />)}

          {/* Estimasi biaya + catatan */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
            <div style={{ padding:'14px 16px', background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.18)', borderRadius:10 }}>
              <div style={{ fontSize:10, color:'rgba(251,191,36,0.6)', letterSpacing:1, marginBottom:6 }}>ESTIMASI BIAYA PUPUK</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#fbbf24', fontFamily:'Inter, system-ui' }}>{rek.estimasi_biaya}</div>
            </div>
            <div style={{ padding:'14px 16px', background:'rgba(96,165,250,0.07)', border:'1px solid rgba(96,165,250,0.18)', borderRadius:10 }}>
              <div style={{ fontSize:10, color:'rgba(96,165,250,0.6)', letterSpacing:1, marginBottom:6 }}>CATATAN LAPANGAN</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6, fontFamily:'Inter, system-ui' }}>{rek.catatan}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUMMARY CARD ─────────────────────────────────────────────────────────────
function SummaryCard({ value, label, sub, accent, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ flex:1, padding:'22px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, position:'relative', overflow:'hidden', opacity:show?1:0, transform:show?'none':'translateY(10px)', transition:'all 0.5s ease' }}>
      <div style={{ fontSize:26, fontWeight:700, color:'#fff', letterSpacing:'-0.5px', lineHeight:1, fontFamily:'Inter, system-ui' }}>{value}</div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:8 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'rgba(255,255,255,0.22)', marginTop:3 }}>{sub}</div>}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:accent, opacity:0.7 }} />
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Rekomendasi({ onNavigate }) {
  const { d, ok, err } = useData();
  const [activeNutrisi, setActiveNutrisi] = useState('nitrogen');
  const [viewMode, setViewMode] = useState('kelas'); // 'kelas' | 'peta' | 'summary'

  if (!ok && !err) return <Spinner />;
  if (err) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a12', gap:12, fontFamily:'Inter, system-ui' }}>
      <p style={{ color:'rgba(255,90,90,0.8)', fontSize:13 }}>Tidak dapat terhubung ke API</p>
      <code style={{ padding:'8px 16px', background:'rgba(255,255,255,0.04)', borderRadius:6, fontSize:11, color:'rgba(255,255,255,0.3)' }}>node server.js</code>
    </div>
  );

  const rek      = REKOMEN[activeNutrisi];
  const dist     = activeNutrisi === 'nitrogen' ? d.nSt.distribution : d.mgSt.distribution;
  const total    = activeNutrisi === 'nitrogen' ? d.nSt.total_features : d.mgSt.total_features;
  const dom      = activeNutrisi === 'nitrogen' ? d.nSt.dominant_class : d.mgSt.dominant_class;
  const kabCount = d.nKab?.total_kabupaten || 0;

  // Hitung area yang butuh pupuk (kelas 1+2) vs tidak perlu (kelas 4+5)
  const butuhPupuk   = ((dist[1]?.pct || 0) + (dist[2]?.pct || 0)).toFixed(1);
  const cukup        = (dist[3]?.pct || 0).toFixed(1);
  const tidakButuh   = ((dist[4]?.pct || 0) + (dist[5]?.pct || 0)).toFixed(1);

  // Chart: kebutuhan pupuk
  const kebutuhanData = {
    labels: ['Butuh Pupuk (K1+K2)', 'Cukup (K3)', 'Tidak Perlu (K4+K5)'],
    datasets: [{
      data: [parseFloat(butuhPupuk), parseFloat(cukup), parseFloat(tidakButuh)],
      backgroundColor: ['rgba(239,68,68,0.7)', 'rgba(234,179,8,0.7)', 'rgba(34,197,94,0.7)'],
      borderColor    : ['#ef4444', '#eab308', '#22c55e'],
      borderWidth    : 1,
      hoverOffset    : 8,
    }],
  };

  // Chart: distribusi bar
  const distData = {
    labels: [1,2,3,4,5].map((k) => `K${k}`),
    datasets: [{
      data           : [1,2,3,4,5].map((k) => dist[k]?.pct || 0),
      backgroundColor: [
        'rgba(239,68,68,0.7)',
        'rgba(249,115,22,0.7)',
        'rgba(234,179,8,0.7)',
        'rgba(34,197,94,0.7)',
        'rgba(22,163,74,0.7)',
      ],
      borderRadius   : 5,
      borderSkipped  : false,
    }],
  };

  const TOOLTIP = {
    backgroundColor: 'rgba(10,10,18,0.97)',
    borderColor    : 'rgba(255,255,255,0.07)',
    borderWidth    : 1,
    titleColor     : 'rgba(255,255,255,0.9)',
    bodyColor      : 'rgba(255,255,255,0.5)',
    padding        : 12,
    cornerRadius   : 8,
    titleFont      : { size:12, weight:'600', family:'Inter, system-ui' },
    bodyFont       : { size:11, family:'Inter, system-ui' },
  };

  const scaleX = { ticks:{ color:'rgba(255,255,255,0.3)', font:{size:11,family:'Inter, system-ui'} }, grid:{display:false}, border:{color:'rgba(255,255,255,0.04)'} };
  const scaleY = { ticks:{ color:'rgba(255,255,255,0.2)', font:{size:11,family:'Inter, system-ui'}, callback:(v)=>`${v}%` }, grid:{color:'rgba(255,255,255,0.04)'}, border:{color:'rgba(255,255,255,0.04)'} };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          {/* Breadcrumb */}
          <button onClick={() => onNavigate('map')} style={S.breadBtn} className="rek-bc">Peta</button>
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>/</span>
          <button onClick={() => onNavigate('dashboard')} style={S.breadBtn} className="rek-bc">Dashboard</button>
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>/</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontFamily:'Inter, system-ui' }}>Rekomendasi Pupuk</span>
        </div>

        <div style={S.headerRight}>
          {/* View mode */}
          <div style={S.viewGroup}>
            {[
              { id:'kelas',   label:'Per Kelas' },
              { id:'summary', label:'Ringkasan' },
            ].map((v) => (
              <button key={v.id} onClick={() => setViewMode(v.id)} className="rek-view"
                style={{ ...S.viewBtn, ...(viewMode === v.id ? S.viewBtnOn : {}) }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Nutrisi toggle */}
          <div style={S.nutGroup}>
            <button onClick={() => setActiveNutrisi('nitrogen')} className="rek-nut"
              style={{ ...S.nutBtn, ...(activeNutrisi === 'nitrogen' ? { background:'#52b96a', color:'#fff' } : {}) }}>
              Nitrogen
            </button>
            <button onClick={() => setActiveNutrisi('magnesium')} className="rek-nut"
              style={{ ...S.nutBtn, ...(activeNutrisi === 'magnesium' ? { background:'#9160cc', color:'#fff' } : {}) }}>
              Magnesium
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE TITLE ── */}
      <div style={S.pageTitle}>
        <div>
          <h1 style={S.titleH1}>Rekomendasi Pupuk</h1>
          <p style={S.titleSub}>Berdasarkan analisis kandungan {rek.label} tanah Jawa Barat · {total.toLocaleString()} titik sampel</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => onNavigate('map')} style={S.mapBtn} className="rek-bc">
            🗺 Lihat di Peta
          </button>
          <button onClick={() => onNavigate('dashboard')} style={S.mapBtn} className="rek-bc">
            📊 Dashboard
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <main style={S.main}>

        {/* ════ VIEW: RINGKASAN ════ */}
        {viewMode === 'summary' && (
          <div style={S.page}>
            {/* Stat cards */}
            <div style={{ display:'flex', gap:12 }}>
              <SummaryCard value={`${butuhPupuk}%`} label="Area Butuh Pemupukan"  sub={`Kelas 1 & 2 — ${rek.label}`} accent="#ef4444" delay={0}   />
              <SummaryCard value={`${cukup}%`}       label="Area Cukup"            sub={`Kelas 3 — Sedang`}           accent="#eab308" delay={80}  />
              <SummaryCard value={`${tidakButuh}%`}  label="Area Tidak Perlu Pupuk" sub={`Kelas 4 & 5`}              accent="#22c55e" delay={160} />
              <SummaryCard value={kabCount}           label="Kabupaten Terdata"      sub="Jawa Barat"                 accent="#60a5fa" delay={240} />
            </div>

            {/* Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
              <Card>
                <div style={{ padding:'20px 24px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', fontFamily:'Inter, system-ui' }}>Kebutuhan Pemupukan</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Proporsi area berdasarkan urgensi pemupukan</div>
                </div>
                <div style={{ padding:'0 24px 24px', height:220 }}>
                  <Doughnut data={kebutuhanData} options={{
                    responsive:true, maintainAspectRatio:false, cutout:'60%',
                    plugins:{
                      legend:{ position:'right', labels:{ color:'rgba(255,255,255,0.45)', font:{size:11,family:'Inter, system-ui'}, boxWidth:10, padding:12 } },
                      tooltip: TOOLTIP,
                    },
                  }} />
                </div>
              </Card>

              <Card>
                <div style={{ padding:'20px 24px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', fontFamily:'Inter, system-ui' }}>Distribusi Per Kelas</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Persentase fitur per kelas gridcode</div>
                </div>
                <div style={{ padding:'0 24px 24px', height:220 }}>
                  <Bar data={distData} options={{
                    responsive:true, maintainAspectRatio:false,
                    plugins:{ legend:{display:false}, tooltip:TOOLTIP },
                    scales:{ x:scaleX, y:scaleY },
                  }} />
                </div>
              </Card>
            </div>

            {/* Quick reference table */}
            <Card>
              <div style={{ padding:'20px 24px 16px' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', fontFamily:'Inter, system-ui' }}>Tabel Referensi Cepat</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Ringkasan rekomendasi pupuk utama per kelas</div>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Kelas','Status','Pupuk Utama','Dosis','Estimasi Biaya','% Area'].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5].map((k) => {
                    const r   = rek.kelas[k];
                    const pct = dist[k]?.pct || 0;
                    const utama = r.pupuk.find((p) => p.prioritas === 'utama') || r.pupuk[0];
                    return (
                      <tr key={k} className="rek-tr" style={S.tr}>
                        <td style={S.td}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background:r.statusColor, display:'inline-block' }} />
                            Kelas {k}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${r.statusColor}18`, border:`1px solid ${r.statusColor}40`, color:r.statusColor }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={S.td}>{utama.nama}</td>
                        <td style={{ ...S.td, color:'rgba(255,255,255,0.5)' }}>{utama.dosis}</td>
                        <td style={{ ...S.td, color:'#fbbf24' }}>{r.estimasi_biaya}</td>
                        <td style={{ ...S.td, color: rek.warna, fontWeight:600 }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Insight box */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:10 }}>KELAS DOMINAN</div>
                <div style={{ fontSize:20, fontWeight:700, color:rek.warna, fontFamily:'Inter, system-ui' }}>Kelas {dom?.code}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4 }}>{dom?.label} · {dom?.pct}%</div>
              </Card>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:10 }}>AREA PRIORITAS PEMUPUKAN</div>
                <div style={{ fontSize:20, fontWeight:700, color:'#ef4444', fontFamily:'Inter, system-ui' }}>{butuhPupuk}%</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4 }}>Butuh intervensi segera</div>
              </Card>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:10 }}>PUPUK UTAMA DISARANKAN</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:'Inter, system-ui', lineHeight:1.4 }}>
                  {activeNutrisi === 'nitrogen' ? 'Urea / ZA / NPK' : 'Kieserit / Dolomit'}
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4 }}>Untuk area kelas 1–2</div>
              </Card>
            </div>
          </div>
        )}

        {/* ════ VIEW: PER KELAS ════ */}
        {viewMode === 'kelas' && (
          <div style={S.page}>
            {/* Info banner */}
            <div style={{ padding:'16px 20px', background:'rgba(82,185,106,0.06)', border:'1px solid rgba(82,185,106,0.15)', borderRadius:10, display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{ fontSize:20, flexShrink:0 }}>ℹ️</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', fontFamily:'Inter, system-ui', marginBottom:4 }}>
                  Cara Membaca Rekomendasi
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.7, fontFamily:'Inter, system-ui' }}>
                  Klik tiap kelas untuk melihat detail rekomendasi pupuk. Kelas 1–2 (merah/oranye) butuh pemupukan intensif.
                  Kelas 3 (kuning) cukup dengan pemupukan pemeliharaan. Kelas 4–5 (hijau) tidak memerlukan tambahan pupuk khusus.
                  Dosis dan jenis pupuk berdasarkan standar Kementerian Pertanian RI.
                </div>
              </div>
            </div>

            {/* Kelas panels */}
            {[1,2,3,4,5].map((k) => (
              <KelasPanel
                key={k}
                nutrisiId={activeNutrisi}
                kelas={k}
                count={dist[k]?.count || 0}
                total={total}
              />
            ))}

            {/* Footer note */}
            <div style={{ padding:'14px 18px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:10, fontSize:11, color:'rgba(255,255,255,0.25)', lineHeight:1.8, fontFamily:'Inter, system-ui' }}>
              <strong style={{ color:'rgba(255,255,255,0.4)' }}>Catatan:</strong> Rekomendasi ini bersifat umum berdasarkan klasifikasi gridcode. Untuk rekomendasi yang lebih akurat,
              lakukan uji tanah laboratorium di tiap lokasi. Dosis pupuk dapat bervariasi tergantung jenis tanaman, varietas, dan kondisi lokal.
              Konsultasikan dengan penyuluh pertanian setempat sebelum aplikasi massal.
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
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', height:52, borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, background:'rgba(10,10,18,0.93)', backdropFilter:'blur(16px)', zIndex:100 },
  headerLeft : { display:'flex', alignItems:'center', gap:8 },
  headerRight: { display:'flex', alignItems:'center', gap:10 },

  breadBtn: { fontSize:12, fontWeight:500, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)', padding:'4px 8px', borderRadius:5, transition:'all 0.15s', fontFamily:'Inter, system-ui' },

  viewGroup : { display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:3, gap:2 },
  viewBtn   : { padding:'5px 14px', fontSize:12, fontWeight:500, border:'none', borderRadius:6, cursor:'pointer', color:'rgba(255,255,255,0.4)', background:'transparent', transition:'all 0.2s', fontFamily:'Inter, system-ui' },
  viewBtnOn : { background:'rgba(255,255,255,0.1)', color:'#fff' },

  nutGroup  : { display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:3, gap:2 },
  nutBtn    : { padding:'5px 14px', fontSize:12, fontWeight:500, border:'none', borderRadius:6, cursor:'pointer', color:'rgba(255,255,255,0.4)', background:'transparent', transition:'all 0.2s', fontFamily:'Inter, system-ui' },

  mapBtn    : { padding:'6px 14px', fontSize:12, fontWeight:500, background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, cursor:'pointer', color:'rgba(255,255,255,0.45)', transition:'all 0.15s', fontFamily:'Inter, system-ui' },

  pageTitle : { padding:'28px 28px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  titleH1   : { fontSize:22, fontWeight:700, color:'#fff', margin:0, letterSpacing:'-0.3px', fontFamily:'Inter, system-ui' },
  titleSub  : { fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:6, marginBottom:0, fontFamily:'Inter, system-ui' },

  main   : { padding:'20px 28px 40px' },
  page   : { display:'flex', flexDirection:'column', gap:14, maxWidth:1200, margin:'0 auto' },

  table  : { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th     : { padding:'10px 20px', textAlign:'left', fontSize:11, fontWeight:500, color:'rgba(255,255,255,0.25)', letterSpacing:0.5, borderBottom:'1px solid rgba(255,255,255,0.06)', fontFamily:'Inter, system-ui' },
  tr     : { borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' },
  td     : { padding:'12px 20px', color:'rgba(255,255,255,0.65)', fontSize:13, fontFamily:'Inter, system-ui' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing:border-box; }
  body { margin:0; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }
  .rek-row:hover  { background:rgba(255,255,255,0.04) !important; }
  .rek-bc:hover   { color:rgba(255,255,255,0.7) !important; background:rgba(255,255,255,0.06) !important; }
  .rek-view:hover { color:rgba(255,255,255,0.7) !important; }
  .rek-nut:hover  { opacity:0.85 !important; }
  .rek-tr:hover   { background:rgba(255,255,255,0.03) !important; }
  @keyframes sp       { to { transform:rotate(360deg); } }
  @keyframes fadeIn   { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
`;