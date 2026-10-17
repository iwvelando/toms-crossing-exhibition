# Tom’s Crossing — An Unofficial Exhibition

A local prototype of a walkable fan exhibition inspired by the novel by Mark Z.
Danielewski. A spoiler-warning foyer leads to five connected chambers, an interpretation
annex and connected collections, 28 modeled object displays, and a fully readable collection view.

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
use W A S D or arrow keys to walk. Press **M** to capture the mouse for unlimited turning around the centered crosshair;
press **M** again or Escape to release it. Click a work or use the inspection action to open its label.
The bottom navigation visits works directly; Collection works without walking or
WebGL (Web Graphics Library). Phones have an analog movement joystick and tap-to-inspect labels. Use the right thumb to look. The desktop status beside How to explore reflects actual mouse capture and shows how to release it. Opening an inspection or navigation panel also releases the mouse. Open **Route** to jump between chambers. Enable **Show planning placeholders**
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

## Collection and curation

The collection contains 200 images across 188 works, including an ordered twelve-image
montage, alternate realizations, and 28 modeled objects with inspection references.
Ten connected spaces include the five chambers and interpretation annexes. The layout
has 211 stable reservations, including 23 planning bays. Further prompt-only candidates
remain private; the bays are not a complete assignment of every future piece.

Captions distinguish in-book attribution, the novel's author, and digital realization.
Personal notes are selected interpretations rather than a private conversation archive.
The object models are simplified studies; their labels describe limits such as a still
film screen or silent listening station. Generated artworks can have imperfections
and can be replaced individually without rebuilding the collection.

See [curation and spot corrections](docs/curation.md) to replace an image, update one
panel or object reference, or install a reviewed companion export. The workflow
preserves work IDs, positions, and montage order. It also explains how to keep spot
fixes from being overwritten by a later export.

## Architecture and publication

React and TypeScript own the interface; Three.js renders the gallery. The scene
renders on demand and stops drawing while idle or hidden. After consent, compact
WebP textures decode before entry, avoiding visible art pop-in. Full-resolution
images are available in inspection. Fixed spotlight washes illuminate walls and
object displays at every distance; outlined, transparent lettering retains contrast.

Vite produces a static site with no accounts, analytics, backend, or paid runtime
service. No hosting is configured. The foyer prevents accidental viewing through
the interface; public source and asset URLs are directly accessible. Public release
still requires content and attribution review.

See [development and deployment preparation](docs/development.md) for the code map,
checks, native mouse-capture testing, and static-hosting constraints. The
[layout plan](docs/layout-plan.md) describes chamber structure and spatial refinement.
