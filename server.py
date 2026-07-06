#!/usr/bin/env python3
"""Tiny zero-dependency server for the solar-system landing page.

Serves the static site plus three JSON endpoints:
  POST /api/login   {password}  -> {token}   (rate-limited, constant-time compare)
  PUT  /api/site    (Bearer)    -> persists data/site.json
  POST /api/upload  (Bearer)    -> saves a data-URL image, returns its URL
  GET  /api/session (Bearer)    -> 200 if the token is still valid

Run:  EDIT_PASSWORD=yourpassword python3 server.py
Editing stays disabled (503 on login) when EDIT_PASSWORD is unset.
"""
import base64, hmac, json, os, re, secrets, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "data", "site.json")
UPLOADS = os.path.join(ROOT, "data", "uploads")
PASSWORD = os.environ.get("EDIT_PASSWORD", "")
PORT = int(os.environ.get("PORT", "8000"))
TOKEN_TTL = 12 * 3600
MAX_BODY = 4 * 1024 * 1024

tokens = {}  # token -> expiry epoch
fails = {}   # ip -> [failed-login timestamps]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not 0 < n <= MAX_BODY:
            raise ValueError("bad length")
        return json.loads(self.rfile.read(n))

    def authed(self):
        tok = (self.headers.get("Authorization") or "").removeprefix("Bearer ").strip()
        return tokens.get(tok, 0) > time.time()

    def end_headers(self):
        if self.path.split("?", 1)[0] == "/data/site.json":
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/session":
            return self.reply(200 if self.authed() else 401, {"ok": self.authed()})
        clean = self.path.split("?", 1)[0]
        if clean == "/server.py" or any(seg.startswith(".") for seg in clean.split("/")):
            return self.reply(404, {"error": "not found"})
        super().do_GET()

    def do_POST(self):
        try:
            if self.path == "/api/login":
                return self.login()
            if self.path == "/api/upload":
                return self.upload()
            self.reply(404, {"error": "not found"})
        except Exception:
            self.reply(400, {"error": "bad request"})

    def do_PUT(self):
        if self.path != "/api/site":
            return self.reply(404, {"error": "not found"})
        if not self.authed():
            return self.reply(401, {"error": "unauthorized"})
        try:
            data = self.body()
            assert isinstance(data["owner"], dict)
            assert isinstance(data["links"], dict)
            assert isinstance(data["planets"], list)
        except Exception:
            return self.reply(400, {"error": "invalid site data"})
        tmp = SITE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, SITE)
        self.reply(200, {"ok": True})

    def login(self):
        if not PASSWORD:
            return self.reply(503, {"error": "editing disabled — start the server with EDIT_PASSWORD set"})
        ip, now = self.client_address[0], time.time()
        fails[ip] = [t for t in fails.get(ip, []) if now - t < 300]
        if len(fails[ip]) >= 5:
            return self.reply(429, {"error": "too many attempts, try again in a few minutes"})
        pw = str(self.body().get("password", ""))
        if not hmac.compare_digest(pw.encode(), PASSWORD.encode()):
            fails[ip].append(now)
            return self.reply(403, {"error": "wrong password"})
        for t in [t for t, exp in tokens.items() if exp < now]:
            del tokens[t]
        tok = secrets.token_urlsafe(32)
        tokens[tok] = now + TOKEN_TTL
        self.reply(200, {"token": tok})

    def upload(self):
        if not self.authed():
            return self.reply(401, {"error": "unauthorized"})
        m = re.match(r"data:image/(png|jpeg|webp|avif);base64,([A-Za-z0-9+/=\s]+)$",
                     str(self.body().get("dataUrl", "")))
        if not m:
            return self.reply(400, {"error": "expected a png/jpeg/webp/avif data URL"})
        raw = base64.b64decode(m.group(2))
        if len(raw) > 2_500_000:
            return self.reply(400, {"error": "image too large"})
        name = secrets.token_hex(6) + "." + m.group(1).replace("jpeg", "jpg")
        os.makedirs(UPLOADS, exist_ok=True)
        with open(os.path.join(UPLOADS, name), "wb") as f:
            f.write(raw)
        self.reply(200, {"url": "data/uploads/" + name})


if __name__ == "__main__":
    print(f"☀  http://localhost:{PORT}  (editing {'enabled' if PASSWORD else 'DISABLED — set EDIT_PASSWORD'})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
