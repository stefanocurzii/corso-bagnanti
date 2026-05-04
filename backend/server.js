const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── DB (PostgreSQL) ──────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Crea tabella se non esiste
pool.query(`
  CREATE TABLE IF NOT EXISTS iscrizioni (
    id         BIGSERIAL PRIMARY KEY,
    nome       TEXT NOT NULL,
    cognome    TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    telefono   TEXT NOT NULL,
    nascita    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => console.log('✅ Tabella pronta'));

// ── MIDDLEWARE ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// GET /health
app.get('/health', async (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// POST /submit
app.post('/submit', async (req, res) => {
  const { nome, cognome, email, telefono, nascita } = req.body;

  if (!nome || !cognome || !email || !telefono || !nascita)
    return res.status(400).json({ ok: false, error: 'Campi mancanti' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ ok: false, error: 'Email non valida' });

  try {
    const result = await pool.query(
      'INSERT INTO iscrizioni (nome, cognome, email, telefono, nascita) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nome, cognome, email, telefono, nascita]
    );
    console.log(`[+] Iscrizione: ${nome} ${cognome} <${email}>`);
    res.json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ ok: false, error: 'Email già registrata' });
    console.error(e);
    res.status(500).json({ ok: false, error: 'Errore server' });
  }
});

// GET /admin
app.get('/admin', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== process.env.ADMIN_KEY)
    return res.status(401).json({ ok: false, error: 'Non autorizzato' });

  const result = await pool.query('SELECT * FROM iscrizioni ORDER BY created_at DESC');
  res.json({ ok: true, totale: result.rowCount, iscrizioni: result.rows });
});

// GET /export  →  CSV per Excel
app.get("/export", async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== process.env.ADMIN_KEY)
    return res.status(401).json({ ok: false, error: 'Non autorizzato' });

  const result = await pool.query('SELECT * FROM iscrizioni ORDER BY created_at DESC');
  const rows   = result.rows;

  const header = 'ID;Nome;Cognome;Email;Telefono;Data di nascita;Iscritto il';
  const csv = [header, ...rows.map(r =>
    [r.id, r.nome, r.cognome, r.email, r.telefono, r.nascita,
     new Date(r.created_at).toLocaleString('it-IT')]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  )].join('\r\n');

  const filename = `iscrizioni_${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
});


// DELETE /iscrizioni/:id  →  rimuove un'iscrizione per ID
app.delete('/iscrizioni/:id', async (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ ok: false, error: 'Non autorizzato' });

  const { id } = req.params;
  const result = await pool.query('DELETE FROM iscrizioni WHERE id = $1 RETURNING id', [id]);

  if (result.rowCount === 0)
    return res.status(404).json({ ok: false, error: 'Iscrizione non trovata' });

  res.json({ ok: true, eliminato: id });
});

app.listen(PORT, () => console.log(`✅ Backend attivo su porta ${PORT}`));
