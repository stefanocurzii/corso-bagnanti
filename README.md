# Corso Assistenti Bagnanti

## Struttura
```
/              → Landing page (GitHub Pages)
/backend       → API Node.js (deploy su Railway)
```

## Backend

### Endpoints
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | /health | Stato del server |
| POST | /submit | Salva una nuova iscrizione |
| GET | /admin | Lista tutte le iscrizioni (richiede header `x-admin-key`) |

### Deploy su Railway
1. Vai su [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo → seleziona `corso-bagnanti`
3. Imposta **Root Directory** = `backend`
4. Aggiungi variabile d'ambiente: `ADMIN_KEY=<tua-chiave-segreta>`
5. Railway ti darà un URL tipo `https://corso-bagnanti-production.up.railway.app`

### Variabili d'ambiente
| Variabile | Descrizione |
|-----------|-------------|
| `PORT` | Porta (Railway la imposta automaticamente) |
| `ADMIN_KEY` | Chiave per accedere a `/admin` |

## Frontend
La landing page è in `index.html`. Aggiorna la variabile `BACKEND_URL` in fondo al file con l'URL del tuo backend Railway.
