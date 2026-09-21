'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  createInitialState,
  createProject,
  updateProject,
  addAction,
  toggleAction,
  addProjectItem,
  getPortfolio,
  importState,
  buildHandoff
} = require('../mclain-app/public/core.js');
const repoStatusHandler = require('../api/repo-status.js');
const capabilitiesHandler = require('../api/capabilities.js');
const activepiecesFrontdeskIssue = require('../api/activepieces-frontdesk-issue.js');

const rootDir = path.resolve(__dirname, '..');

function invokeJsonHandler(handler, method = 'GET') {
  let statusCode = 200;
  const headers = {};
  let payload;
  handler(
    { method, query: {} },
    {
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
      status(code) { statusCode = code; return this; },
      json(body) { payload = body; return this; }
    }
  );
  return { statusCode, headers, payload };
}

function run() {
  const initial = createInitialState();
  assert.equal(initial.schemaVersion, 2);
  assert.ok(initial.projects.length >= 6);

  const withProject = createProject(initial, {
    name: 'Test System',
    outcome: 'Prove the operating loop works',
    priority: 'high'
  });
  assert.equal(withProject.projects.length, initial.projects.length + 1);
  assert.equal(initial.projects.length + 1, withProject.projects.length);
  const created = withProject.projects[0];
  assert.equal(created.name, 'Test System');
  assert.equal(created.nextActions.length, 3);

  const renamed = updateProject(withProject, created.id, { name: 'Renamed System' });
  assert.equal(renamed.projects[0].name, 'Renamed System');
  assert.equal(withProject.projects[0].name, 'Test System');

  const withAction = addAction(renamed, created.id, 'Ship the proof');
  const action = withAction.projects[0].nextActions.at(-1);
  const completed = toggleAction(withAction, created.id, action.id);
  assert.equal(completed.projects[0].nextActions.at(-1).done, true);

  const evidenced = addProjectItem(completed, created.id, 'evidence', 'Live URL verified');
  assert.equal(evidenced.projects[0].evidence.at(-1).text, 'Live URL verified');

  const portfolio = getPortfolio(evidenced);
  assert.equal(portfolio.total, evidenced.projects.length);
  assert.ok(portfolio.openActions > 0);
  assert.ok(portfolio.focusProject);

  const roundTrip = importState(JSON.stringify(evidenced));
  assert.equal(roundTrip.projects[0].name, 'Renamed System');
  assert.throws(() => importState('{bad json'));

  const handoff = buildHandoff(evidenced.projects[0]);
  assert.match(handoff, /Renamed System/);
  assert.match(handoff, /Next actions/);

  assert.deepEqual(repoStatusHandler.parseRepoRef('garrettmclain96-prog', 'ecc'), { owner: 'garrettmclain96-prog', repo: 'ecc' });
  assert.equal(repoStatusHandler.parseRepoRef('../secret', 'ecc'), null);

  const capabilitiesResponse = invokeJsonHandler(capabilitiesHandler);
  assert.equal(capabilitiesResponse.statusCode, 200);
  assert.equal(capabilitiesResponse.payload.system, 'McLain Systems OS');
  for (const engineId of ['aurora', 'ecc', 'activepieces', 'mem0', 'electric']) {
    const engine = capabilitiesResponse.payload.capabilities.find(item => item.id === engineId);
    assert.ok(engine, `${engineId} is registered`);
    assert.ok(engine.integration?.ownerInterface, `${engineId} has an owned interface`);
    assert.ok(engine.integration?.firstPilot, `${engineId} has a first pilot`);
    assert.ok(engine.integration?.nextAction, `${engineId} has a next action`);
    assert.ok(engine.integration?.proof, `${engineId} has acceptance proof`);
  }

  const activepieces = capabilitiesResponse.payload.capabilities.find(item => item.id === 'activepieces');
  assert.equal(activepieces.integration.endpoint, '/api/activepieces-frontdesk-issue');
  assert.equal(activepieces.integration.flowBlueprint, 'integrations/activepieces/frontdesk-issue-flow.blueprint.json');
  assert.equal(activepieces.integration.sampleEvent, 'integrations/activepieces/frontdesk-issue.sample.json');

  const activepiecesBlueprint = JSON.parse(fs.readFileSync(path.join(rootDir, activepieces.integration.flowBlueprint), 'utf8'));
  assert.equal(activepiecesBlueprint.contract, activepiecesFrontdeskIssue.CONTRACT);
  assert.equal(activepiecesBlueprint.target.path, activepieces.integration.endpoint);
  assert.equal(activepiecesBlueprint.target.method, 'POST');
  assert.ok(activepiecesBlueprint.successChecks.some(check => check.path === 'managerNotification.approvalRequired' && check.equals === true));
  assert.ok(activepiecesBlueprint.approvalBoundary.requiresApproval.includes('dispatch staff'));

  const frontdeskInput = JSON.parse(fs.readFileSync(path.join(rootDir, activepieces.integration.sampleEvent), 'utf8'));
  const firstContract = activepiecesFrontdeskIssue.buildContract(frontdeskInput);
  const secondContract = activepiecesFrontdeskIssue.buildContract(frontdeskInput);
  assert.equal(firstContract.contract, activepiecesFrontdeskIssue.CONTRACT);
  assert.equal(firstContract.workOrder.status, 'queued_for_ops_review');
  assert.equal(firstContract.workOrder.department, 'Maintenance');
  assert.equal(firstContract.managerNotification.approvalRequired, true);
  assert.equal(firstContract.workOrder.dedupeKey, secondContract.workOrder.dedupeKey);
  assert.ok(firstContract.automationBoundaries.requiresApproval.includes('send SMS, email, push, or Vonage message'));
  assert.throws(() => activepiecesFrontdeskIssue.buildContract({ description: 'No title' }), /Missing issue title/);
}

run();
console.log('mclain-os-core.test.js: PASS');
