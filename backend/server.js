const express  = require('express');
const cors     = require('cors');
const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── DB (JSON file) ───────────────────────────────────────────────────
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db      = low(adapter);
db.defaults({ iscrizioni: [] }).write();

// ── MIDDLEWARE ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// GET /health
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// POST /submit
app.post('/submit', (req, res) => {
  const { nome, cognome, email, telefono, nascita } = req.body;

  if (!nome || !cognome || !email || !telefono || !nascita)
    return res.status(400).json({ ok: false, error: 'Campi mancanti' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ ok: false, error: 'Email non valida' });

  const existing = db.get('iscrizioni').find({ email }).value();
  if (existing)
    return res.status(409).json({ ok: false, error: 'Email già registrata' });

  const nuova = {
    id: Date.now(), nome, cognome, email, telefono, nascita,
    createdAt: new Date().toLocaleString('it-IT')
  };

  db.get('iscrizioni').push(nuova).write();
  console.log(`[+] Iscrizione: ${nome} ${cognome} <${email}>`);
  res.json({ ok: true, id: nuova.id });
});

// GET /admin  (protetta da x-admin-key header)
app.get('/admin', (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ ok: false, error: 'Non autorizzato' });
  const rows = db.get('iscrizioni').sortBy('id').reverse().value();
  res.json({ ok: true, totale: rows.length, iscrizioni: rows });
});

app.listen(PORT, () => console.log(`✅ Backend attivo su porta ${PORT}`));
