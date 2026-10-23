// Ring Ring Run lobby + relay server. No dependencies: just `node server.js`.
// Everyone opens http://<this-computer's-address>:3000 in a browser.
// The KING's browser runs the game; this server only hosts the lobby and passes messages around.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROLES = ['king', 'archer', 'thief'];
const clients = new Map(); // id -> {id,name,role,res}
let started = false;
let nextId = 1;

function addrs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(`http://${i.address}:${PORT}`);
  return out;
}
function send(c, msg) {
  try { c.res.write('data: ' + JSON.stringify(msg) + '\n\n'); } catch (e) {}
}
function lobbyFor(c) {
  return {
    t: 'lobby', you: c.id, started, addrs: addrs(),
    players: [...clients.values()].map(o => ({ id: o.id, name: o.name, role: o.role })),
  };
}
function broadcastLobby() { for (const c of clients.values()) send(c, lobbyFor(c)); }
function king() { return [...clients.values()].find(c => c.role === 'king'); }

function handle(c, m) {
  if (m.t === 'role') {
    if (started) return;
    if (m.role === null || m.role === '') c.role = null;
    else if (ROLES.includes(m.role) && ![...clients.values()].some(o => o !== c && o.role === m.role)) c.role = m.role;
    return broadcastLobby();
  }
  if (m.t === 'start') {
    const blind = [...clients.values()].filter(o => o.role && o.role !== 'king').length;
    if (c.role === 'king' && blind >= 1 && !started) {
      started = true;
      const players = [...clients.values()].filter(o => o.role).map(o => ({ id: o.id, role: o.role, name: o.name }));
      for (const o of clients.values()) send(o, { t: 'start', players });
    }
    return;
  }
  if (!started) return;
  const k = king();
  if (!k) return;
  if (c === k) { for (const o of clients.values()) if (o !== c) send(o, m); }   // host -> everyone else
  else send(k, Object.assign({}, m, { from: c.id, role: c.role }));              // anyone else -> host only
}

function drop(c) {
  if (!clients.has(c.id)) return;
  clients.delete(c.id);
  if (started && c.role === 'king') {
    started = false;
    for (const o of clients.values()) { o.role = null; send(o, { t: 'hostleft' }); }
  }
  if (clients.size === 0) started = false;
  broadcastLobby();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); return res.end('index.html missing next to server.js'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  } else if (url.pathname === '/join') {
    const id = 'p' + nextId++;
    const name = (url.searchParams.get('name') || 'Player').slice(0, 14);
    clients.set(id, { id, name, role: null, res: null });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id }));
  } else if (url.pathname === '/events') {
    const c = clients.get(url.searchParams.get('id'));
    if (!c) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    c.res = res;
    const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch (e) {} }, 15000);
    req.on('close', () => { clearInterval(ka); drop(c); });
    broadcastLobby();
  } else if (url.pathname === '/msg' && req.method === 'POST') {
    const c = clients.get(url.searchParams.get('id'));
    let body = '';
    req.on('data', d => { body += d; if (body.length > 200000) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204); res.end();
      if (!c) return;
      let m; try { m = JSON.parse(body); } catch (e) { return; }
      handle(c, m);
    });
  } else { res.writeHead(404); res.end('not found'); }
});
server.listen(PORT, '0.0.0.0', () => {
  console.log('\nRING RING RUN lobby is up.');
  console.log('  On this computer:   http://localhost:' + PORT);
  for (const a of addrs()) console.log('  Your friend (same wifi): ' + a);
  console.log('');
});
