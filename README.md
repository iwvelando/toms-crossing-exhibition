# Tom’s Crossing — An Unofficial Exhibition

A local prototype of a walkable fan exhibition inspired by the novel by Mark Z.
Danielewski. A spoiler-warning foyer leads to five connected chambers, an interpretation
annex, a modeled object, and a fully readable collection view.

The audience is people who have finished the novel. The collection itself is still
in progress. The room's architecture and arrangement are design interpretations;
this prototype does not claim to reproduce the complete fictional gallery.

## Preview

Use Node.js 22.12 or newer and npm:

```sh
make setup
make dev
```

`make preview` builds and serves the production bundle. For a phone on the same
Wi-Fi, stop the corresponding local server and run `make dev-lan` or
`make preview-lan`. These bind to `0.0.0.0` over HTTPS (Hypertext Transfer Protocol
Secure) and print your network addresses. Open the address using port 5173 for
development or 4173 for preview. If either port is busy, use, for example,
`make preview-lan PREVIEW_PORT=4188` and open that port instead. Accept the browser's self-signed certificate
warning for this local site. If the operating system asks, allow local-network
access for Node. A firewall or guest Wi-Fi isolation can prevent phone access.

The certificate helper needs OpenSSL, keeps its key under ignored `.local/tls/`,
and renews the certificate when addresses change or expiry approaches. It does
not change system trust settings. LAN (local area network) targets expose the
preview to your local network only while running; Ctrl-C stops it. Normal targets
remain loopback-only HTTP. No additional package or paid service is required.

Open the printed local address. Accept the foyer warning to enter. Drag to look;
use W A S D or arrow keys to walk. Double-click the room for mouse capture, and
Escape to release it. Click a work or use the inspection action to open its label.
The bottom navigation visits works directly; Collection works without walking or
WebGL (Web Graphics Library). Phones have hold-to-walk buttons and tap-to-inspect
labels. Open **Route** to jump between chambers. Enable **Show planning placeholders**
to see the full spatial preview: neutral wall panels, object volumes, and installation
areas. This toggle is off by default. It is a local planning view, not an access-controlled
curator account.

```sh
npm run build
npm test
```

Browser tests require Playwright's Chromium (`npx playwright install chromium`).
They cover desktop and phone sizes, spoiler acceptance, content loading, movement,
inspection, touch cancellation, keyboard focus, error recovery, idle draw calls,
room connectivity, placeholder clearances, and the non-3D fallback. The phone
project uses Chromium device emulation; it does not replace testing iOS Safari. Tests serve the
built site on local port 4187. No hosting or deployment is configured.

## Curating the collection

`public/collection/catalog.json` contains explicitly selected public captions,
credits, interpretation notes, and references to the included images. Digital
production and in-book attribution are separate. Images are generated fan works;
they are not official artwork, and no affiliation or endorsement is implied.

Prepare additions with the companion repository's `export-exhibition` skill. It
stages reviewed public data separately from private transcripts, listening state,
questions, and generation conversations. Copy only the reviewed bundle into
`public/collection/`. Do not commit private selections or the companion workspace.
Source evidence and listening timestamps do not belong in this public repository.

`public/collection/layout.json` holds the room geometry and 130 stable reservation
IDs. Five positions currently have installed works; 125 are provisional studies,
including 40 expandable group bays. The count represents prompt entries, not an
asserted count of artworks. Chamber 5 is reserved without invented contents.

When installing a work, preserve its reservation's position and ID, set `workId` to
the catalog ID, and set `assetStatus` to `ready`. Keep `placementStatus` separate:
a finished image can still have a candidate placement. New entries need an explicit
position and clearance review; never reorder positions from the catalog array.
The layout tests check collisions and that every viewing point remains reachable. Preserve image aspect ratios and original files; avoid
adding a second frame around imagery that already includes one. The existing
framed reconstruction is displayed intact pending an artwork-only replacement.

Selected personal feelings can become notes beside their relevant works. The
prototype's current interpretive notes describe visible compositions; they are
editorial captions, not quotations from the curator's private conversations.

## Architecture and publication

React and TypeScript own the interface. Three.js renders the room and procedural
glass. The static scene renders on demand: idle rooms and open reading panels
stop issuing draw calls, and hidden tabs suspend rendering. Vite produces a static site; no accounts, server, analytics, or external
runtime services are used. No paid service is required for the prototype.

The foyer prevents accidental viewing through the ordinary interface. Public
source and asset URLs are directly accessible; this is not access control. The
site and repository are intended for public release, but this prototype is local
only. Review the selected content and dependency notices before an MVP launch.

See [the layout plan](docs/layout-plan.md) for the chamber structure, provisional capacity, and how to refine the spatial preview as works arrive.

## Install a reviewed update

After the companion skill exports a reviewed public bundle, preview its installation:

```sh
node scripts/install-collection.mjs --bundle /path/to/reviewed/export
```

For a new work, add `--place work-id=reserve-001` with its chosen reservation ID.
Existing works keep their positions. Add `--apply` to install locally, then run
`make check`. The importer checks public fields, asset paths, image checksums,
medium and room compatibility, and occupied slots before writing. It preserves
unmentioned works and candidate/verified placement status. It does not verify
book claims; that remains the companion skill's job. Run it with the preview
server stopped and restart afterward so a loaded tab cannot mix export versions.
