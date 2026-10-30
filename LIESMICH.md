# MyBox 0.2.0

MySmartBox, MyGesundBox und MyBelegBox in einer App: ein Zugang, eine Datensicherung, ein gemeinsames Dashboard, eine Suche, ein Kalender und Erinnerungen für alles. Alle Daten bleiben verschlüsselt auf dem Handy (AES-256). Es gibt keinen Server.

## Aufbau

- **MyBox** (Hauptseite) übernimmt Zugang, Fingerabdruck, Auto-Sperre, Dashboard, Suche, Datensicherung, Erinnerungen, Kalender-Export, Darstellung und App-Update.
- **Bereiche** `smart/`, `gesund/` und `beleg/` sind die drei bisherigen Apps, unverändert in ihrer Bedienung. Sie werden mit dem MyBox-Passwort entsperrt. Was MyBox gemeinsam erledigt, blenden sie aus.
- Der Knopf mit dem Würfel oben in jedem Bereich führt zurück zur MyBox-Übersicht.
- Es wird nichts mehr zwischen Apps geteilt. Verknüpfte Einträge liegen zusammen in MyBox und zeigen sich gegenseitig an (siehe unten).

## Verknüpfte Einträge (neu in 0.2.0)

- **Haus ↔ Belege:** Im Gerät im Bereich Haus steht „Beleg & Garantie“ mit Kaufdatum, Preis, Garantie und ob ein Beleg vorliegt. Ein Tipp öffnet den Beleg. Gibt es noch keinen: „Kaufbeleg anlegen“ legt ihn direkt im Bereich Belege an oder verknüpft ein vorhandenes Gerät.
- **Belege → Haus / Gesundheit:** Im Beleg steht, zu welchem Gerät (Raum, App) bzw. zu welcher Brille oder welchen Linsen er gehört. Ein Tipp öffnet den Eintrag dort.
- **Gesundheit ↔ Belege:** Bei Brillen „Als Beleg anlegen“ bzw. „Beleg öffnen“, bei Kontaktlinsen-Abos „Abo als Vertrag anlegen“ bzw. „Abo-Vertrag öffnen“.
- Gespeichert wird nur die Verknüpfung, keine Kopie der Daten. Wird ein verknüpftes Gerät gelöscht, zeigt der Beleg das an und bietet „Lösen“ an.
- Bisherige Verknüpfungen aus den Einzel-Apps bleiben beim Umzug erhalten.

## Einrichten (einmalig)

1. Auf GitHub eine neue Organisation **jazm-box** anlegen (kostenlos).
2. Darin ein **öffentliches** Repo **jazm-box.github.io** anlegen.
3. Den Inhalt der Zip **beim ersten Mal von Hand** hochladen: „Add file → Upload files“. Dabei muss der Ordner `.github` mit hoch, sonst gibt es keine automatischen Updates. Am einfachsten die Zip am Computer entpacken und alle Dateien und Ordner ins Upload-Feld ziehen.
4. Unter Settings → Pages: „Deploy from a branch“, Branch `main`, Ordner `/ (root)`.
5. Nach 1–2 Minuten läuft MyBox unter https://jazm-box.github.io/. In Chrome öffnen und über das Menü „Zum Startbildschirm hinzufügen“ installieren.

Spätere Updates: In MyBox unter Daten & Sicherheit → App-Update die neue Zip hochladen (eigener Zugangsschlüssel für das App-Repo mit Contents: Read and write und Actions: Read).

## Umzug aus den Einzel-Apps

1. MyBox öffnen und ein Passwort festlegen (mind. 10 Zeichen). Es gilt für alle Bereiche.
2. In der alten App: Daten & Sicherheit → Datensicherung → **Sicherung erstellen**.
3. In MyBox: Daten & Sicherheit → **Umzug aus den Einzel-Apps** → beim passenden Bereich „Sicherungsdatei laden“. Alternativ „Aus GitHub“, um direkt die bisherige GitHub-Sicherung der alten App zu laden.
4. MyBox fragt einmal nach dem **bisherigen Passwort** der alten App. Danach sind die Daten mit dem MyBox-Passwort verschlüsselt.
5. Für die anderen beiden Apps wiederholen.

Die alten Apps bleiben unverändert und laufen parallel weiter. Was du danach in MyBox änderst, steht nicht in den alten Apps und umgekehrt.

## Datensicherung

- **GitHub:** ein privates Repo (Vorschlag: `jazm-box/mybox-daten`) und ein Fine-grained-Zugangsschlüssel nur für dieses Repo mit **Contents: Read and write**. Jeder Bereich sichert in seinen eigenen Ordner `smartbox/`, `gesundbox/`, `belegbox/`. Die bisherigen Repos der Einzel-Apps werden von MyBox nicht beschrieben.
- **Sicherungsdatei:** eine `.mybox`-Datei mit allen drei Bereichen und allen Dokumenten, verschlüsselt mit dem Passwort, das beim Sichern galt.
- **Neues Handy:** MyBox mit demselben Passwort anlegen, GitHub einrichten und „Alles von GitHub laden“ – oder die Sicherungsdatei laden.

## Noch nicht in MyBox (vorerst weiter in den Einzel-Apps)

- „Teilen → MyGesundBox/MyBelegBox“ aus fremden Apps (z. B. ein PDF aus der Mail) und die Verknüpfungen am App-Symbol.
- Der Import alter Sicherungen aus „JAZM Meine Geräte“ (vor MySmartBox).
