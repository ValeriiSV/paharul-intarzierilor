# Paharul întârzierilor

PWA mobile-first pentru evidența întârzierilor într-o echipă. Prima versiune funcționează complet în browser și păstrează datele în `localStorage`, fără backend.

## Funcții

- pahare animate pentru fiecare coleg; 1 minut = 2% din pahar;
- formular pentru adăugare și corectare întârzieri;
- motiv opțional, dată, minute rapide;
- clasament lunar și istoric pe luni;
- zonă admin pentru editare și ștergere;
- date demo persistente local, temă luminoasă/închisă;
- manifest și service worker pentru instalare și funcționare offline.

## Rulare locală

Din folderul proiectului:

```bash
python3 -m http.server 4173 --directory dist
```

Apoi deschide `http://localhost:4173`. Nu deschide direct fișierul HTML, deoarece service worker-ul PWA are nevoie de un server local.

## Publicare pe GitHub Pages

1. Creează un repository și încarcă acest proiect.
2. În Settings → Pages alege GitHub Actions sau publică conținutul folderului `dist`.
3. Pentru GitHub Actions, copiază `dist` într-un artifact Pages și publică-l cu acțiunea oficială `actions/deploy-pages`.

## Publicare pe Cloudflare Pages

1. În Cloudflare Dashboard deschide Workers & Pages → Create → Pages → Connect to Git.
2. Selectează repository-ul GitHub.
3. Framework preset: `None`; Build command: gol; Build output directory: `dist`.
4. Publică proiectul. PWA-ul va funcționa pe domeniul HTTPS oferit de Cloudflare.

## Pasul următor: backend real

Structura poate fi mutată fără schimbarea interfeței pe Cloudflare D1 sau Supabase. Tabelul principal are nevoie de câmpurile `id`, `person_id`, `minutes`, `reason`, `date`, `created_at`; autentificarea admin poate fi adăugată cu Cloudflare Access sau Supabase Auth.
