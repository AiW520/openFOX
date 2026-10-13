import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';

const results = [];
const sizes = [
  { projects: 1, nodes: 100 },
  { projects: 10, nodes: 100 },
  { projects: 20, nodes: 500 },
];
const percentile = (samples, ratio) => samples[Math.ceil(samples.length * ratio) - 1];
for (const size of sizes) {
  const value = { state: { projects: Array.from({ length: size.projects }, (_, p) => ({
    id: `project-${p}`, title: `Project ${p}`, createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z',
    nodes: Array.from({ length: size.nodes }, (_, n) => ({
      id: `node-${n}`, type: n % 2 ? 'text' : 'image', title: `Node ${n}`, position: { x: n * 20, y: n * 10 }, width: 320, height: 240,
      metadata: { prompt: 'A representative prompt with composition and lighting details. '.repeat(8), model: 'publisher::gpt-image-2.5', size: '1024x1024', status: 'success',
        ...(n % 2 ? { content: 'Representative text. '.repeat(20) } : { storageKey: `image-${p}-${n}`, images: [{ id: `image-${n}`, storageKey: `image-${p}-${n}`, content: '', status: 'success', naturalWidth: 1024, naturalHeight: 1024, bytes: 1000000, mimeType: 'image/png' }] }),
      },
    })),
    connections: [], chatSessions: [], activeChatId: null, backgroundMode: 'lines', showImageInfo: false, viewport: { x: 0, y: 0, k: 1 },
  })), deletedProjects: [] }, version: 0 };
  for (let i = 0; i < 5; i++) JSON.parse(JSON.stringify(value));
  const stringify = [], parse = [];
  let serialized;
  for (let i = 0; i < 30; i++) {
    let start = performance.now();
    serialized = JSON.stringify(value);
    stringify.push(performance.now() - start);
    start = performance.now();
    JSON.parse(serialized);
    parse.push(performance.now() - start);
  }
  stringify.sort((a, b) => a - b);
  parse.sort((a, b) => a - b);
  results.push({ ...size, bytes: Buffer.byteLength(serialized), stringifyMedianMs: percentile(stringify, .5), stringifyP95Ms: percentile(stringify, .95), parseMedianMs: percentile(parse, .5), parseP95Ms: percentile(parse, .95) });
}
const report = { conditions: 'Node.js local CPU only; synthetic projects, media stored as keys, no database I/O or browser rendering', results };
await mkdir('tmp/canvas-performance', { recursive: true });
await writeFile('tmp/canvas-performance/snapshots.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
