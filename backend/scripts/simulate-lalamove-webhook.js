#!/usr/bin/env node
/**
 * Dev-only tool: simulates a Lalamove webhook event and POSTs it to the local backend
 * (LalamoveWebhookController) with a real, valid HMAC signature — so you can test driver
 * assignment / status progression in Sandbox without waiting for Lalamove's own driver-matching.
 *
 * Why this exists: Lalamove has no "ASSIGNED" order status and no sandbox endpoint to force
 * driver assignment. The real signal is the separate DRIVER_ASSIGNED webhook event (order status
 * can still read ASSIGNING_DRIVER even after a driver is attached); ON_GOING is the real status
 * Lalamove uses once a driver has accepted. This script can send either.
 *
 * Signature scheme (must match LalamoveHmacSigner.verifyWebhookSignature / LalamoveWebhookController
 * exactly, or the backend silently ignores the event and still returns 200):
 *   - The backend re-serializes ONLY the "data" object with Jackson's default ObjectMapper
 *     (compact, no whitespace, keys in parse/insertion order) before computing the signature —
 *     not the raw bytes you sent. This script builds "data" with a fixed key order and serializes
 *     it the same compact way (JSON.stringify with no indent), which matches Jackson's default
 *     output byte-for-byte for the plain-string fields used here.
 *   - signed string = `${timestampSeconds}\r\nPOST\r\n${webhookPath}\r\n\r\n${dataJson}`
 *   - signature = lowercase hex HMAC-SHA256 of that string using LALAMOVE_API_SECRET.
 *
 * Usage:
 *   node scripts/simulate-lalamove-webhook.js <lalamoveOrderId> [options]
 *
 * Options:
 *   --event <DRIVER_ASSIGNED|ORDER_STATUS_CHANGED>   default: DRIVER_ASSIGNED
 *   --status <ON_GOING|PICKED_UP|COMPLETED|REJECTED|CANCELED>   for ORDER_STATUS_CHANGED (default ON_GOING)
 *   --share-link <url>        for ORDER_STATUS_CHANGED (optional)
 *   --driver-name <name>      for DRIVER_ASSIGNED (default "Simulated Rider")
 *   --driver-phone <phone>    for DRIVER_ASSIGNED (default "+639171234567")
 *   --plate <plate>           for DRIVER_ASSIGNED (default "ABC 1234")
 *   --full                    send DRIVER_ASSIGNED then ORDER_STATUS_CHANGED(ON_GOING) back to back
 *   --lifecycle               run the full realistic sequence — see "Lifecycle mode" below
 *   --public-token <uuid>     the order's publicToken (not orderNumber, not lalamoveOrderId) —
 *                             only used to print live before/after state after each step via
 *                             GET /api/v1/orders/:publicToken. The public endpoint resolves by
 *                             publicToken only (see DEC-007) — passing an orderNumber here just
 *                             gets a silent 404 on every step, which looks like the webhook isn't
 *                             doing anything even when it's working perfectly (see docsdebug.md).
 *   --driver2-name/-phone/-plate   the replacement driver for --lifecycle (default "Maria Santos")
 *   --step-delay-ms <ms>      pause between --lifecycle steps (default 800)
 *   --url <base>              backend base URL (default http://localhost:8080)
 *   --dry-run                 print the signed payload instead of sending it
 *
 * Lifecycle mode (--lifecycle):
 *   Runs: DRIVER_ASSIGNED (driver A) → DRIVER_ASSIGNED (driver B) → ORDER_STATUS_CHANGED ON_GOING
 *         → ORDER_STATUS_CHANGED PICKED_UP → ORDER_STATUS_CHANGED COMPLETED.
 *   IMPORTANT CAVEAT: Lalamove's documented webhook events are only ORDER_STATUS_CHANGED and
 *   DRIVER_ASSIGNED (among others we don't handle) — there is no distinct "driver rejected"
 *   event type in their docs. A single driver rejecting a match isn't itself reported to your
 *   webhook; Lalamove just keeps trying and eventually fires another DRIVER_ASSIGNED for whichever
 *   driver actually accepts (our own applyDeliveryWebhookUpdate() unconditionally overwrites
 *   driverName/phone/plate on each DRIVER_ASSIGNED, so this is exactly how the real system would
 *   behave too). The two-DRIVER_ASSIGNED-events step above models "driver A was matched, then
 *   replaced by driver B" — the closest honest simulation of "one driver rejects, another
 *   accepts" without inventing an event type Lalamove doesn't actually send. (If Lalamove really
 *   can't find anyone after repeated rejections, the order status becomes ORDER_STATUS_CHANGED
 *   REJECTED instead — a terminal failure state, not a retry signal — use `--event
 *   ORDER_STATUS_CHANGED --status REJECTED` directly to simulate that instead of --lifecycle.)
 *
 * Requires LALAMOVE_API_SECRET in the environment — the same variable the backend itself reads
 * (see application.yml's lalamove.api-secret).
 *
 * Finding the lalamoveOrderId (and, if using --public-token, the publicToken): neither is exposed
 * by any admin API/UI today (OrderResponseDto only exposes trackingShareLink, which is a separate,
 * Lalamove-generated public share token — NOT the same value as the internal orderId; using the
 * share-link token here will silently no-op, since the backend only logs a bad signature, not an
 * unmatched order id). With H2 console enabled (application.yml: spring.h2.console.enabled=true,
 * path=/h2-console), the file-backed DB is queryable in the same running process (NOTE: this is
 * jdbc:h2:file, not jdbc:h2:mem — the DB moved to a file in DEC-003, 2026-08-13; using the old
 * in-memory URL here just gets you an empty new database, not an error, which is its own trap):
 *   1. GET  http://localhost:8080/h2-console/login.jsp  (follow the jsessionid redirect)
 *   2. POST http://localhost:8080/h2-console/login.do?jsessionid=<id>
 *        driver=org.h2.Driver, url=jdbc:h2:file:./data/bakerydb, user=sa, password=, language=en,
 *        setting=Generic H2 (Embedded), name=Generic H2 (Embedded)
 *   3. POST http://localhost:8080/h2-console/query.do?jsessionid=<id>
 *        sql=SELECT order_number, public_token, lalamove_order_id, delivery_status FROM orders
 *            WHERE order_number='ORD-XXXXXX'
 *   (all three calls need the same cookie jar / jsessionid). Same session cookies work for any
 *   further ad-hoc query. This is a real gap worth fixing later — surfacing lalamoveOrderId (and
 *   publicToken) on the admin order view would make this lookup unnecessary.
 *
 * Examples:
 *   node scripts/simulate-lalamove-webhook.js PH1002... --driver-name "Juan Cruz"
 *   node scripts/simulate-lalamove-webhook.js PH1002... --full
 *   node scripts/simulate-lalamove-webhook.js PH1002... --event ORDER_STATUS_CHANGED --status PICKED_UP
 *   node scripts/simulate-lalamove-webhook.js PH1002... --lifecycle --public-token 010c6241-...
 */

