'use strict';

const assert = require('assert');
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
}

run();
console.log('mclain-os-core.test.js: PASS');
