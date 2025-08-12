// node scripts/clean_dealers.js
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fetch from 'node-fetch';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centroid from '@turf/centroid';
import * as turf from '@turf/turf';

const ROOT = path.resolve(process.cwd());
const dealersCsv = path.join(ROOT, 'data', 'dealers_raw.csv');
const outCsv = path.join(ROOT, 'data', 'dealers_clean.csv');
const runLog = path.join(ROOT, 'data', 'cleaning-run.json');

// Minimal: load a state’s ZCTA file (extend to load multiple by inferring from lat/lon bbox)
async function loadZctaForState(abbr) {
  const base = 'https://raw.githubusercontent.com/9StonesofIC/State-zip-code-GeoJSON/master';
  const map = { DE: 'de_delaware', CA: 'ca_california', TX: 'tx_texas', NY: 'ny_new_york', FL: 'fl_florida' };
  const slug = map[abbr];
  if (!slug) throw new Error(`Add slug for ${abbr}`);
  const url = `${base}/${slug}_zip_codes_geo.min.json`;
  const geo = await fetch(url).then(r => r.json());
  return geo;
}

function whichStateFromLonLat(lon, lat) {
  // TODO: use a fast state point-in-polygon; for now return 'DE' as a safe starter
  return 'DE';
}

(async () => {
  const csvText = fs.readFileSync(dealersCsv, 'utf8');
  const rows = parse(csvText, { columns: true, skip_empty_lines: true });

  const cleaned = [];
  const report = { processed: 0, missingZipAssigned: 0, errors: 0 };

  for (const r of rows) {
    try {
      const rec = {
        dealer_id: String(r.dealer_id ?? r.id ?? '').trim(),
        name: String(r.name ?? '').trim(),
        lat: Number(r.lat ?? r.latitude),
        lon: Number(r.lon ?? r.longitude),
        zip: r.zip ? String(r.zip).padStart(5,'0') : '',
      };
      if (!(Number.isFinite(rec.lat) && Number.isFinite(rec.lon))) {
        throw new Error('Bad lat/lon');
      }

      if (!rec.zip) {
        const abbr = whichStateFromLonLat(rec.lon, rec.lat);
        const zcta = await loadZctaForState(abbr);
        // naive O(n) scan; upgrade to spatial index if needed in Node
        const pt = turf.point([rec.lon, rec.lat]);
        let assigned = '';
        for (const f of zcta.features) {
          if (booleanPointInPolygon(pt, f)) {
            assigned = String(f.properties?.ZCTA5CE10 || f.id);
            break;
          }
        }
        if (!assigned) {
          // fallback nearest centroid
          let best = { d: Infinity, zip: '' };
          for (const f of zcta.features) {
            const c = centroid(f).geometry.coordinates; // [lon,lat]
            const d = turf.distance(pt, turf.point(c), { units: 'kilometers' });
            if (d < best.d) best = { d, zip: String(f.properties?.ZCTA5CE10 || f.id) };
          }
          assigned = best.zip;
        }
        rec.zip = assigned;
        report.missingZipAssigned++;
      }

      cleaned.push(rec);
      report.processed++;
    } catch (e) {
      report.errors++;
    }
  }

  fs.writeFileSync(outCsv, stringify(cleaned, { header: true }));
  fs.writeFileSync(runLog, JSON.stringify(report, null, 2));
  console.log('Cleaned:', report);
})();
