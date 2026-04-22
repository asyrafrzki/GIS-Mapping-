import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { point as turfPoint } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEOJSON_DIR = path.join(__dirname, '../../data/geojson');

const DEFAULT_P = 0.15;
const DEFAULT_K = 0.7;

let nitrogenCache = null;
let magnesiumCache = null;

async function loadGeojson(filename) {
  const fullPath = path.join(GEOJSON_DIR, filename);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
}

async function getNitrogenGeojson() {
  if (!nitrogenCache) {
    nitrogenCache = await loadGeojson('nitrogen.geojson');
  }
  return nitrogenCache;
}

async function getMagnesiumGeojson() {
  if (!magnesiumCache) {
    magnesiumCache = await loadGeojson('magnesium.geojson');
  }
  return magnesiumCache;
}

function extractNumericProperty(properties, candidates = []) {
  for (const key of candidates) {
    if (properties[key] !== undefined && properties[key] !== null && properties[key] !== '') {
      const val = Number(properties[key]);
      if (!Number.isNaN(val)) return val;
    }
  }

  for (const [_, value] of Object.entries(properties || {})) {
    const val = Number(value);
    if (!Number.isNaN(val)) return val;
  }

  return null;
}

function findValueFromGeojson(geojson, lat, lng, candidates) {
  if (!geojson?.features?.length) return null;

  const pt = turfPoint([Number(lng), Number(lat)]);

  for (const feature of geojson.features) {
    try {
      if (booleanPointInPolygon(pt, feature)) {
        return extractNumericProperty(feature.properties, candidates);
      }
    } catch (err) {
      continue;
    }
  }

  return null;
}

export async function getNutrientContextForPoint(lat, lng) {
  const [nitrogenGeojson, magnesiumGeojson] = await Promise.all([
    getNitrogenGeojson(),
    getMagnesiumGeojson(),
  ]);

  const nValue = findValueFromGeojson(nitrogenGeojson, lat, lng, [
  'Kadar_N',
  'kadar_n',
  'nitrogen',
  'Nitrogen',
  'N',
  'n',
  'value',
  'VALUE',
]);

  const mgValue = findValueFromGeojson(magnesiumGeojson, lat, lng, [
  'Kadar_Mg',
  'kadar_mg',
  'magnesium',
  'Magnesium',
  'Mg',
  'mg',
  'value',
  'VALUE',
]);

  return {
    n: nValue ?? 0,
    p: DEFAULT_P,
    k: DEFAULT_K,
    mg: mgValue ?? 0,
    sources: {
      n: nValue !== null ? 'geojson' : 'default',
      p: 'default',
      k: 'default',
      mg: mgValue !== null ? 'geojson' : 'default',
    },
  };
}