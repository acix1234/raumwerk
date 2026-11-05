# Raumwerk

Grundriss-Karte für Home Assistant (Lovelace): dein Zuhause als 2D-Plan, Schrägansicht oder 3D-Modell – mit Licht, Türen und Fenstern, Sensoren, Geräten, Klima-Heatmap und einem visuellen Editor direkt im Dashboard.

Kartentyp: `custom:raumwerk-card`

## Funktionen
- **Drei Ansichten:** 2D, Schräg und 3D (three.js), weicher Wechsel dazwischen. Mehrere Etagen, Außenbereich, Dach.
- **Smart-Home-Elemente:** Lampen (Helligkeit/Farbe über eine Steuerblase), Schalter, Türen und Fenster mit Kontaktsensor, Rollläden, Ventilatoren, Sensor-Werte, Saugroboter, laufende Geräte, Warnmelder, Personen, mmWave-Ziele.
- **Darstellung:** Bodenbeläge und Wandfarben je Raum, Möbelkatalog, Sonne/Schatten nach `sun.sun`, Leuchtschein, Klima-Heatmap (Temperatur, Luftfeuchte, CO₂), Farbthemen (`skin`: standard, real, blueprint, neon, paper, mono, pixel).
- **Licht & Sonne:** echtes Sonnenlicht fällt durch die Fenster auf den Boden (Sonnenstand, Nordausrichtung, Rollläden, Wolken); **Sonnenstudie** für jeden Tag des Jahres mit Sonnenstunden je Raum und Pflanze; **Licht-Pinsel**: mit dem Finger über die Lampen streichen und sie einfärben, auch als Farbverlauf.
- **Bedienung:** sicheres Schalten mit Rückgängig, Gruppierung nah beieinanderliegender Symbole, Handy-Layout, Kiosk-/Wandpanel-Modus.
- **Visueller Editor:** Wände, Türen, Fenster, Räume, Lampen, Sensoren und Möbel zeichnen; Raster/Einrasten, Rückgängig, Zwischenablage, Hintergrundbild zum Nachzeichnen, mehrere Etagen.

## Installation über HACS (Custom Repository)
1. HACS → ⋮ → *Benutzerdefinierte Repositories* → `https://github.com/acix1234/raumwerk` eintragen, Kategorie **Dashboard**.
2. „Raumwerk“ installieren und Home Assistant im Browser neu laden (Cache leeren).
3. Dashboard bearbeiten → Karte hinzufügen → **Raumwerk** wählen. Den Plan zeichnest du im Editor.

HACS legt nur die Karte (`raumwerk.js`) als Ressource an. Den Editor (`raumwerk-editor.js`) lädt die Karte bei Bedarf aus demselben Ordner nach.

### three.js
Für die 3D-Ansicht lädt die Karte three.js standardmäßig von jsDelivr (`cdn.jsdelivr.net`). Wer das nicht möchte, legt `three.module.min.js` (three.js r170) lokal ab und setzt `three_url: /local/three/three.module.min.js`.

## Konfiguration (Auszug)
```yaml
type: custom:raumwerk-card
view: tilt          # 2d | tilt | 3d
plan:
  walls: [[0, 0, 900, 0], [900, 0, 900, 600], [900, 600, 0, 600], [0, 600, 0, 0]]
  areas: [{id: wohnen, name: Wohnzimmer, points: [[0, 0], [900, 0], [900, 600], [0, 600]]}]
  items: [{entity: light.wohnzimmer, name: Decke, x: 450, y: 300, r: 220}]
```
Alle Maße in Zentimetern. Ein vollständiges Beispiel mit zwei Zimmern, Bad, Türen, Fenstern, Lampen und Möbeln liegt in [`examples/example-card.yaml`](examples/example-card.yaml). Am einfachsten startest du mit dem Editor und schaust dir danach den YAML-Code der Karte an.

Weitere Optionen (Auswahl): `quality`, `effects`, `skin`, `north` (Ausrichtung nach Norden für die Sonne), `outdoor`, `persons`, `tap_action: toggle`, `sunlight`, `sun_study`, `brush`, `kiosk`, `plan_source` (Plan aus einem anderen Dashboard übernehmen), `three_url`.

## Entwicklung
Quellcode: `dist/raumwerk.js` (Karte) und `dist/raumwerk-editor.js` (Editor), keine Build-Schritte. Tests mit Playwright (Python):

```bash
python -m pip install playwright
python -m playwright install chromium
python tests/test_example_plan.py
python tests/test_hacs_layout.py
```

Unter Windows vorher `PYTHONUTF8=1` setzen.

## Lizenz
MIT, siehe [LICENSE](LICENSE). `vendor/three/` enthält three.js (MIT, © three.js authors) und dient nur den Tests.
