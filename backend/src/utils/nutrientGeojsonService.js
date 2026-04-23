import fs from 'fs/promises';
import path from 'path';
import { point as turfPoint } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

const GEOJSON_DIR = process.env.GEOJSON_DIR
  ? path.resolve(process.env.GEOJSON_DIR)
  : path.resolve('data/geojson');

const DEFAULT_P = 0.15;
const DEFAULT_K = 0.7;
const DEFAULT_N = 2.40;
const DEFAULT_MG = 0.20;

let nitrogenCache = null;
let magnesiumCache = null;

const NITROGEN_GRIDCODE_MAP = {
  1: 2.20,
  2: 2.40,
  3: 2.60,
  4: 2.80,
  5: 3.00,
};

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
    if (properties?.[key] !== undefined && properties?.[key] !== null && properties?.[key] !== '') {
      const val = Number(properties[key]);
      if (!Number.isNaN(val)) return val;
    }
  }
  return null;
}

function mapNitrogenGridcodeToKadar(gridcode) {
  const key = Number(gridcode);
  return NITROGEN_GRIDCODE_MAP[key] ?? null;
}

function findNitrogenValueFromGeojson(geojson, lat, lng) {
  if (!geojson?.features?.length) return null;

  const pt = turfPoint([Number(lng), Number(lat)]);

  for (const feature of geojson.features) {
    try {
      if (booleanPointInPolygon(pt, feature)) {
        const props = feature.properties || {};

        const directNitrogen = extractNumericProperty(props, [
          'Kadar_N',
          'kadar_n',
          'Nitrogen',
          'nitrogen',
          'N',
          'n',
        ]);

        if (directNitrogen !== null) {
          return directNitrogen;
        }

        const mappedFromGrid = mapNitrogenGridcodeToKadar(props.gridcode ?? props.GRIDCODE);
        if (mappedFromGrid !== null) {
          return mappedFromGrid;
        }

        return null;
      }
    } catch (err) {
      continue;
    }
  }

  return null;
}

function findMagnesiumValueFromGeojson(geojson, lat, lng) {
  if (!geojson?.features?.length) return null;

  const pt = turfPoint([Number(lng), Number(lat)]);

  for (const feature of geojson.features) {
    try {
      if (booleanPointInPolygon(pt, feature)) {
        const props = feature.properties || {};

        const mgValue = extractNumericProperty(props, [
          'Kadar_Mg',
          'kadar_mg',
          'Magnesium',
          'magnesium',
          'Mg',
          'mg',
          'value',
          'VALUE',
        ]);

        if (mgValue !== null) {
          return mgValue;
        }

        return null;
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

  const nValue = findNitrogenValueFromGeojson(nitrogenGeojson, lat, lng);
  const mgValue = findMagnesiumValueFromGeojson(magnesiumGeojson, lat, lng);

  return {
    n: nValue ?? DEFAULT_N,
    p: DEFAULT_P,
    k: DEFAULT_K,
    mg: mgValue ?? DEFAULT_MG,
    sources: {
      n: nValue !== null ? 'geojson-gridcode' : 'default',
      p: 'default',
      k: 'default',
      mg: mgValue !== null ? 'geojson' : 'default',
    },
  };
}