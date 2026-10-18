# Growing the exhibition

The current scene contains 198 works from 210 supplied images, across five main
chambers and five connected collection spaces. The main route runs counterclockwise.
The Route panel shows the entire floor plan and offers direct room visits. Collection
provides every work and its full label without requiring movement through the scene.

## Described structure and interpreted spaces

| Space | Coverage | Reviewed constraints |
| --- | --- | --- |
| Chamber 1 | Through Wednesday, October 27, 1982 | Largest chamber, with the most pieces |
| Chamber 2 | Thursday, October 28 | Exit toward Chamber 3 has two Mine paintings |
| Passage 2–3 | Transition | Darker passage; slate and chalk works |
| Chamber 3 | Friday, October 29 | Return to lightness; projection alcove; incoming passage interrupts a wall |
| Chamber 4 | Saturday, October 30 | Cirque Wall rises above the other displays; tiny woodcuts and a higher tapestry |
| Chamber 5 | Sunday, October 31 | Dark interior; mothers, children, meadow and objects |
| Across moments | Retrospectives and composites | Curatorial annex, including the ordered life montage |
| Side collection | Ancillary material | Proposed curatorial space |
| Recollections | Remembered works and uncertainty | Separates Cal’s uncertain inventory from confirmed chamber works |
| Afterimages | Later exhibition | Separate wing for digital returns and related works |
| Reader responses | Personal interpretations | Scenes, metaphors and counterfactual possibilities |

Room dimensions, mounting positions, partitions and the annexes are design
interpretations. Exact sculpture sizes and detailed physical effects are not
established by the models. Source passages and replay anchors remain private.
The espresso-bar display is ancillary, not automatically another main chamber.

## Layout and circulation

Chamber 1 uses angled bays around a generous center. Chamber 2 has an offset
partition, allowing contrasting subjects to occupy adjacent but separated faces.
Chamber 3 has clear paths around freestanding displays and its projection alcove.
Chamber 4 combines perimeter displays, staggered interior walls, and the raised
Cirque Wall. Its height is a spatial interpretation of the described verticality.
The meadow painting occupies an unobstructed wall segment in Chamber 5, clear
of the doorway. The newer annexes connect beyond Chamber 5.

Preserve stable reservation IDs and explicit work-to-slot assignments. An import
must not reshuffle installed works based on catalog order. When changing a display
medium, review its footprint, camera location and circulation deliberately. Keep
`assetStatus` separate from `placementStatus`: a finished image can retain a
candidate chronological placement. Do not equate a chapter of disclosure with the
day depicted, or treat a group template as a count of original works.

There are 221 reservations: 198 ready and 23 planning bays. Eighty prompt-only
candidates remain in the private inventory without supplied images. The planning
bays do not individually represent every one of those candidates. Expand capacity
through reviewed placements, rather than automatically producing a fictional
inventory from prompt counts. Planning placeholders remain opt-in and stay out of
normal artwork navigation.

## Grouped images and object studies

The twelve-panel life montage remains one work, read left to right across three
rows, with its related companion beside it. Inspection preserves the same sequence.
Alternate realizations use `presentation: variants`; their interface describes
alternatives without implying successive events or separate in-book originals.

Twenty-eight object displays retain their generated images as inspection
references. Their procedural models are simplified spatial studies. The film
screen presents a still; the listening station is silent. Refrigeration, fog,
refraction and holographic effects are static interpretations. Individual captions
state these limits. Broad inspection volumes make small objects and open meshes
easy to select without changing walking collision footprints.

## Rendering and readability

After spoiler consent, the foyer prepares compact scene textures before entry.
Every image surface is then present when a visitor rounds a corner or jumps to a
work. Full-resolution originals remain in inspection; collection cards use compact
previews. Regenerate those previews with `npm run prepare-art` after an import.
The build rejects missing previews or invalid preview checksums.

Lighting is static. Precomputed spotlight washes illuminate each display wall,
clipped to its solid face so they cannot spill across doorways. Warm floor pools
mark object displays. Transparent unlit lettering has a fine contrast edge and
soft shadow. Chamber titles and subtitles form one sign on a solid north-wall
section, separate from route arrows and door openings.
Subtle procedural plaster and mineral floor textures use mipmaps to limit shimmer.
The scene draws only when input, resizing or interface changes require it.

Desktop visitors can drag to look or press M to capture the mouse for unlimited turning; M or Escape releases it.
Touch visitors use the left analog joystick for movement and the right thumb for
looking. Releasing or cancelling the joystick stops movement. All controls retain
keyboard alternatives, and reading panels support text enlargement and narrow
screens. Essential information is available in the readable Collection view.

## Verify changes

Run the build and tests after editing the plan. Tests check wall and base joints,
frame separation, camera sightlines, walking clearances, and reachability with
planning placeholders visible. Browser checks cover consent, loading failures,
inspection, controls, text enlargement, complete map bounds and idle drawing.
Inspect desktop and phone renders as well: valid geometry alone does not prove a
good composition. Phone-sized Chromium is not a substitute for native iOS Safari.
