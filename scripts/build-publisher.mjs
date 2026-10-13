import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  VITE_PUBLISHER_MODE: '1',
  // The publisher is served from the domain root. Root-relative assets also
  // keep deep SPA routes such as /workflow/canvas/:id from resolving assets
  // under the route itself.
  VITE_BASE_URL: '/',
  GOMAXPROCS: process.env.GOMAXPROCS || '2',
  GOMEMLIMIT: process.env.GOMEMLIMIT || '512MiB',
};
for (const script of ['publisher:build-ui', 'build:web']) {
  const result = spawnSync('pnpm', ['run', script], {
    env, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const { readFileSync } = await import('node:fs');
const indexHtml = readFileSync('dist/apps/web/index.html', 'utf8');
if (!indexHtml.includes('src="/assets/') || !indexHtml.includes('href="/assets/')) {
  throw new Error('Publisher build must use root-relative /assets URLs');
}
if (!indexHtml.includes("register('/sw.js')")) {
  throw new Error('Publisher build must register the root Service Worker');
}
