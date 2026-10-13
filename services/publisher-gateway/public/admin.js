const $ = (id) => document.getElementById(id);
let busy = false;
let messageTimer;
let savedEnabled = false;
const editorReady = new Promise((resolve) => {
  document.addEventListener('publisher-editor-ready', (event) => resolve(event.detail), { once: true });
});
// Static Lucide icons from lucide-react (ISC), keeping the console independent of a CDN.
const icons = {
  "ArrowRight": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-arrow-right\" aria-hidden=\"true\"><path d=\"M5 12h14\"></path><path d=\"m12 5 7 7-7 7\"></path></svg>",
  "ShieldCheck": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-shield-check\" aria-hidden=\"true\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"></path><path d=\"m9 12 2 2 4-4\"></path></svg>",
  "LayoutDashboard": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-layout-dashboard\" aria-hidden=\"true\"><rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"></rect><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"></rect><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"></rect><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"></rect></svg>",
  "Server": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-server\" aria-hidden=\"true\"><rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\" ry=\"2\"></rect><rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" ry=\"2\"></rect><line x1=\"6\" x2=\"6.01\" y1=\"6\" y2=\"6\"></line><line x1=\"6\" x2=\"6.01\" y1=\"18\" y2=\"18\"></line></svg>",
  "Boxes": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-boxes\" aria-hidden=\"true\"><path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\"></path><path d=\"m7 16.5-4.74-2.85\"></path><path d=\"m7 16.5 5-3\"></path><path d=\"M7 16.5v5.17\"></path><path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\"></path><path d=\"m17 16.5-5-3\"></path><path d=\"m17 16.5 4.74-2.85\"></path><path d=\"M17 16.5v5.17\"></path><path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\"></path><path d=\"M12 8 7.26 5.15\"></path><path d=\"m12 8 4.74-2.85\"></path><path d=\"M12 13.5V8\"></path></svg>",
  "Gauge": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-gauge\" aria-hidden=\"true\"><path d=\"m12 14 4-4\"></path><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"></path></svg>",
  "KeyRound": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-key-round\" aria-hidden=\"true\"><path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"></path><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"></circle></svg>",
  "ExternalLink": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-external-link\" aria-hidden=\"true\"><path d=\"M15 3h6v6\"></path><path d=\"M10 14 21 3\"></path><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"></path></svg>",
  "LogOut": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-log-out\" aria-hidden=\"true\"><path d=\"m16 17 5-5-5-5\"></path><path d=\"M21 12H9\"></path><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"></path></svg>",
  "Menu": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-menu\" aria-hidden=\"true\"><path d=\"M4 5h16\"></path><path d=\"M4 12h16\"></path><path d=\"M4 19h16\"></path></svg>",
  "Plus": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-plus\" aria-hidden=\"true\"><path d=\"M5 12h14\"></path><path d=\"M12 5v14\"></path></svg>",
  "Trash2": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-trash2 lucide-trash-2\" aria-hidden=\"true\"><path d=\"M10 11v6\"></path><path d=\"M14 11v6\"></path><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"></path><path d=\"M3 6h18\"></path><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path></svg>",
  "Save": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-save\" aria-hidden=\"true\"><path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\"></path><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\"></path><path d=\"M7 3v4a1 1 0 0 0 1 1h7\"></path></svg>"
};
function renderIcons() {
  document.querySelectorAll('[data-icon]').forEach((element) => {
    const name = element.dataset.icon;
    if (!icons[name] || element.firstChild) return;
    element.innerHTML = icons[name];
  });
}
renderIcons();
async function api(path, options = {}) {
  const response = await fetch(`/api/publisher/${path}`, {
    ...options, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}
function message(text, success = false) {
  clearTimeout(messageTimer);
  const target = $('workspace').hidden ? $('loginMessage') : $('message');
  target.textContent = text;
  target.className = `${target.id === 'message' ? 'notice' : 'login-error'}${success ? ' success' : ''}`;
  if (success) messageTimer = setTimeout(() => { target.textContent = ''; }, 6000);
}
async function action(callback) {
  if (busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll('button[type="submit"], #logout, #enabled')];
  const disabled = buttons.map((button) => button.disabled);
  buttons.forEach((button) => { button.disabled = true; });
  message('');
  try { await callback(); } catch (error) { message(error.message); }
  finally { busy = false; buttons.forEach((button, index) => { button.disabled = disabled[index]; }); }
}
async function loadConfig() {
  const data = await api('admin/config');
  $('loginShell').hidden = true; $('workspace').hidden = false; $('logout').hidden = false;
  $('name').value = data.name; $('baseUrl').value = data.baseUrl; $('enabled').checked = data.enabled;
  (await editorReady).setConfig(data);
  for (const key of ['dailyPerIp', 'dailyTotal', 'perMinute', 'concurrency', 'queryConcurrency']) $(key).value = data.limits[key];
  $('usageTotal').innerHTML = `${data.usage.total} <small>/ ${data.limits.dailyTotal}</small>`;
  $('usageActive').textContent = data.usage.activeGeneration;
  $('usageQueued').textContent = data.usage.queued;
  $('usageQueries').textContent = data.usage.activeQueries;
  $('modelCount').textContent = data.models.length;
  savedEnabled = data.enabled;
  renderSharingStatus();
}
function renderSharingStatus() {
  const enabled = $('enabled').checked;
  const pending = enabled !== savedEnabled;
  const status = pending ? (enabled ? '待保存开放' : '待保存关闭') : (savedEnabled ? '共享已开放' : '共享未开放');
  $('statusText').textContent = status;
  $('serviceStatus').title = status;
  $('serviceStatus').classList.toggle('paused', !savedEnabled && !pending);
  $('serviceStatus').classList.toggle('pending', pending);
  $('sharingLabel').textContent = pending ? '开放共享（待保存）' : '开放共享';
}
$('enabled').addEventListener('change', renderSharingStatus);
$('login').onsubmit = (event) => { event.preventDefault(); action(async () => {
  await api('login', { method: 'POST', body: JSON.stringify({ role: 'admin', secret: $('password').value }) });
  $('password').value = ''; await loadConfig();
}); };
$('config').onsubmit = (event) => { event.preventDefault(); action(async () => {
  const editor = await editorReady;
  if (editor.isLoading()) throw new Error('请等待模型获取完成');
  const models = editor.getModels();
  const limits = Object.fromEntries(['dailyPerIp', 'dailyTotal', 'perMinute', 'concurrency', 'queryConcurrency'].map((key) => [key, Number($(key).value)]));
  await api('admin/config', { method: 'PUT', body: JSON.stringify({ name: $('name').value, baseUrl: $('baseUrl').value,
    apiKey: editor.getApiKey(), enabled: $('enabled').checked, models, limits }) });
  await loadConfig(); message('设置已保存', true);
}); };
$('rotate').onsubmit = (event) => { event.preventDefault(); action(async () => {
  await api('admin/access-code', { method: 'PUT', body: JSON.stringify({ code: $('code').value }) });
  $('code').value = ''; message('访问码已更新，测试者需要重新登录', true);
}); };
$('logout').onclick = () => action(async () => { await api('logout', { method: 'POST', body: '{}' }); location.reload(); });
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((entry) => { entry.classList.toggle('active', entry === item); entry.removeAttribute('aria-current'); });
  item.setAttribute('aria-current', 'location');
  $('workspace').classList.remove('menu-open');
  $('menuToggle').setAttribute('aria-expanded', 'false');
  $('breadcrumb').textContent = `控制台 / ${item.textContent.trim()}`;
}));
$('menuToggle').onclick = () => {
  const open = $('workspace').classList.toggle('menu-open');
  $('menuToggle').setAttribute('aria-expanded', String(open));
};
document.addEventListener('click', (event) => {
  if (event.target.closest('.sidebar, #menuToggle')) return;
  $('workspace').classList.remove('menu-open'); $('menuToggle').setAttribute('aria-expanded', 'false');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { $('workspace').classList.remove('menu-open'); $('menuToggle').setAttribute('aria-expanded', 'false'); }
});
loadConfig().catch((error) => { if (error.message !== '请重新登录') message('请输入管理员密码'); });