const crypto = require('crypto');

const WEBHOOK_PATH = '/api/v1/lalamove/webhook';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function fail(message) {
  console.error(`Error: ${message}\n`);
  console.error('Run with no arguments to see usage.');
  process.exit(1);
}

function printUsage() {
  console.log(`Usage: node scripts/simulate-lalamove-webhook.js <lalamoveOrderId> [options]

Options:
  --event <DRIVER_ASSIGNED|ORDER_STATUS_CHANGED>   default: DRIVER_ASSIGNED
  --status <ON_GOING|PICKED_UP|COMPLETED|REJECTED|CANCELED>   for ORDER_STATUS_CHANGED (default ON_GOING)
  --share-link <url>        for ORDER_STATUS_CHANGED (optional)
  --driver-name <name>      for DRIVER_ASSIGNED (default "Simulated Rider")
  --driver-phone <phone>    for DRIVER_ASSIGNED (default "+639171234567")
  --plate <plate>           for DRIVER_ASSIGNED (default "ABC 1234")
  --full                    send DRIVER_ASSIGNED then ORDER_STATUS_CHANGED(ON_GOING) back to back
  --lifecycle               run the full sequence: driver A -> driver B -> ON_GOING -> PICKED_UP -> COMPLETED
  --public-token <uuid>     the order's publicToken (not orderNumber) — prints live state after each step
  --driver2-name/-phone/-plate   replacement driver for --lifecycle (default "Maria Santos")
  --step-delay-ms <ms>      pause between --lifecycle steps (default 800)
  --url <base>              backend base URL (default http://localhost:8080)
  --dry-run                 print the signed payload instead of sending it

Examples:
  node scripts/simulate-lalamove-webhook.js PH1002... --driver-name "Juan Cruz"
  node scripts/simulate-lalamove-webhook.js PH1002... --full
  node scripts/simulate-lalamove-webhook.js PH1002... --event ORDER_STATUS_CHANGED --status PICKED_UP
  node scripts/simulate-lalamove-webhook.js PH1002... --lifecycle --public-token 010c6241-...
`);
}

