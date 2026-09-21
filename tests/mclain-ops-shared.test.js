'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/activepieces-frontdesk-issue.js');

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '../integrations/activepieces/frontdesk-issue.sample.json'), 'utf8'));

async function invoke(authorization) {
  let code = 200;
  let body;
  await handler({ method: 'POST', body: sample, headers: authorization ? { authorization } : {} }, {
    setHeader() {},
    status(value) { code = value; return this; },
    json(value) { body = value; return this; }
  });
  return { code, body };
}

async function run() {
  const preview = await invoke();
  assert.equal(preview.code, 200);
  assert.equal(preview.body.sharedQueue, 'preview_only_auth_required');
  assert.equal((await invoke('not-a-bearer-token')).code, 401);

  const originalFetch = global.fetch;
  let insert;
  try {
    global.fetch = async (url, options) => {
      insert = { url, options, rows: JSON.parse(options.body) };
      return { ok: true, status: 201 };
    };
    const stored = await invoke('Bearer test.staff.jwt');
    assert.equal(stored.code, 200);
    assert.equal(stored.body.sharedQueue, 'saved_or_already_exists');
    assert.equal(insert.options.headers.authorization, 'Bearer test.staff.jwt');
    assert.equal(insert.rows.site_id, 'd34e5c4c-8c2a-41ca-94b0-da4d1f8019a9');
    assert.equal(insert.rows.dedupe_key, stored.body.workOrder.dedupeKey);
    assert.equal(stored.body.managerNotification.approvalRequired, true);

    global.fetch = async () => ({ ok: false, status: 403 });
    const rejected = await invoke('Bearer denied.staff.jwt');
    assert.equal(rejected.code, 403);
    assert.equal(rejected.body.ok, false);
  } finally { global.fetch = originalFetch; }
}

run().then(() => console.log('mclain-ops-shared.test.js: PASS')).catch(error => { console.error(error); process.exitCode = 1; });
