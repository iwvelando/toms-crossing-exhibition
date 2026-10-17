# Exhibition development

This is a public-facing fan exhibition with a curated collection. Read
[README.md](README.md) first, then [development](docs/development.md) for code work
or [curation](docs/curation.md) for collection changes. Do not assume another
agent's conversation is available.

## Public and private boundaries

Keep private questions, agent answers, raw prompts, transcripts, listening
timestamps, original export archives, and local source paths out of this
repository. Use ignored `.local/` for handoffs, provenance, and visual review.
Do not research the novel online. New factual captions must come through the
companion's local evidence and export workflow. The creator is still reading;
a finished-book audience never authorizes reading ahead or inventing later content.

Preserve the explicit spoiler-warning foyer. Do not load collection images before
acceptance. Assume visitors have finished the book; do not add listening controls.
Keep in-book attribution, author attribution, and digital realization separate.
Personal notes are selected reflections, not a conversation archive. Do not invent
first-person statements for the curator. Public asset URLs are not access controlled.

## Small corrections and regenerated art

The current generated images have known imperfections; replacement is expected.
Follow [the spot-edit procedure](docs/curation.md#replace-one-image) for a user-supplied
PNG. Use `scripts/replace-artwork.mjs` to sanitize embedded metadata and refresh
one existing image, numbered panel, or object reference. Preview first, apply,
regenerate compact previews, and inspect the result. A visual replacement alone
does not require re-curating the whole collection or re-transcribing the book.

Preserve stable work and reservation IDs, positions, room attribution, panel order,
and sequence/variant presentation unless the user requests a change. An object
reference replacement must retain its 3D object. Preserve aspect ratios; check
framing and alt text against the actual replacement. Do not silently fix unrelated
artworks or turn a known generated departure into an assertion about the novel.

User-directed editorial corrections can be made narrowly in the public catalog.
For new book claims, obtain permitted companion evidence. Keep private replacement
provenance under `.local/curation/`; reconcile it with the companion selection
before a later export can overwrite a spot fix. Importers preserve unmentioned
works but replace the entire record of any mentioned work.

## Code map and behavior to preserve

| Area | Files |
| --- | --- |
| Foyer, panels, navigation state, keyboard controls | `src/main.tsx`, `src/style.css` |
| Camera, input, scene lifecycle, inspection | `src/scene.tsx`, `src/joystick.tsx` |
| Wall joints, fixed lighting, headings | `src/architecture.ts`, `src/gallery-lighting.ts` |
| Display sizes and procedural objects | `src/display.ts`, `src/objects.ts` |
| Loading, preview textures, image recovery | `src/scene-media.ts`, `src/art-image.tsx` |
| Layout validation and route map | `src/layout.ts`, `src/route.tsx` |
| Public records and positions | `public/collection/catalog.json`, `layout.json` |
| Import, spot replacement, preview generation | `scripts/` |

Use a high-contrast dark theme, with locally brighter spaces where reviewed
captions call for them. The architecture is an interpretation. Labels use
transparent, outlined lettering; keep chamber headings off doorways and route
arrows. Lighting must stay fixed as the camera moves. Do not reintroduce nearby-only
art loading or dynamic light budgets that cause visible pop-in.

Render on demand: idle rooms, hidden tabs, and open reading panels should stop
drawing. All scene textures must decode before entry, after consent. Retain compact
scene textures and full-resolution inspection images. Do not preload every original
PNG into graphics memory. Keep the accessible Collection complete without WebGL
(Web Graphics Library), and preserve readable text, reduced motion, focus trapping,
touch navigation, and M/Escape pointer release.

## Verification and handoff

Run `make check` for behavior changes. For helper-only changes, run the relevant
Node tests and a build; broaden when they affect runtime data or layout. Inspect
visual changes at desktop and phone sizes. Phone emulation does not establish
real iOS Safari behavior. Native pointer capture has a separate headed check;
see [development](docs/development.md). Report checks actually run and limitations.

Review `git diff --check`, proposed files, and the staged diff before committing.
Never force-add ignored files. Stop servers you started when finished; do not stop
the user's server. No private review screenshots or source handoffs in commits.
Do not publish, push, deploy, merge, change visibility, or add paid services without
user authorization for that action. Existing authorization in the conversation
remains valid. Future deployment work should begin with the constraints in
[development](docs/development.md#deployment-preparation).

The canonical host is `toms-crossing-exhibition.isaacvelando.com`; its infrastructure
belongs to `iwvelando/cloud-accounts`. Main deploys through CI after `check`, `webkit`,
and aggregate `verify` succeed. Preserve the main-only `production` environment,
scoped OIDC deployment, and read-only live smoke checks. Keep preview and CloudFront
CSP identical. Dependabot patch/minor updates merge and deploy after Verify; majors
need review. Preserve the root-only sitemap, robots collection restriction, spoiler-free
share card, and runtime license notices. See development for caching and release order.
