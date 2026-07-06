# landing-planet ☀️

A tiny solar-system portfolio landing page. The sun is you, the planets are your
projects — hover to see them wobble, click to zoom in. Includes a hidden edit
mode that saves changes server-side.

No build step, no dependencies: one Python file serves one HTML file, one JS
file (Preact via esm.sh), and one JSON content file.

## Run

```sh
EDIT_PASSWORD=yourpassword python3 server.py
# → http://localhost:8000
```

Without `EDIT_PASSWORD` the page still works, but edit mode is disabled.
`PORT` (default `8000`) is also configurable via env.

### With Docker Compose

```sh
cp .env.example .env   # set EDIT_PASSWORD (and WEB_PORT if you like)
docker compose up -d --build
# → http://localhost:8000
```

Content and uploads live in `./data`, bind-mounted into the container, so
edits made through the page survive rebuilds and restarts.

## Editing

All content lives in **`data/site.json`** — owner info, links, and one entry
per planet (name, tagline, description, tags, images, orbit + colors). Edit it
by hand and refresh, or use in-page edit mode:

1. Click the little orange dot in the top-left nav **10 times**.
2. Enter the password → the server returns a session token (12h).
3. Now you can: click any text to edit it, upload images (profile photo +
   project screenshots), add/remove tags, edit links, add or delete planets.
   Every change autosaves to `data/site.json`; uploads land in `data/uploads/`.

## How auth works

`POST /api/login` compares the password in constant time and rate-limits
failures (5 per 5 min per IP). Success returns a random bearer token, held in
server memory and required by `PUT /api/site` and `POST /api/upload`. Tokens
expire after 12h or when the server restarts. Deploy behind HTTPS.

## License

MIT
