# Development and handoff

The app is React and TypeScript with a Three.js scene. Vite builds a static site;
there is no backend, account system, analytics, or external runtime service.
Node.js 22.12 or newer and npm are required. `make setup` installs locked
dependencies. `make dev` runs the local development server; `make preview` builds
and serves production output. The `-lan` targets enable a local area network preview
over self-signed HTTPS (Hypertext Transfer Protocol Secure). See the README for
phone access. Stop your own servers after testing to avoid leaving work running.

## Code and data

Start with the file map in [AGENTS.md](../AGENTS.md). `main.tsx` manages consent,
collection and inspection panels, route navigation, and keyboard focus. `scene.tsx`
implements the imperative scene and exposes a small navigation/control handle.
`types.ts` describes public work data; `layout.ts` describes reservations and rooms.
Keep the importer and companion's export contract aligned when extending fields.

`public/collection/catalog.json` is curated content. `layout.json` owns positions,
room geometry, reservation IDs, and candidate/verified placement. Catalog array
order must never determine placement. `scene-assets.json` maps original images to
small content-hashed previews; regenerate it using `npm run prepare-art` after
image changes. Do not hand-edit generated preview hashes. See [curation](curation.md)
for targeted artwork replacement and export reconciliation.

All scene textures decode after spoiler acceptance and before entry. Scene textures
are capped at 768 pixels; inspection loads original PNG (Portable Network Graphics)
images. Object and wall-inscription references belong in inspection, not on wall
planes. Lighting uses fixed wall-face textures and object floor pools, preserving
illumination at every camera distance without hundreds of live lights. Heading
mounts choose solid wall spans to avoid doorways and route arrows. Labels are
transparent, unlit letters with a fine contrast outline and shadow.

The render loop is demand driven. Input, texture completion, camera movement, and
resize invalidate a frame; idle views and hidden tabs stop drawing. Keep this
behavior when adding effects. Avoid perpetual animation loops or camera-distance
loading that makes art or lighting appear in front of a visitor.

## Checks

```sh
npx playwright install chromium
make check
```

This checks preview coverage and hashes, type-checks, builds, runs Node importer
and replacement tests, and runs Playwright browser/layout tests. Browser tests
serve `dist/` on port 4187 and use desktop and phone configurations. They cover
consent, accessibility, movement, recovery, image decoding, fixed lighting budgets,
idle rendering, room reachability, frame intersections, and heading placement.
Phone tests emulate Chromium; check an actual iPhone for Safari-specific behavior.

For helper-only changes, `node --test scripts/*.test.mjs` plus `npm run build` is a
useful focused check. Runtime or data/layout changes warrant `make check`.
For visible changes, inspect desktop and phone screenshots in addition to tests;
put review artifacts under ignored `.local/`. Verify light and dark walls, corners,
long labels, panel scrolling, and the non-3D Collection fallback as relevant.

Headless Chromium cannot exercise native pointer lock. Its regression simulates
capture events and rejection. To exercise actual capture in installed Chrome with
an isolated profile, run:

```sh
EXHIBITION_NATIVE_POINTER_LOCK=1 EXHIBITION_BROWSER_CHANNEL=chrome npx playwright test --headed --project=desktop -g "M captures"
```

The test brings its page to the foreground. M captures relative movement and
M/Escape releases it; panels also release capture. Never claim native capture was
checked from the default headless test alone. Report actual checks and limitations.
The current production build reports a large Three.js chunk warning; it does not
prevent a static build. Optimize only with measured benefit and regression checks.

## Deployment preparation

No deployment is configured. A future deployment task can host `dist/` on a static
host, but should first choose a destination and review public content and rights
with the owner. Do not change repository visibility, create paid services, or
publish a site merely to test deployment scaffolding. Do not add a blanket artwork
license: the novel, generated interpretations, application code, and dependencies
have distinct attribution and rights considerations.

The current app assumes the site is served at the origin root: collection requests
use `/collection/`. Vite's `base` alone does not make subdirectory hosting work.
If a project-path host is chosen, update and test all collection/preview URL builders
as well as the asset base, or use a dedicated domain serving the root. Preserve the
spoiler gate and test a fresh visitor on the production URL. HTTPS and a user gesture
are needed for browser capture behavior; retain the drag and touch fallbacks.

Deploy only `dist/`, never the repository, private exports, `.local/`, or build/test
artifacts. The full-resolution collection is hundreds of megabytes; consider host
file-size, storage, and bandwidth limits before choosing a service. Hash-named art
and previews can be cached immutably. Revalidate HTML, catalog, layout, and preview
manifest, and publish them with their assets as one release to avoid mixed versions.
The foyer is an accidental-spoiler guard, not security: assets and source are public.

Continuous integration can run the existing build and test commands on a compatible
Node runtime with Playwright Chromium installed. No private book material or runtime
secrets are needed. Keep deployment credentials outside source and require explicit
release authorization. This document records preparation constraints; it does not
claim a host, release pipeline, or browser matrix has been validated.
