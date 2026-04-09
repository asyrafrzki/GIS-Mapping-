import express  from 'express'
import cors     from 'cors'
import path     from 'path'
import fs       from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app       = express()
const PORT      = 3001
const publicDir = path.join(__dirname, 'public')

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ─── REQUEST LOGGER (tampil di terminal tiap ada request masuk) ───────────────
app.use((req, res, next) => {
  const ts = new Date().toLocaleTimeString('id-ID')
  console.log(`[${ts}] ${req.method} ${req.path} ${JSON.stringify(req.query)}`)
  next()
})

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

function readJsonFile(filename) {
  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function isSafePath(filename) {
  const resolved = path.resolve(publicDir, filename)
  return resolved.startsWith(publicDir)
}

function calcDistribution(features) {
  const counts = {}
  features.forEach((f) => {
    const code = f.properties?.gridcode
    if (code !== undefined && code !== null) {
      counts[code] = (counts[code] || 0) + 1
    }
  })
  const total = features.length
  const dist  = {}
  Object.entries(counts).forEach(([k, v]) => {
    dist[k] = { count: v, pct: total ? Math.round((v / total) * 1000) / 10 : 0 }
  })
  return { counts, dist, total }
}

// BARU - aman untuk array besar
function getBbox(features) {
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  features.forEach((f) => {
    const g = f.geometry
    if (!g) return

    let coords = []
    if (g.type === 'Point')        coords = [g.coordinates]
    else if (g.type === 'Polygon') coords = g.coordinates.flat()
    else if (g.type === 'MultiPolygon') coords = g.coordinates.flat(2)
    else if (g.type === 'LineString')   coords = g.coordinates

    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    })
  })

  if (!isFinite(minLng)) return null

  return { min_lng: minLng, max_lng: maxLng, min_lat: minLat, max_lat: maxLat }
}

const GRIDCODE_LABELS = {
  1: 'Sangat Rendah',
  2: 'Rendah',
  3: 'Sedang',
  4: 'Tinggi',
  5: 'Sangat Tinggi',
}

// ─────────────────────────────────────────────────────────────────────────────
// ██████████████████████  ENDPOINTS  ██████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════
//  [1] GET /api/health
//  Cek server hidup + info dasar
// ════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  const files = fs.readdirSync(publicDir)
  res.json({
    status      : 'ok',
    message     : 'API Server berjalan normal',
    timestamp   : new Date().toISOString(),
    uptime_sec  : Math.floor(process.uptime()),
    node_version: process.version,
    public_files: files.length,
    port        : PORT,
  })
})

