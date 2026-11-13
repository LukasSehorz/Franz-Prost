# Akademie für ein besseres Leben – Website

Statische 1:1-Kopie von akademie-besseres-leben.eu (ursprünglich WordPress/Themify) mit der neuen Landingpage **Heilfasten 2027**.

## Vorschau starten

```bash
node vorschau-server.js
```

Danach im Browser **http://localhost:8080** öffnen. Unter macOS geht das auch per Doppelklick auf `Vorschau starten.command`. Voraussetzung ist Node.js, weitere Abhängigkeiten gibt es nicht.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `website/` | komplette Website (HTML, CSS, JS, Schriften, Bilder, Videos, PDFs) |
| `website/heilfasten-2027/` | Landingpage Heilfasten 2027 (`index.html`, `heilfasten-2027.css`, `heilfasten-2027.js`) |
| `website/heilfasten-2027/header-menu.css` | hält das Hauptmenü mit dem neuen Menüpunkt am Desktop einzeilig (auf allen Seiten eingebunden) |
| `website/wp-content/uploads/heilfasten-2027/` | Bilder der Landingpage |
| `vorschau-server.js` | lokaler Server ohne Abhängigkeiten (mit Range-Support für Videos) |

Die Seite verwendet root-relative Pfade (`/wp-content/...`) und muss deshalb im Root einer Domain bzw. eines Servers liegen.

## Vor dem Livegang der Landingpage

- **VSL-Video:** In `website/heilfasten-2027/index.html` beim Element `.hf27-video` das Attribut `data-video-src` setzen (MP4-Pfad oder YouTube-/Vimeo-Link).
- **Kauf über Digistore24:** Alle Knöpfe „Jetzt anmelden“ / „Jetzt Platz sichern“ führen zum Digistore-Produkt 763425. Links und Frühbucher-Ende (08.01.2027) stehen oben in `website/heilfasten-2027/heilfasten-2027.js` (`BUY_URL`, `BUY_URL_EARLY`, `EARLY_END`). Ein Anmeldeformular gibt es auf der Seite nicht mehr.
- **Kontaktformular (Seite Kontakt):** Lief über WordPress und braucht auf dem statischen Hosting ebenfalls einen Versanddienst.
- **Meta-Pixel:** Bei Bedarf einbinden und an den Cookie-Banner (Complianz) koppeln.

## Partner-Zuordnung (Digistore24-Promocode)

Partner bewerben die Seite mit `…/heilfasten-2027/?aff=IHRE-DIGISTORE-ID` (optional `&cam=KAMPAGNE`).
Das Digistore-Skript wird in `website/heilfasten-2027/heilfasten-2027.js` geladen (Abschnitt „Partner-Zuordnung“)
und hängt den Partner beim Klick an alle Kauf-Knöpfe (`data-hf27-buy`) an. Es muss nach dem Setzen der
Kauf-Links laufen. Bei einem Umzug auf eine andere Domain: die Domain in Digistore unter
Einstellungen > Affiliate Tracking > Promocode-Domains eintragen.
