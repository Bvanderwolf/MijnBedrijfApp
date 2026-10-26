# Mijn Bedrijf

Een mobile-first PWA waarin beginnende ondernemers spelenderwijs dubbele boekhouding leren. Gebruikers richten een virtuele zaak in, lossen dagelijks een boekhoudscenario op en zien de financiële en visuele gevolgen.

## Functionaliteit

- Onboarding met drie sectoren en twee aanbodkeuzes per sector.
- Zestien gevalideerde, deterministische scenariotemplates in vier leerniveaus.
- Begeleide invoer van debet-, credit- en btw-boekingen.
- Dashboard met pixelzaak, bank, resultaat, reputatie en groeidagen.
- Aparte oefenzandbak zonder invloed op de echte bedrijfsadministratie.
- Balans, winst-en-verliesrekening en journaaloverzicht.
- Lokale IndexedDB-opslag met export, import en volledige reset.
- Installeerbare en na het eerste bezoek offline bruikbare PWA.

> De app is een educatieve simulatie en geen boekhoudkundig of fiscaal advies.

## Ontwikkelen

Vereist Node.js 24.x. Met `nvm use` activeer je de versie uit `.nvmrc`.

```bash
npm install
npm run dev
```

De ontwikkelserver opent standaard op `http://localhost:5173`.

## Controleren en bouwen

```bash
npm run typecheck
npm test
npm run build
```

De statische productieversie komt in `build/client`. `vercel.json` bevat de SPA-rewrite en buildinstellingen voor Vercel.

## Inhoud bijwerken

Scenario's staan in `app/domain/scenarios.ts`. Elke template bevat niveau, concept, variabele bedragen, sectorscope, correcte journaalregels, hints en uitleg. De buildvalidatie controleert onder meer unieke id's en gelijke debet- en credittotalen.

Laat Nederlandse fiscale scenario's vóór publiek gebruik controleren door een boekhouder en actualiseer btw-regels wanneer de Belastingdienst die wijzigt.