/** Builds the "data" object with a fixed key order, matching what LalamoveWebhookController
 *  reads: order.orderId is required for every event type; order.status/shareLink are read only
 *  for ORDER_STATUS_CHANGED; driver.* is read only for DRIVER_ASSIGNED. */
function buildData(eventType, opts) {
  if (eventType === 'DRIVER_ASSIGNED') {
    return {
      order: { orderId: opts.lalamoveOrderId },
      driver: {
        name: opts.driverName,
        phone: opts.driverPhone,
        plateNumber: opts.plate,
      },
    };
  }

  const order = { orderId: opts.lalamoveOrderId, status: opts.status };
  if (opts.shareLink) order.shareLink = opts.shareLink;
  return { order };
}

/** Compact JSON, no whitespace, keys in the order given above — matches Jackson's default
 *  ObjectMapper.writeValueAsString() output for these plain-string-valued objects. */
function compactJson(value) {
  return JSON.stringify(value);
}

function sign(secret, timestampSeconds, dataJson) {
  const signedString = `${timestampSeconds}\r\nPOST\r\n${WEBHOOK_PATH}\r\n\r\n${dataJson}`;
  return crypto.createHmac('sha256', secret).update(signedString, 'utf8').digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Prints the fields --lifecycle cares about, straight from the backend — not assumed. */
async function printOrderState(opts, label) {
  if (!opts.publicToken) return;
  const base = opts.url || 'http://localhost:8080';
  try {
    const res = await fetch(`${base}/api/v1/orders/${opts.publicToken}`);
    if (!res.ok) {
      console.log(`  [${label}] GET /api/v1/orders/${opts.publicToken} -> HTTP ${res.status}`);
      return;
    }
    const order = await res.json();
    console.log(`  [${label}] deliveryStatus=${order.deliveryStatus} driverName=${order.driverName} driverPhone=${order.driverPhone} driverPlateNumber=${order.driverPlateNumber}`);
  } catch (err) {
    console.log(`  [${label}] could not fetch order state: ${err.message}`);
  }
}

async function sendEvent(eventType, opts, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = buildData(eventType, opts);
  const dataJson = compactJson(data);
  const signature = sign(secret, timestamp, dataJson);

  const envelope = {
    eventType,
    eventId: `evt_sim_${timestamp}_${Math.floor(Math.random() * 1e6)}`,
    timestamp,
    data,
    signature,
  };

  const body = JSON.stringify(envelope);

  console.log(`\n--- ${eventType} ---`);
  console.log('Payload:', body);

  if (opts['dry-run']) {
    console.log('(dry run — not sent)');
    return;
  }

  const url = `${opts.url || 'http://localhost:8080'}${WEBHOOK_PATH}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const text = await res.text();
  console.log(`-> HTTP ${res.status}: ${text}`);
  if (res.status !== 200) {
    console.warn('Unexpected status — the endpoint always returns 200 by design, even for a bad signature, so this likely means the backend itself is unreachable.');
  }
}

/** See the "Lifecycle mode" doc comment at the top of this file for exactly what this models
 *  and why — most importantly, why "driver rejects" is simulated as a second DRIVER_ASSIGNED
 *  rather than a dedicated event Lalamove doesn't actually send. */
async function runLifecycle(opts, secret) {
  const stepDelay = Number(opts['step-delay-ms'] ?? 800);

  console.log('=== Lifecycle simulation start ===');
  await printOrderState(opts, 'before');

  console.log('\nStep 1/5: Driver A matched (DRIVER_ASSIGNED)');
  await sendEvent('DRIVER_ASSIGNED', { ...opts, driverName: opts.driverName, driverPhone: opts.driverPhone, plate: opts.plate }, secret);
  await printOrderState(opts, 'after driver A assigned');
  await sleep(stepDelay);

  console.log('\nStep 2/5: Driver A replaced by Driver B (models "driver A rejected, B accepted" — DRIVER_ASSIGNED)');
  await sendEvent('DRIVER_ASSIGNED', { ...opts, driverName: opts.driver2Name, driverPhone: opts.driver2Phone, plate: opts.driver2Plate }, secret);
  await printOrderState(opts, 'after driver B assigned');
  await sleep(stepDelay);

  console.log('\nStep 3/5: Driver B en route (ORDER_STATUS_CHANGED -> ON_GOING)');
  await sendEvent('ORDER_STATUS_CHANGED', { ...opts, status: 'ON_GOING' }, secret);
  await printOrderState(opts, 'after ON_GOING');
  await sleep(stepDelay);

  console.log('\nStep 4/5: Order picked up (ORDER_STATUS_CHANGED -> PICKED_UP)');
  await sendEvent('ORDER_STATUS_CHANGED', { ...opts, status: 'PICKED_UP' }, secret);
  await printOrderState(opts, 'after PICKED_UP');
  await sleep(stepDelay);

  console.log('\nStep 5/5: Delivery completed (ORDER_STATUS_CHANGED -> COMPLETED)');
  await sendEvent('ORDER_STATUS_CHANGED', { ...opts, status: 'COMPLETED' }, secret);
  await printOrderState(opts, 'after COMPLETED');

  console.log('\n=== Lifecycle simulation done ===');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lalamoveOrderId = args._[0];

  if (!lalamoveOrderId) {
    printUsage();
    process.exit(args._.length === 0 && Object.keys(args).length === 1 ? 0 : 1);
  }

  const secret = process.env.LALAMOVE_API_SECRET;
  if (!secret) {
    fail('LALAMOVE_API_SECRET is not set in this shell — export the same value the backend uses (see application.yml lalamove.api-secret).');
  }

  const opts = {
    lalamoveOrderId,
    publicToken: args['public-token'],
    driverName: args['driver-name'] || 'Simulated Rider',
    driverPhone: args['driver-phone'] || '+639171234567',
    plate: args.plate || 'ABC 1234',
    driver2Name: args['driver2-name'] || 'Maria Santos',
    driver2Phone: args['driver2-phone'] || '+639189876543',
    driver2Plate: args['driver2-plate'] || 'XYZ 5678',
    status: args.status || 'ON_GOING',
    shareLink: args['share-link'],
    url: args.url,
    'step-delay-ms': args['step-delay-ms'],
    'dry-run': !!args['dry-run'],
  };

  if (args.lifecycle) {
    await runLifecycle(opts, secret);
    return;
  }

  const event = (args.event || 'DRIVER_ASSIGNED').toUpperCase();

  if (args.full) {
    await sendEvent('DRIVER_ASSIGNED', opts, secret);
    await sendEvent('ORDER_STATUS_CHANGED', opts, secret);
    return;
  }

  if (event !== 'DRIVER_ASSIGNED' && event !== 'ORDER_STATUS_CHANGED') {
    fail(`Unknown --event "${event}" — must be DRIVER_ASSIGNED or ORDER_STATUS_CHANGED.`);
  }

  await sendEvent(event, opts, secret);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
