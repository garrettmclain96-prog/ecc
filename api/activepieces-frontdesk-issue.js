'use strict';

const crypto = require('crypto');

const CONTRACT = 'activepieces.frontdesk_issue.v1';
const OPS_URL = 'https://vzxtzenlhbqkpbyyvksl.supabase.co';
const OPS_KEY = 'sb_publishable_Yk9ADeuyKatvKwS-DZEwqA_i-h3NY-_';
const OPS_SITE = 'd34e5c4c-8c2a-41ca-94b0-da4d1f8019a9';
const MAX_TEXT = 1200;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const CATEGORY_DEPARTMENTS = {
  maintenance: 'Maintenance',
  housekeeping: 'Maintenance',
  grounds: 'Lawn/Grounds',
  lawn: 'Lawn/Grounds',
  security: 'Security',
  bar: 'Bar',
  office: 'Office',
  guest: 'Office',
  it: 'Maintenance',
  pool: 'Maintenance'
};

function clean(value, fallback = '') {
  return String(value == null ? fallback : value).trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function choosePriority(input) {
  const raw = clean(input.priority || input.severity || 'normal').toLowerCase();
  if (['emergency', 'critical', 'urgent'].includes(raw)) return 'urgent';
  if (['high', 'important'].includes(raw)) return 'high';
  if (['low', 'minor'].includes(raw)) return 'low';
  return 'normal';
}

function chooseDepartment(input) {
  const category = clean(input.category || input.department || input.type || 'guest').toLowerCase();
  return CATEGORY_DEPARTMENTS[category] || CATEGORY_DEPARTMENTS[slug(category)] || 'Maintenance';
}

function buildDedupeKey(input, normalized) {
  const sourceId = clean(input.issueId || input.id || input.ticketId || input.eventId);
  if (sourceId) return `frontdesk:${slug(sourceId)}`;
  const fingerprint = [
    normalized.site,
    normalized.location,
    normalized.title,
    normalized.description,
    normalized.reportedBy
  ].join('|').toLowerCase();
  return `frontdesk:${crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 18)}`;
}

function normalizeIssue(input = {}) {
  const title = clean(input.title || input.summary || input.issue);
  const description = clean(input.description || input.details || input.message);
  const location = clean(input.location || input.siteLocation || input.unit || input.area);
  const reportedBy = clean(input.reportedBy || input.requester || input.guestName || input.source, 'Front Desk');
  const site = clean(input.site || input.property || 'Jamaica Beach RV Resort');
  const priority = choosePriority(input);
  const department = chooseDepartment(input);

  if (!title) throw Object.assign(new Error('Missing issue title'), { statusCode: 400 });
  if (!description && !location) throw Object.assign(new Error('Issue needs a description or location'), { statusCode: 400 });

  const normalized = {
    site,
    title: title.slice(0, 160),
    description,
    location,
    category: clean(input.category || input.department || 'guest'),
    priority,
    department,
    reportedBy,
    guestImpact: clean(input.guestImpact || input.impact),
    requestedAction: clean(input.requestedAction || input.action),
    createdAt: input.createdAt || new Date().toISOString()
  };

  return {
    ...normalized,
    dedupeKey: buildDedupeKey(input, normalized)
  };
}

function buildWorkOrder(issue) {
  const urgent = issue.priority === 'urgent';
  const title = `${issue.department}: ${issue.title}`;
  const summary = [
    issue.location ? `Location: ${issue.location}` : '',
    issue.description ? `Issue: ${issue.description}` : '',
    issue.guestImpact ? `Guest impact: ${issue.guestImpact}` : '',
    issue.requestedAction ? `Requested action: ${issue.requestedAction}` : '',
    `Reported by: ${issue.reportedBy}`
  ].filter(Boolean);

  return {
    id: `wo_${issue.dedupeKey.replace(/^frontdesk:/, '')}`,
    source: CONTRACT,
    dedupeKey: issue.dedupeKey,
    title,
    status: 'queued_for_ops_review',
    priority: issue.priority,
    department: issue.department,
    site: issue.site,
    location: issue.location,
    description: summary.join('\n'),
    assigneePool: urgent ? ['Management', issue.department, 'Security'] : [issue.department, 'Management'],
    nextActions: [
      'Review and claim the work order',
      urgent ? 'Confirm whether this is an emergency before notifying field staff' : 'Assign an eligible staff member',
      'Log resolution evidence before closing'
    ],
    evidence: [
      `Captured from ${CONTRACT}`,
      `Dedupe key: ${issue.dedupeKey}`
    ],
    createdAt: issue.createdAt
  };
}

function buildManagerNotification(issue, workOrder) {
  const urgent = issue.priority === 'urgent';
  return {
    status: 'draft_requires_approval',
    approvalRequired: true,
    reason: 'External sends and staff dispatches require human approval.',
    recipients: urgent ? ['Management', 'Security', workOrder.department] : ['Management', workOrder.department],
    channelHint: urgent ? 'manager_broadcast' : 'manager_review',
    subject: `[${issue.priority.toUpperCase()}] ${workOrder.title}`,
    body: [
      `${issue.site} front-desk issue is ready for review.`,
      issue.location ? `Location: ${issue.location}` : '',
      issue.description ? `Details: ${issue.description}` : '',
      `Work order: ${workOrder.id}`,
      `Dedupe: ${issue.dedupeKey}`
    ].filter(Boolean).join('\n')
  };
}

function buildContract(input) {
  const issue = normalizeIssue(input);
  const workOrder = buildWorkOrder(issue);
  const managerNotification = buildManagerNotification(issue, workOrder);
  return {
    ok: true,
    contract: CONTRACT,
    issue,
    workOrder,
    managerNotification,
    automationBoundaries: {
      allowedWithoutApproval: [
        'normalize issue payload',
        'create queued work-order action',
        'return manager notification draft',
        'dedupe repeated source events'
      ],
      requiresApproval: [
        'send SMS, email, push, or Vonage message',
        'dispatch staff',
        'close or cancel a work order',
        'change employee schedule or payroll records',
        'contact a guest'
      ]
    }
  };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const input = await readBody(req);
    const contract = buildContract(input);
    const authorization = req.headers?.authorization || '';
    if (authorization) {
      if (!/^Bearer [\w.-]+$/.test(authorization)) return res.status(401).json({ error: 'Invalid staff authorization' });
      const workOrder = contract.workOrder;
      const stored = await fetch(`${OPS_URL}/rest/v1/ops_work_orders?on_conflict=site_id,dedupe_key`, {
        method: 'POST',
        headers: { apikey: OPS_KEY, authorization, 'content-type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({
          id: workOrder.id, site_id: OPS_SITE, dedupe_key: workOrder.dedupeKey,
          title: workOrder.title, priority: workOrder.priority, department: workOrder.department,
          location: workOrder.location || '', description: workOrder.description || '',
          notification_subject: contract.managerNotification.subject
        })
      });
      if (!stored.ok) return res.status(stored.status === 401 ? 401 : 403).json({ ok: false, contract: CONTRACT, error: 'Shared queue rejected the staff identity or work order' });
      contract.sharedQueue = 'saved_or_already_exists';
    } else {
      contract.sharedQueue = 'preview_only_auth_required';
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(contract);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ ok: false, contract: CONTRACT, error: error.message || 'Webhook contract failed' });
  }
}

module.exports = handler;
module.exports.CONTRACT = CONTRACT;
module.exports.normalizeIssue = normalizeIssue;
module.exports.buildContract = buildContract;
