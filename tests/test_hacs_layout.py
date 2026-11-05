"""HACS-Layout: nur dist/raumwerk.js wird als Ressource geladen, der Editor wird daneben nachgeladen."""
import json, os
from playwright.sync_api import sync_playwright
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
hacs = json.load(open("hacs.json", encoding="utf-8"))
assert hacs["filename"] == "raumwerk.js", hacs
assert os.path.exists("dist/" + hacs["filename"]) and os.path.exists("dist/raumwerk-editor.js")
errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    def serve(route):
        name = route.request.url.split("/local/raumwerk/")[1].split("?")[0]
        route.fulfill(status=200, content_type="text/javascript", body=open("dist/" + name, encoding="utf-8").read())
    pg.route("http://ha.test/local/raumwerk/**", serve)
    pg.route("http://ha.test/", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><body>"))
    pg.goto("http://ha.test/")
    pg.add_script_tag(url="http://ha.test/local/raumwerk/raumwerk.js?v=0.21.0", type="module")
    pg.wait_for_function("!!customElements.get('raumwerk-card')")
    before = pg.evaluate("!!customElements.get('raumwerk-editor')")
    tag = pg.evaluate("customElements.get('raumwerk-card').getConfigElement().then(e => e.localName)")
    after = pg.evaluate("!!customElements.get('raumwerk-editor')")
    print("Editor vorher geladen:", before, "| nachgeladen:", after, "| Element:", tag)
    assert not before and after and tag == "raumwerk-editor"
    b.close()
print("errors:", errs)
assert not errs
