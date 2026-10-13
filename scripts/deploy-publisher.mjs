import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const host = 'aliyun-server';
const origin = 'https://op.47.107.92.13.nip.io';
const credentialsPath = join(root, '.env.publisher-access');
const envPath = join(root, '.env.publisher-server');
const stage = join(root, 'tmp', 'publisher-deploy');
mkdirSync(stage, { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
if (!existsSync(credentialsPath)) {
  const admin = randomBytes(24).toString('base64url');
  const code = randomBytes(12).toString('base64url');
  writeFileSync(credentialsPath, `# Keep this file private. Only share TEST_ACCESS_CODE with testers.\nPUBLISHER_URL=${origin}/publisher\nTEST_URL=${origin}/?experience=new\nADMIN_PASSWORD=${admin}\nTEST_ACCESS_CODE=${code}\n`, { mode: 0o600 });
  writeFileSync(envPath, `PUBLISHER_DATA_DIR=/var/lib/opentu-publisher\nPUBLISHER_ORIGIN=${origin}\nPUBLISHER_ADMIN_PASSWORD=${admin}\nPUBLISHER_ACCESS_CODE=${code}\nPUBLISHER_TRUST_PROXY=1\nPUBLISHER_PORT=7211\n`, { mode: 0o600 });
}
if (!existsSync(envPath)) throw new Error('Missing .env.publisher-server; preserve existing server credentials');
if (!readFileSync(join(root, 'dist/apps/web/index.html'), 'utf8').includes('assets/')) throw new Error('Build frontend first');
const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const archive = join(stage, `opentu-${stamp}.tar.gz`);
for (const name of ['install.sh', 'renew-hook.sh']) {
  if (readFileSync(join(root, 'services/publisher-gateway/deploy', name), 'utf8').includes('\r')) {
    throw new Error(`Deployment script ${name} requires LF line endings`);
  }
}
run('tar', ['-czf', archive, 'dist/apps/web', 'services/publisher-gateway']);
run('ssh', [host, 'install -d -m 755 /opt/opentu-publisher/releases']);
run('scp', [archive, `${host}:/opt/opentu-publisher/releases/bundle-${stamp}.tar.gz`]);
// Upload credentials only on the first installation.
const check = spawnSync('ssh', [host, 'test -f /etc/opentu-publisher.env'], { windowsHide: true });
if (check.status === 1) run('scp', [envPath, `${host}:/etc/opentu-publisher.env`]);
else if (check.status !== 0) throw new Error('Could not check server environment');
const release = `/opt/opentu-publisher/releases/${stamp}`;
run('ssh', [host, `install -d -m 755 ${release} && tar -xzf /opt/opentu-publisher/releases/bundle-${stamp}.tar.gz -C ${release} && bash ${release}/services/publisher-gateway/deploy/install.sh ${release}`]);
console.log(`Test site: ${origin}\nPublisher: ${origin}/publisher\nCredentials: ${credentialsPath}`);
