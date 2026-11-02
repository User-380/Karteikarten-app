# Karteikarten

Karteikarten-App nach dem Prinzip von Anki (Spaced Repetition) – für Laptop
und Handy, funktioniert offline, kein Server, kein Login.

- **FSRS**-Algorithmus plant, wann welche Karte wieder dran ist
- Formeln in **LaTeX** (KaTeX): `$\int_0^1 x^2\,dx$`
- **Bilder** in Karten (Skizzen, Freikörperbilder, Handyfotos)
- **Dark Mode**, große Bewertungsknöpfe, mobil zuerst
- **Statistik**: gelernte Karten pro Tag, Lernserie
- **Backup** als JSON, **Import** aus CSV (`Vorderseite;Rückseite`)

---

## 1. App auf dem Laptop starten

Einmalig: [Node.js](https://nodejs.org) (Version 20 oder neuer, „LTS“) installieren.

Dann im Terminal im Projektordner:

```bash
npm install      # lädt alle Bibliotheken (nur beim ersten Mal)
npm run dev      # startet die App
```

Im Terminal steht dann eine Adresse wie `http://localhost:5173/` – im Browser
öffnen, fertig.

Weitere Befehle:

| Befehl            | Was passiert                                             |
| ----------------- | -------------------------------------------------------- |
| `npm test`        | führt die Tests aus (u. a. für den FSRS-Algorithmus)     |
| `npm run build`   | baut die fertige App in den Ordner `dist/`              |
| `npm run preview` | startet die gebaute App (mit Offline-Funktion) lokal     |

## 2. Auf dem Handy installieren

Damit sich die App auf dem Homescreen installieren lässt und offline läuft,
muss sie über **HTTPS** erreichbar sein. Am einfachsten über **GitHub Pages**
(kostenlos, die Einrichtung ist schon vorbereitet):

1. Auf GitHub im Repository: **Settings → Pages → Source: „GitHub Actions“** wählen.
2. Den Code in den Branch `main` bringen (z. B. Pull Request mergen).
   GitHub baut die App dann automatisch (siehe Reiter **Actions**).
3. Danach ist die App unter `https://<dein-name>.github.io/Karteikarten-app/`
   erreichbar.

> Hinweis: GitHub Pages ist für **private** Repositories nur mit einem
> bezahlten Konto verfügbar. Alternative ohne Kosten: Ordner `dist/`
> (nach `npm run build`) per Drag & Drop auf <https://app.netlify.com/drop>
> ziehen.

**Installieren:**

- **iPhone (Safari):** Seite öffnen → Teilen-Knopf → **„Zum Home-Bildschirm“**
- **Android (Chrome):** Seite öffnen → Menü ⋮ → **„App installieren“** bzw.
  „Zum Startbildschirm hinzufügen“

Danach startet die App wie eine normale App und funktioniert auch ohne Internet.
Updates werden automatisch geladen, sobald du wieder online bist.

## 3. Backup machen (wichtig!)

Deine Karten liegen **nur auf dem jeweiligen Gerät** im Browser-Speicher.
Wenn du die Browserdaten löschst oder das Handy verlierst, sind sie weg.
Laptop und Handy haben außerdem jeweils **eigene** Daten.

**Backup erstellen:** ⚙︎ (Einstellungen) → **„Backup herunterladen (JSON)“**.
Die Datei enthält alle Stapel, Karten, Bilder und deinen Lernverlauf.
Speichere sie z. B. in deiner Cloud (OneDrive, Google Drive, iCloud).
Die App erinnert dich auf der Startseite, wenn dein letztes Backup älter als
zwei Wochen ist.

**Wiederherstellen / auf anderes Gerät übertragen:** ⚙︎ → **„Backup einspielen …“**
→ Datei wählen.

- Ohne Haken: Daten werden **zusammengeführt** (gleiche Karten werden aktualisiert).
- Mit Haken „vorhandene Daten vorher löschen“: exakte Wiederherstellung.

## 4. Karten anlegen

- **Formeln:** `$…$` im Text, `$$…$$` als eigene Zeile. Ein echtes
  Dollarzeichen schreibst du als `\$`.
- **Bilder:** Knopf „🖼 Bild“ (auf dem Handy auch direkt mit der Kamera) oder
  Bild kopieren und mit Strg+V einfügen. Große Fotos werden automatisch
  verkleinert.
- **CSV-Import:** ⚙︎ → CSV-Import. Eine Karte pro Zeile, `Vorderseite;Rückseite`.
  Text mit `;` oder Zeilenumbrüchen in `"Anführungszeichen"`. Beispiel:
  [`examples-statik.csv`](examples-statik.csv). Aus Excel: „Speichern unter →
  CSV (Trennzeichen-getrennt)“ – das deutsche Excel nutzt automatisch `;`.

## 5. Lernen

Startseite → **Lernen**. Frage lesen, im Kopf antworten, **Antwort zeigen**, ehrlich bewerten:

| Knopf       | Bedeutung                              |
| ----------- | -------------------------------------- |
| **Nochmal** | nicht gewusst – kommt gleich nochmal    |
| **Schwer**  | gewusst, aber mühsam                   |
| **Gut**     | gewusst (der Normalfall)               |
| **Leicht**  | sofort gewusst, viel zu einfach        |

Unter jedem Knopf steht, wann die Karte dann wieder kommt. Vertippt?
**↶ Rückgängig**. Am Laptop: Leertaste = aufdecken, 1–4 = bewerten.

Zahlen auf der Startseite: **blau** = neu, **rot** = in der
Lernphase, **grün** = Wiederholung fällig. Pro Stapel kommen täglich
höchstens 10 neue Karten dazu (einstellbar unter ⚙︎).

---

## Für Neugierige: Aufbau des Codes

```
src/
  main.tsx              Einstieg, lädt Styles und startet React
  App.tsx               Navigation (Kopfzeile) und Seitenauswahl
  styles.css            gesamtes Design inkl. Dark Mode
  lib/
    types.ts            Datenmodell (Deck, Card, ReviewLogEntry, …)
    db.ts               Datenbank (IndexedDB via Dexie) + alle Speicherfunktionen
    scheduler.ts        FSRS-Algorithmus (Hülle um die Bibliothek ts-fsrs)
    queue.ts            Welche Karten sind heute dran, in welcher Reihenfolge?
    content.ts          zerlegt Kartentext in Text / Formeln / Bilder
    csv.ts, backup.ts   Import/Export
    stats.ts            Statistik (Lernserie usw.)
    __tests__/          automatische Tests (npm test)
  components/           wiederverwendbare Bausteine (Kartenanzeige, Editor)
  pages/                die einzelnen Seiten (Start, Stapel, Lernen, …)
```

**Datenmodell (IndexedDB):**

| Tabelle    | Inhalt                                                               |
| ---------- | -------------------------------------------------------------------- |
| `decks`    | Stapel: id, name                                                     |
| `cards`    | Karte: id, deckId, front, back + FSRS-Werte (due, stability, difficulty, state, reps, lapses, …) |
| `reviews`  | Lernprotokoll: welche Karte, wann, welche Bewertung                  |
| `media`    | Bilder als Blob; im Kartentext referenziert als `![](media:ID)`      |
| `settings` | Einstellungen (z. B. neue Karten pro Tag)                            |
