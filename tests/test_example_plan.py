"""Neutraler Beispielplan (examples/example-plan.json): rendert in 2D, Schräg und 3D ohne Fehler."""
import json, os
from playwright.sync_api import sync_playwright
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
plan = json.load(open("examples/example-plan.json", encoding="utf-8")); card = open("dist/raumwerk.js", encoding="utf-8").read()
THREE = open("vendor/three/three.module.min.js", encoding="utf-8").read()
st = lambda e, s, **a: {"entity_id": e, "state": s, "attributes": {"friendly_name": e.split(".")[1], **a}}
states = {i["entity"]: st(i["entity"], "off") for i in plan["items"]}
states["light.beispiel_wohnzimmer"] = st("light.beispiel_wohnzimmer", "on", brightness=220)
errs = []
def page(b, view):
    pg = b.new_page(viewport={"width": 1200, "height": 800})
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.route("https://cdn.jsdelivr.net/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=THREE, headers={"Access-Control-Allow-Origin": "*"}))
    cfg = json.dumps({"type": "custom:raumwerk-card", "plan": plan, "view": view})
    pg.set_content(f"""<!doctype html><body style="margin:0;background:#121110"><div id="h"></div><script type="module">{card}</script><script type="module">const c=document.createElement('raumwerk-card');c.setConfig({cfg});
c.hass={{states:{json.dumps(states)},entities:{{}},devices:{{}},areas:{{}},themes:{{darkMode:true}},language:'de',callService:async()=>{{}},callWS:async()=>({{}}),hassUrl:p=>p,formatEntityState:s=>s.state}};window.__el=c;document.getElementById('h').appendChild(c);</script>""")
    pg.wait_for_timeout(4500 if view == "3d" else 1500)
    return pg
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for v in ("2d", "tilt", "3d"):
        pg = page(b, v)
        info = pg.evaluate("()=>{const R=__el.shadowRoot;return [R.querySelectorAll('svg path,svg line,svg rect').length, R.querySelectorAll('canvas').length]}")
        print(v, "Formen/Canvas:", info)
        assert info[1] >= 1 if v == "3d" else info[0] > 20
        pg.screenshot(path=f"shots/example_{v}.png"); pg.close()
    b.close()
print("errors:", errs)
assert not errs
