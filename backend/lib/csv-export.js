import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '../../data');

export function measurementsToCsv(measurements) {
  const header = 'Protocol,Latency(ms),Value,Timestamp(ms)\n';
  const rows = measurements
    .map((m) => `${m.protocol},${m.latency},${m.value},${m.timestamp}`)
    .join('\n');
  return header + rows;
}

export function saveCsvFile(csvContent, prefix = 'mesures') {
  mkdirSync(DATA_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `${prefix}_${stamp}.csv`;
  const filepath = join(DATA_DIR, filename);
  writeFileSync(filepath, csvContent, 'utf8');
  return { filename, filepath };
}

export function handleCsvExport(req, res) {
  const measurements = req.body?.measurements;
  if (!Array.isArray(measurements) || measurements.length === 0) {
    res.status(400).json({ error: 'Aucune mesure à exporter' });
    return;
  }
  try {
    const csv = measurementsToCsv(measurements);
    const prefix =
      typeof req.body?.prefix === 'string' && req.body.prefix.trim()
        ? req.body.prefix.trim().replace(/[^\w-]+/g, '_')
        : 'mesures';
    const { filename, filepath } = saveCsvFile(csv, prefix);
    console.log(`CSV enregistré : ${filepath} (${measurements.length} mesures)`);
    res.json({ ok: true, filename, path: filepath, count: measurements.length });
  } catch (err) {
    console.error('Erreur export CSV:', err);
    res.status(500).json({ error: 'Échec enregistrement CSV' });
  }
}
