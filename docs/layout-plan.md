# Growing the exhibition

The spatial preview connects five chambers along a suggested counterclockwise
route. An interpretation annex branches from the first chamber, with an ancillary
side room. Five installed works occupy explicit positions. Route → Show planning
placeholders reveals 125 neutral reservations, including 40 group bays.

## Preserve the described structure

The locally reviewed passage gives five chambers, a recommended counterclockwise
route, and these day assignments:

| Space | Coverage | Spatial constraints established so far |
| --- | --- | --- |
| Chamber 1 | Up to and including Wednesday, October 27, 1982 | Largest chamber, with the most pieces |
| Chamber 2 | Thursday, October 28 | Exit toward Chamber 3 has two Mine paintings |
| Passage 2–3 | Transition | Darker passage; slate and chalk works |
| Chamber 3 | Friday, October 29 | Return to lightness; projection alcove on the third wall; incoming passage interrupts the fourth wall |
| Chamber 4 | Saturday, October 30 | Reviewed only in part |
| Chamber 5 | Pending local evidence | Do not infer its contents or date |

The espresso-bar display is ancillary, not automatically another chamber.
Source passages and their replay anchors remain in the companion's private audit.

## Spatial preview

Keep a legible counterclockwise route but give each chamber an individual rhythm.
Chamber 1 has shallow angled bays around its generous central space. Chamber
2 has an offset dividing wall: opposing faces let works concerning Allison
and Sondra and works concerning Orwin occupy adjacent but separated spaces. This
is a curatorial interpretation, not a reported architectural detail. Confirm each
work's day before pairing it; thematic grouping must not override chronology.

Preserve the darker transition into a brighter Chamber 3, with space around
freestanding objects and a distinct alcove for projection. Allow visitors to
bypass an installation without walking through it. Vary partitions and sightlines
within the described wall relationships; exact dimensions and bends are design
choices. Use a direct room selector and the complete Collection view as alternate
routes. No essential label should require navigating or reading a 3D wall plaque.

## Plan capacity before rendering every asset

The opt-in planning mode reserves wall panels, plinth volumes for objects, and
floor areas for installations. Initial panel sizes use a common estimate; refine
these to each finished image’s aspect ratio. Installation outlines are walkable
during planning; solid installations will need their own collision footprints. Show clear
placeholder labels and approximate dimensions; do not create substitute artwork.
Keep placeholders out of normal visitor mode and its next-work navigation.

Use stable work IDs and explicit slots rather than array indices. Separate
`assetStatus` (planned or ready) from `placementStatus` (candidate,
verified). Each slot records its room, surface or floor anchor, display footprint,
viewing point, and circulation clearance. A group template reserves an adjustable
bay, not a fictional count of objects. Replacing a panel with its finished image
should preserve the slot; replacing an object may require revisiting clearance.

The private prompt inventory contains 26 personal interpretations and 104
reconstruction entries: 64 individually distinguished descriptions and 40 group
or medium templates. These are planning entries, not 130 finished works. The current 130 reservations
are a capacity study and can expand or contract. Do not equate an existing image filename with a fulfilled prompt
without reviewing the actual artwork. Keep asset availability separate from
passage verification.

Start with an approximate full route, test density and travel time on desktop and
phone, then refine one chamber at a time as assets arrive. Avoid a succession of
empty rectangular rooms. Keep composite, retrospective, and counterfactual works
explicitly marked; assign them from depicted time or a deliberate interpretive
placement rather than blindly copying the day of the chapter that mentions them.

## Materials and readability

The prototype uses subtle procedural plaster and mineral floor textures, with
mipmaps to reduce distant shimmer. These are original design choices and require
no downloaded texture service. Reading text uses relative sizes at the visitor's
base font size; secondary controls use 14-pixel equivalents and compact labels
have a 12-pixel floor at default settings. Keep touch targets at least 44 pixels.
Maintain the readable Collection alternative and verify narrow-screen reflow and
text enlargement alongside the 3D view.

## Update the plan without reshuffling it

`public/collection/layout.json` is the public spatial record. The source-to-position
audit stays in the private companion workspace. Each ready reservation references
exactly one catalog work. Catalog order affects collection navigation, not placement.

Replace a placeholder by mapping a reviewed catalog ID to its existing reservation.
Revisit footprint, viewing distance, and evidence for the story grouping separately.
Group templates reserve a bay rather than a fixed number of objects. Composite and
unresolved placements can remain in the interpretation annex while evidence is reviewed.
Do not populate the fifth chamber from an inferred next day.

The two narrow passage displays have their own reservations. The darker passage
into Chamber 3 and its lighter interior are included; the projection alcove is a
reserved floor area. Exact wall lengths, passage orientations, and all partitions
are design choices. The dividing wall is ready for thematic pairings, but those
specific works are not yet installed or claimed as verified neighbors.

Run the build and browser tests after layout edits. Tests use a walking-radius
collision check and flood-fill the floor plan with all placeholders visible to
catch blocked portals, trapped viewing positions, and disconnected spaces. Also
inspect the room visually: geometric clearance does not prove a good sightline.
