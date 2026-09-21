# Activepieces front desk issue pilot

This pilot connects an Activepieces flow to the McLain Systems OS webhook contract:

```text
POST {MCLAIN_OS_BASE_URL}/api/activepieces-frontdesk-issue
```

The flow turns a front-desk issue event into a queued McLain work-order draft and a manager notification draft. It does not send texts, emails, push notifications, Vonage messages, staff dispatches, or guest contact without manager approval.

## Flow assets

- `frontdesk-issue-flow.blueprint.json` describes the Activepieces flow, fields, HTTP action, response checks, and approval boundary.
- `frontdesk-issue.sample.json` is the canonical test event used by the pilot.

## Activepieces builder steps

1. Create a flow named `OpsPost Front Desk Issue Intake`.
2. Add a Webhook trigger and copy its Live URL into the front-desk source system.
3. Add a Code or mapping step that emits the fields in `frontdesk-issue.sample.json`.
4. Add an HTTP POST action:
   - URL: `{MCLAIN_OS_BASE_URL}/api/activepieces-frontdesk-issue`
   - Headers: `content-type: application/json` and `Authorization: Bearer <short-lived JWT for a resort site member>`
   - Body: mapped JSON event
5. Add a condition that requires `ok === true`, `workOrder.status === "queued_for_ops_review"`, and `managerNotification.approvalRequired === true`.
6. Require `sharedQueue === "saved_or_already_exists"` before treating the intake as persisted. Requests without a valid staff identity return a preview only or an error. A production Activepieces flow must obtain and refresh a dedicated staff account token through Supabase Auth; do not paste a personal token into the flow permanently.
7. Route successful responses to a manager review step. Do not add an external send or dispatch action before that approval.

## Local verification

Run McLain OS locally, then replay the sample event:

```bash
PORT=8913 npm run mclain:app
curl -fsS -X POST http://127.0.0.1:8913/api/activepieces-frontdesk-issue \
  -H 'content-type: application/json' \
  --data @integrations/activepieces/frontdesk-issue.sample.json
```

Expected preview response fields without a staff token:

- `contract: activepieces.frontdesk_issue.v1`
- `workOrder.status: queued_for_ops_review`
- `managerNotification.status: draft_requires_approval`
- `managerNotification.approvalRequired: true`
- stable `workOrder.dedupeKey` for repeated `issueId` values
- `sharedQueue: preview_only_auth_required` (nothing was saved)
