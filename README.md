# Trafiku Prishtina

Platformë mobile-first për raportime të drejtpërdrejta të trafikut në Prishtinë, e ndërtuar për `trafiku.prishtina.online` dhe e lidhur vizualisht me [Prishtina.online](https://prishtina.online).

## Çfarë përfshin

- hartë interaktive me raportime aktive
- kolona, aksidente, rrugë të mbyllura dhe rreziqe
- raportim me vendndodhje të pajisjes ose me pikë të zgjedhur në hartë
- filtër sipas llojit të ngjarjes
- konfirmim nga komuniteti dhe shpërndarje e raportimit
- rifreskim automatik i raportimeve
- ruajtje të qëndrueshme në Cloudflare D1
- navigim dhe formular të optimizuar për telefon

## Zhvillimi lokal

Kërkon Node.js 22.13 ose më të ri.

```bash
npm install
npm run dev
```

Kontrollet kryesore:

```bash
npx tsc --noEmit
npm test
```

## Arkitektura

- Next.js / React me vinext
- React Leaflet dhe OpenStreetMap
- Cloudflare D1 për raportimet
- Cloudflare Workers / Sites për publikim
- Drizzle për skemën dhe migrimet

Konfigurimi logjik i D1 ruhet në `.openai/hosting.json`; migrimet e bazës së të dhënave ruhen në `drizzle/`.

Planifikimi i rrugës përdor kërkim vetëm pas dorëzimit përmes Photon dhe
rrugë automobilistike nga OSRM. Të dy shërbimet mund të zëvendësohen përmes
`PHOTON_ORIGIN` dhe `OSRM_ORIGIN` pa ndryshuar aplikacionin.