// ════════════════════════════════════════════════════════════
//  [2] GET /api/layers
//  List semua file di /public
// ════════════════════════════════════════════════════════════
app.get('/api/layers', (req, res) => {
  try {
    const files  = fs.readdirSync(publicDir)
    const layers = files
      .filter((f) => f.endsWith('.json') || f.endsWith('.shp') || f.endsWith('.dbf'))
      .map((f) => {
        const ext      = path.extname(f)
        const name     = path.basename(f, ext)
        const fullPath = path.join(publicDir, f)
        const stat     = fs.statSync(fullPath)
        const entry    = {
          name,
          filename: f,
          ext     : ext.replace('.', ''),
          size_kb : Math.round(stat.size / 1024),
          modified: stat.mtime.toISOString(),
        }
        if (ext === '.json') {
          try {
            const data = readJsonFile(f)
            entry.feature_count = data?.features?.length ?? 0
          } catch (_) {}
        }
        return entry
      })

    res.json({
      total       : layers.length,
      json_layers : layers.filter((l) => l.ext === 'json'),
      shp_files   : layers.filter((l) => l.ext === 'shp'),
      other_files : layers.filter((l) => l.ext !== 'json' && l.ext !== 'shp'),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [3] GET /api/summary
//  Ringkasan semua layer JSON sekaligus
// ════════════════════════════════════════════════════════════
app.get('/api/summary', (req, res) => {
  try {
    const files     = fs.readdirSync(publicDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const summary = jsonFiles.map((filename) => {
      try {
        const data  = readJsonFile(filename)
        const feats = data.features ?? []
        const { counts, dist } = calcDistribution(feats)
        const domEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        return {
          filename,
          feature_count         : feats.length,
          geometry_types        : [...new Set(feats.map((f) => f.geometry?.type))],
          dominant_class        : domEntry
            ? { code: parseInt(domEntry[0]), label: GRIDCODE_LABELS[domEntry[0]], count: domEntry[1], pct: dist[domEntry[0]]?.pct }
            : null,
          gridcode_distribution : dist,
        }
      } catch (e) {
        return { filename, error: e.message }
      }
    })

    res.json({ total_files: jsonFiles.length, layers: summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [4] GET /api/compare?a=JABAR_NITROGEN&b=JABAR_MAGNESIUM
//  Bandingkan distribusi gridcode 2 layer
// ════════════════════════════════════════════════════════════
app.get('/api/compare', (req, res) => {
  const { a, b } = req.query
  if (!a || !b) {
    return res.status(400).json({
      error  : 'Query param "a" dan "b" wajib diisi',
      example: '/api/compare?a=JABAR_NITROGEN&b=JABAR_MAGNESIUM',
    })
  }

  const fileA = a.endsWith('.json') ? a : `${a}.json`
  const fileB = b.endsWith('.json') ? b : `${b}.json`

  if (!fs.existsSync(path.join(publicDir, fileA)))
    return res.status(404).json({ error: `File tidak ditemukan: ${fileA}` })
  if (!fs.existsSync(path.join(publicDir, fileB)))
    return res.status(404).json({ error: `File tidak ditemukan: ${fileB}` })

  try {
    const dataA = readJsonFile(fileA)
    const dataB = readJsonFile(fileB)
    const resA  = calcDistribution(dataA.features ?? [])
    const resB  = calcDistribution(dataB.features ?? [])

    const comparison = {}
    ;[1, 2, 3, 4, 5].forEach((code) => {
      comparison[code] = {
        label   : GRIDCODE_LABELS[code] ?? `Kelas ${code}`,
        [fileA] : { count: resA.counts[code] ?? 0, pct: resA.dist[code]?.pct ?? 0 },
        [fileB] : { count: resB.counts[code] ?? 0, pct: resB.dist[code]?.pct ?? 0 },
        diff_pct: Math.round(((resA.dist[code]?.pct ?? 0) - (resB.dist[code]?.pct ?? 0)) * 10) / 10,
      }
    })

    const domA = Object.entries(resA.counts).sort((x, y) => y[1] - x[1])[0]
    const domB = Object.entries(resB.counts).sort((x, y) => y[1] - x[1])[0]

    res.json({
      layer_a            : { filename: fileA, total_features: resA.total, dominant_class: { code: domA?.[0], label: GRIDCODE_LABELS[domA?.[0]], count: domA?.[1] } },
      layer_b            : { filename: fileB, total_features: resB.total, dominant_class: { code: domB?.[0], label: GRIDCODE_LABELS[domB?.[0]], count: domB?.[1] } },
      comparison_by_class: comparison,
      note               : 'diff_pct positif = layer_a lebih dominan di kelas ini',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [5] GET /api/layer/:filename
//  Ambil isi file lengkap (JSON) atau download (binary)
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename', (req, res) => {
  const { filename } = req.params
  if (!isSafePath(filename))
    return res.status(400).json({ error: 'Invalid filename' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error    : `File tidak ditemukan: ${filename}`,
      tip      : 'Cek nama file di /public — perhatikan huruf besar/kecil',
      available: fs.readdirSync(publicDir),
    })
  }

  const ext = path.extname(filename).toLowerCase()
  if (ext === '.json') {
    try {
      const data = readJsonFile(filename)
      res.setHeader('X-Feature-Count', data.features?.length ?? 0)
      res.setHeader('X-File-Name', filename)
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: 'Gagal parse JSON: ' + err.message })
    }
  } else {
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.sendFile(filePath)
  }
})

// ════════════════════════════════════════════════════════════
//  [6] GET /api/layer/:filename/info
//  Metadata file JSON
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/info', (req, res) => {
  const { filename } = req.params
  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /info hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const stat  = fs.statSync(filePath)
    const feats = data.features ?? []
    const { counts } = calcDistribution(feats)
    const sampleProps = feats[0]?.properties ?? {}
    const bbox = getBbox(feats)

    res.json({
      filename,
      size_kb         : Math.round(stat.size / 1024),
      modified        : stat.mtime.toISOString(),
      geojson_type    : data.type,
      feature_count   : feats.length,
      geometry_types  : [...new Set(feats.map((f) => f.geometry?.type))],
      property_fields : Object.keys(sampleProps),
      sample_properties: sampleProps,
      gridcode_counts : counts,
      bounding_box    : bbox,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [7] GET /api/layer/:filename/stats
//  Statistik distribusi gridcode
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/stats', (req, res) => {
  const { filename } = req.params
  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /stats hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    const { counts, dist, total } = calcDistribution(feats)
    const codes = Object.keys(counts).map(Number).sort()

    const distribution = {}
    ;[1, 2, 3, 4, 5].forEach((code) => {
      distribution[code] = {
        label: GRIDCODE_LABELS[code] ?? `Kelas ${code}`,
        count: counts[code] ?? 0,
        pct  : dist[code]?.pct ?? 0,
      }
    })

    const domCode = codes.reduce((a, b) => (counts[a] > counts[b] ? a : b), codes[0])

    res.json({
      filename,
      total_features : total,
      gridcode_range : { min: Math.min(...codes), max: Math.max(...codes) },
      dominant_class : {
        code : domCode,
        label: GRIDCODE_LABELS[domCode],
        count: counts[domCode],
        pct  : dist[domCode]?.pct,
      },
      distribution,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [8] GET /api/layer/:filename/bbox
//  Bounding box + center koordinat layer
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/bbox', (req, res) => {
  const { filename } = req.params
  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /bbox hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    const bbox  = getBbox(feats)
    if (!bbox) return res.status(422).json({ error: 'Tidak ada koordinat yang bisa dihitung' })

    res.json({
      filename,
      feature_count : feats.length,
      bounding_box  : bbox,
      center        : {
        lng: Math.round(((bbox.min_lng + bbox.max_lng) / 2) * 10000) / 10000,
        lat: Math.round(((bbox.min_lat + bbox.max_lat) / 2) * 10000) / 10000,
      },
      leaflet_format: [[bbox.min_lat, bbox.min_lng], [bbox.max_lat, bbox.max_lng]],
      area_deg2     : Math.round((bbox.max_lng - bbox.min_lng) * (bbox.max_lat - bbox.min_lat) * 10000) / 10000,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [9] GET /api/layer/:filename/kabupaten
//  List semua kabupaten unik di layer
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/kabupaten', (req, res) => {
  const { filename } = req.params
  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /kabupaten hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    const kabSet = new Set()

    feats.forEach((f) => {
      const kab = f.properties?.KABUPATEN || f.properties?.kabupaten || f.properties?.Kabupaten
      if (kab) kabSet.add(kab)
    })

    const list = [...kabSet].sort()
    if (!list.length) {
      return res.json({
        filename,
        message         : 'Field KABUPATEN tidak ditemukan di properties',
        available_fields: Object.keys(feats[0]?.properties ?? {}),
      })
    }

    res.json({ filename, total_kabupaten: list.length, kabupaten: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [10] GET /api/layer/:filename/filter
//  Filter fitur by gridcode dan/atau kabupaten
//  ?gridcode=3
//  ?kabupaten=Bandung
//  ?gridcode=3&kabupaten=Bandung&limit=50
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/filter', (req, res) => {
  const { filename }                         = req.params
  const { gridcode, kabupaten, limit = 100 } = req.query

  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /filter hanya untuk file .json' })

  if (!gridcode && !kabupaten) {
    return res.status(400).json({
      error           : 'Harus ada minimal satu filter',
      available_params: {
        gridcode  : 'Kelas 1-5. Contoh: ?gridcode=3',
        kabupaten : 'Nama kabupaten. Contoh: ?kabupaten=Bandung',
        limit     : 'Max hasil (default 100). Contoh: ?limit=50',
      },
    })
  }

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    let   feats = data.features ?? []

    if (gridcode !== undefined) {
      const code = parseInt(gridcode)
      if (isNaN(code) || code < 1 || code > 5)
        return res.status(400).json({ error: 'gridcode harus angka 1-5' })
      feats = feats.filter((f) => Number(f.properties?.gridcode) === code)
    }

    if (kabupaten) {
      const q = kabupaten.toLowerCase()
      feats = feats.filter((f) => {
        const kab = (f.properties?.KABUPATEN || f.properties?.kabupaten || '').toLowerCase()
        return kab.includes(q)
      })
    }

    const total    = feats.length
    const limitNum = Math.min(parseInt(limit) || 100, 1000)
    const sliced   = feats.slice(0, limitNum)

    res.json({
      filename,
      filters_applied: { gridcode: gridcode ?? null, kabupaten: kabupaten ?? null },
      total_matched  : total,
      returned       : sliced.length,
      limit_applied  : limitNum,
      type           : 'FeatureCollection',
      features       : sliced,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [11] GET /api/layer/:filename/search?q=keyword
//  Cari keyword di semua property
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/search', (req, res) => {
  const { filename }       = req.params
  const { q, limit = 50 } = req.query

  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /search hanya untuk file .json' })

  if (!q)
    return res.status(400).json({ error: 'Query param "q" wajib diisi', example: `?q=Bandung` })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data    = readJsonFile(filename)
    const feats   = data.features ?? []
    const query   = q.toLowerCase()
    const matched = feats.filter((f) =>
      Object.values(f.properties ?? {}).some((v) => String(v).toLowerCase().includes(query))
    )
    const limitNum = Math.min(parseInt(limit) || 50, 500)
    const sliced   = matched.slice(0, limitNum)

    res.json({
      filename,
      query        : q,
      total_matched: matched.length,
      returned     : sliced.length,
      type         : 'FeatureCollection',
      features     : sliced,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [12] GET /api/layer/:filename/properties
//  List semua field/property unik + nilai uniknya (top 10)
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/properties', (req, res) => {
  const { filename } = req.params
  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /properties hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    if (!feats.length) return res.json({ filename, message: 'Tidak ada fitur', fields: {} })

    // Kumpulkan semua key + nilai unik (max 10 per field)
    const allKeys = new Set()
    feats.forEach((f) => Object.keys(f.properties ?? {}).forEach((k) => allKeys.add(k)))

    const fields = {}
    allKeys.forEach((key) => {
      const values = feats.map((f) => f.properties?.[key]).filter((v) => v !== undefined && v !== null)
      const unique = [...new Set(values.map(String))]
      fields[key] = {
        type        : typeof values[0],
        total_values: values.length,
        unique_count: unique.length,
        sample_values: unique.slice(0, 10),
      }
    })

    res.json({ filename, feature_count: feats.length, field_count: allKeys.size, fields })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [13] GET /api/layer/:filename/sample?n=5
//  Ambil N fitur pertama sebagai sample
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/sample', (req, res) => {
  const { filename }  = req.params
  const { n = 5 }     = req.query

  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /sample hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    const count = Math.min(Math.max(parseInt(n) || 5, 1), 50)

    res.json({
      filename,
      total_features: feats.length,
      sample_count  : count,
      type          : 'FeatureCollection',
      features      : feats.slice(0, count),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [14] GET /api/layer/:filename/count
//  Hitung jumlah fitur (cepat, tanpa return data)
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/count', (req, res) => {
  const { filename } = req.params
  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /count hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    const { counts } = calcDistribution(feats)

    res.json({
      filename,
      total          : feats.length,
      by_gridcode    : counts,
      geometry_types : [...new Set(feats.map((f) => f.geometry?.type))],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [15] GET /api/layer/:filename/gridcode/:code
//  Shortcut: ambil semua fitur dengan gridcode tertentu
//  Contoh: /api/layer/JABAR_NITROGEN.json/gridcode/3
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/gridcode/:code', (req, res) => {
  const { filename, code } = req.params
  const { limit = 200 }    = req.query

  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /gridcode hanya untuk file .json' })

  const codeNum = parseInt(code)
  if (isNaN(codeNum) || codeNum < 1 || codeNum > 5)
    return res.status(400).json({ error: 'Gridcode harus angka 1-5' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data    = readJsonFile(filename)
    const feats   = data.features ?? []
    const matched = feats.filter((f) => Number(f.properties?.gridcode) === codeNum)
    const limitNum = Math.min(parseInt(limit) || 200, 2000)

    res.json({
      filename,
      gridcode      : codeNum,
      label         : GRIDCODE_LABELS[codeNum],
      total_matched : matched.length,
      returned      : Math.min(matched.length, limitNum),
      pct_of_total  : Math.round((matched.length / feats.length) * 1000) / 10,
      type          : 'FeatureCollection',
      features      : matched.slice(0, limitNum),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [16] GET /api/layer/:filename/paginate?page=1&size=50
//  Paginasi data — berguna untuk file besar
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/paginate', (req, res) => {
  const { filename }            = req.params
  const { page = 1, size = 50 } = req.query

  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /paginate hanya untuk file .json' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data     = readJsonFile(filename)
    const feats    = data.features ?? []
    const pageNum  = Math.max(parseInt(page) || 1, 1)
    const sizeNum  = Math.min(Math.max(parseInt(size) || 50, 1), 500)
    const total    = feats.length
    const pages    = Math.ceil(total / sizeNum)
    const start    = (pageNum - 1) * sizeNum
    const end      = start + sizeNum
    const sliced   = feats.slice(start, end)

    if (pageNum > pages && pages > 0)
      return res.status(400).json({ error: `Page ${pageNum} tidak ada. Total page: ${pages}` })

    res.json({
      filename,
      pagination: {
        page      : pageNum,
        size      : sizeNum,
        total     : total,
        total_pages: pages,
        has_prev  : pageNum > 1,
        has_next  : pageNum < pages,
        prev_page : pageNum > 1 ? pageNum - 1 : null,
        next_page : pageNum < pages ? pageNum + 1 : null,
      },
      returned: sliced.length,
      type    : 'FeatureCollection',
      features: sliced,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [17] GET /api/layer/:filename/export?format=csv
//  Export properties fitur sebagai CSV (tanpa geometry)
// ════════════════════════════════════════════════════════════
app.get('/api/layer/:filename/export', (req, res) => {
  const { filename }       = req.params
  const { format = 'csv' } = req.query

  if (!filename.endsWith('.json'))
    return res.status(400).json({ error: 'Endpoint /export hanya untuk file .json' })

  if (format !== 'csv')
    return res.status(400).json({ error: 'Format yang didukung saat ini: csv' })

  const filePath = path.join(publicDir, filename)
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `File tidak ditemukan: ${filename}` })

  try {
    const data  = readJsonFile(filename)
    const feats = data.features ?? []
    if (!feats.length) return res.status(422).json({ error: 'Tidak ada fitur untuk diekspor' })

    // Ambil semua header dari properties
    const headers = [...new Set(feats.flatMap((f) => Object.keys(f.properties ?? {})))]

    // Buat baris CSV
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csvLines = [
      headers.join(','),
      ...feats.map((f) => headers.map((h) => escape(f.properties?.[h] ?? '')).join(',')),
    ]
    const csv = csvLines.join('\n')

    const outName = filename.replace('.json', '.csv')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${outName}"`)
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  [18] GET /api/docs
//  Dokumentasi semua endpoint (built-in)
// ════════════════════════════════════════════════════════════
app.get('/api/docs', (req, res) => {
  res.json({
    title  : 'SoilMap GIS API',
    version: '2.0.0',
    base   : `http://localhost:${PORT}`,
    endpoints: [
      { method: 'GET', path: '/api/health',                                    desc: 'Cek server hidup + info dasar' },
      { method: 'GET', path: '/api/layers',                                    desc: 'List semua file di /public' },
      { method: 'GET', path: '/api/summary',                                   desc: 'Ringkasan semua layer JSON sekaligus' },
      { method: 'GET', path: '/api/compare?a=LAYER_A&b=LAYER_B',              desc: 'Bandingkan distribusi gridcode 2 layer' },
      { method: 'GET', path: '/api/docs',                                      desc: 'Dokumentasi ini' },
      { method: 'GET', path: '/api/layer/:filename',                           desc: 'Ambil data layer lengkap / download binary' },
      { method: 'GET', path: '/api/layer/:filename/info',                      desc: 'Metadata + bounding box + sample properties' },
      { method: 'GET', path: '/api/layer/:filename/stats',                     desc: 'Statistik distribusi gridcode' },
      { method: 'GET', path: '/api/layer/:filename/bbox',                      desc: 'Bounding box + center koordinat' },
      { method: 'GET', path: '/api/layer/:filename/kabupaten',                 desc: 'List kabupaten unik di layer' },
      { method: 'GET', path: '/api/layer/:filename/properties',                desc: 'Semua field + nilai unik (top 10)' },
      { method: 'GET', path: '/api/layer/:filename/count',                     desc: 'Hitung jumlah fitur per gridcode' },
      { method: 'GET', path: '/api/layer/:filename/sample?n=5',               desc: 'Ambil N fitur pertama sebagai sample' },
      { method: 'GET', path: '/api/layer/:filename/paginate?page=1&size=50',  desc: 'Paginasi data (untuk file besar)' },
      { method: 'GET', path: '/api/layer/:filename/filter?gridcode=3',        desc: 'Filter by gridcode (1-5)' },
      { method: 'GET', path: '/api/layer/:filename/filter?kabupaten=Bandung', desc: 'Filter by nama kabupaten' },
      { method: 'GET', path: '/api/layer/:filename/search?q=keyword',         desc: 'Cari keyword di semua property' },
      { method: 'GET', path: '/api/layer/:filename/gridcode/:code',           desc: 'Shortcut ambil fitur by gridcode' },
      { method: 'GET', path: '/api/layer/:filename/export?format=csv',        desc: 'Export properties sebagai CSV' },
    ],
    example_files: fs.readdirSync(publicDir).filter((f) => f.endsWith('.json')),
  })
})

// ════════════════════════════════════════════════════════════
//  CATCH-ALL 404
// ════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint tidak ditemukan: ${req.method} ${req.path}`,
    tip  : 'Lihat GET /api/docs untuk daftar semua endpoint',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║    ✅  SoilMap API Server — http://localhost:${PORT}          ║
╚════════════════════════════════════════════════════════════╝

 GENERAL
  [1]  GET /api/health
  [2]  GET /api/layers
  [3]  GET /api/summary
  [4]  GET /api/compare?a=JABAR_NITROGEN&b=JABAR_MAGNESIUM
  [5]  GET /api/docs

 DATA
  [6]  GET /api/layer/JABAR_NITROGEN.json
  [7]  GET /api/layer/JABAR_MAGNESIUM.json
  [8]  GET /api/layer/Jabar_N24.shp          (download)
  [9]  GET /api/layer/Jabar_N24.dbf          (download)

 INFO & STATS
  [10] GET /api/layer/JABAR_NITROGEN.json/info
  [11] GET /api/layer/JABAR_NITROGEN.json/stats
  [12] GET /api/layer/JABAR_NITROGEN.json/bbox
  [13] GET /api/layer/JABAR_NITROGEN.json/kabupaten
  [14] GET /api/layer/JABAR_NITROGEN.json/properties
  [15] GET /api/layer/JABAR_NITROGEN.json/count

 QUERY & FILTER
  [16] GET /api/layer/JABAR_NITROGEN.json/sample?n=5
  [17] GET /api/layer/JABAR_NITROGEN.json/paginate?page=1&size=50
  [18] GET /api/layer/JABAR_NITROGEN.json/filter?gridcode=3
  [19] GET /api/layer/JABAR_NITROGEN.json/filter?kabupaten=Bandung
  [20] GET /api/layer/JABAR_NITROGEN.json/filter?gridcode=3&kabupaten=Bandung
  [21] GET /api/layer/JABAR_NITROGEN.json/search?q=keyword
  [22] GET /api/layer/JABAR_NITROGEN.json/gridcode/3

 EXPORT
  [23] GET /api/layer/JABAR_NITROGEN.json/export?format=csv

 NEGATIVE TEST
  [24] GET /api/layer/FILE_TIDAK_ADA.json    → 404
  [25] GET /api/layer/JABAR_NITROGEN.json/filter  (tanpa param) → 400
  `)
})