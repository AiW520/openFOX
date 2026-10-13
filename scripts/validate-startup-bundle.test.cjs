const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const validator = fs.readFileSync(path.join(__dirname, 'validate-startup-bundle.js'), 'utf8');

function validate(assets) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-startup-test-'));
  const dist = path.join(root, 'dist/apps/web');
  const logs = [];
  try {
    fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<script src="/assets/index-fixture.js"></script>');
    for (const [name, source] of Object.entries(assets)) {
      fs.writeFileSync(path.join(dist, 'assets', name), source);
    }
    vm.runInNewContext(validator, {
      require,
      __dirname: path.join(root, 'scripts'),
      console: { log: text => logs.push(text), error: text => logs.push(text) },
      process: { exit: code => { throw new Error(`exit ${code}`); } },
    });
    return { report: JSON.parse(logs.at(-1)) };
  } catch (error) {
    if (error.message !== 'exit 1') throw error;
    return { failure: logs.join('\n') };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('checks bootstrap budgets through both dynamic startup wrappers', () => {
  const result = validate({
    'index-fixture.js': 'import("./main-fixture.js");',
    'main-fixture.js': 'import("./bootstrap-fixture.js");',
    'bootstrap-fixture.js': ' '.repeat(512001),
  });
  assert.match(result.failure, /bootstrap-fixture\.js: 512001 bytes/);
});

test('checks sibling static imports after returning from a child', () => {
  const result = validate({
    'index-fixture.js': 'import "./first.js"; import "./diagram-engines-fixture.js";',
    'first.js': 'import "./leaf.js";',
    'leaf.js': '',
    'diagram-engines-fixture.js': '',
  });
  assert.match(result.failure, /diagram-engines-fixture\.js/);
});

test('keeps lazy feature dependencies outside the startup budget', () => {
  const result = validate({
    'index-fixture.js': 'import("./main-fixture.js");',
    'main-fixture.js': 'import("./bootstrap-fixture.js");',
    'bootstrap-fixture.js': 'import "./shared.js"; import("./feature.js");',
    'shared.js': '',
    'feature.js': 'import "./diagram-engines-fixture.js";',
    'diagram-engines-fixture.js': ' '.repeat(512001),
  });
  assert(result.report.entryDependencyGraph.includes('assets/bootstrap-fixture.js'));
  assert(result.report.entryDependencyGraph.includes('assets/shared.js'));
  assert(!result.report.entryDependencyGraph.includes('assets/feature.js'));
});
