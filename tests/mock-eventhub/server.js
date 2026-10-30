const http = require('node:http');
const { URL } = require('node:url');

const HOST = '127.0.0.1';
const PORT = 4173;
const MOCK_EMAIL = 'qa@example.test';
const MOCK_PASSWORD = 'LocalMockOnly-123!';
const EVENT_NAME = 'Dilli Diwali Mela';
const INITIAL_SEATS_AVAILABLE = 25;
const sessions = new Set();
const completedBookings = new Set();
let seatsAvailable = INITIAL_SEATS_AVAILABLE;

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...headers
  });
  response.end(body);
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} - Local EventHub Mock</title></head>
<body>
  <header><h1>EventHub (Local Mock)</h1><nav><a href="/">Home</a> <a href="/events">Events</a></nav></header>
  <main>${body}</main>
</body>
</html>`;
}

function isAuthenticated(request) {
  const cookie = request.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)mock_session=([A-Za-z0-9-]+)/);
  return Boolean(match && sessions.has(match[1]));
}

function getSessionId(request) {
  const cookie = request.headers.cookie || '';
  return cookie.match(/(?:^|;\s*)mock_session=([A-Za-z0-9-]+)/)?.[1] || null;
}

function requireAuthentication(request, response) {
  if (isAuthenticated(request)) return true;
  response.writeHead(303, { Location: '/login', 'Cache-Control': 'no-store' });
  response.end();
  return false;
}

function readForm(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 8192) {
        reject(new Error('Form data exceeded the local mock limit.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(new URLSearchParams(body)));
    request.on('error', reject);
  });
}

function renderLogin(errorMessage = '') {
  return layout('Sign In', `
    <h2>Sign In</h2>
    ${errorMessage ? `<p role="alert">${errorMessage}</p>` : ''}
    <form method="post" action="/login">
      <label>Email <input type="email" name="email" placeholder="you@email.com" required></label>
      <label>Password <input type="password" id="password" name="password" required></label>
      <button type="submit">Sign In</button>
    </form>
  `);
}

function renderEvents() {
  const seatPhrase = process.env.JIRAPILOT_MOCK_FORCE_FAILURE === 'true'
    ? 'seats still open'
    : 'seats available';

  return layout('Events', `
    <h2>Events</h2>
    <article data-testid="event-card">
      <h3>${EVENT_NAME}</h3>
      <p>${seatsAvailable} ${seatPhrase}</p>
      <button type="button" data-testid="book-now-btn" onclick="window.location.href='/events/dilli-diwali-mela'">Book Now</button>
    </article>
  `);
}

function renderEventDetails() {
  return layout(EVENT_NAME, `
    <h2>${EVENT_NAME}</h2>
    <p>Tickets selected: <span id="ticket-count">1</span></p>
    <form method="post" action="/booking/confirm">
      <input type="hidden" name="ticketCount" value="1">
      <label>Name <input id="customerName" name="customerName" required></label>
      <label>Email <input data-testid="customer-email" name="customerEmail" type="email" required></label>
      <label>Phone <input id="phone" name="phone" required></label>
      <button type="submit">Confirm Booking</button>
    </form>
  `);
}

const server = http.createServer(async (request, response) => {
  const remoteAddress = request.socket.remoteAddress;
  const hostHeader = request.headers.host || '';
  if (
    !['127.0.0.1', '::ffff:127.0.0.1'].includes(remoteAddress) ||
    !/^127\.0\.0\.1:4173$/.test(hostHeader)
  ) {
    return send(response, 403, layout('Forbidden', '<h2>Local requests only</h2>'));
  }

  const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);
  const pathname = requestUrl.pathname;

  if (request.method === 'GET' && pathname === '/health') {
    return send(response, 200, layout('Ready', '<p>Local EventHub mock ready.</p>'));
  }

  if (request.method === 'POST' && pathname === '/__test/reset') {
    seatsAvailable = INITIAL_SEATS_AVAILABLE;
    sessions.clear();
    completedBookings.clear();
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    return response.end();
  }

  if (request.method === 'GET' && pathname === '/login') {
    return send(response, 200, renderLogin());
  }

  if (request.method === 'POST' && pathname === '/login') {
    const form = await readForm(request);
    if (form.get('email') !== MOCK_EMAIL || form.get('password') !== MOCK_PASSWORD) {
      return send(response, 401, renderLogin('Invalid local mock credentials.'));
    }

    const sessionId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessions.add(sessionId);
    response.writeHead(303, {
      Location: '/',
      'Set-Cookie': `mock_session=${sessionId}; HttpOnly; SameSite=Strict; Path=/`,
      'Cache-Control': 'no-store'
    });
    return response.end();
  }

  if (request.method === 'GET' && pathname === '/') {
    if (!requireAuthentication(request, response)) return;
    return send(response, 200, layout('Home', '<h2>Welcome to the local EventHub mock.</h2>'));
  }

  if (request.method === 'GET' && pathname === '/events') {
    if (!requireAuthentication(request, response)) return;
    return send(response, 200, renderEvents());
  }

  if (request.method === 'GET' && pathname === '/events/dilli-diwali-mela') {
    if (!requireAuthentication(request, response)) return;
    return send(response, 200, renderEventDetails());
  }

  if (request.method === 'POST' && pathname === '/booking/confirm') {
    if (!requireAuthentication(request, response)) return;
    const sessionId = getSessionId(request);
    const form = await readForm(request);
    if (
      !form.get('customerName') ||
      !form.get('customerEmail') ||
      !form.get('phone') ||
      form.get('ticketCount') !== '1' ||
      !sessionId ||
      completedBookings.has(sessionId) ||
      seatsAvailable < 1
    ) {
      return send(response, 400, layout('Booking Error', '<h2>Local mock booking could not be completed.</h2>'));
    }

    completedBookings.add(sessionId);
    seatsAvailable -= 1;
    return send(response, 200, layout(
      'Booking Confirmed',
      '<h2>Booking Confirmed!</h2><p>Your tickets are reserved.</p><a href="/events">Return to Events</a>'
    ));
  }

  return send(response, 404, layout('Not Found', '<h2>Local mock page not found.</h2>'));
});

server.listen(PORT, HOST, () => {
  console.log(`Local EventHub mock listening at http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
