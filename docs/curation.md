# Curating and correcting artwork

The public catalog is the app's display source. It contains reviewed captions,
credits, alt text, interpretation notes, and asset references. The layout holds
stable reservations independently of catalog order. Change only the requested
works; preserve existing reservations and unrelated captions.

There are two supported entry points: a reviewed companion export for additions
or evidence-based revisions, and a user-provided replacement for an existing work.
Neither needs a hosted service. Generated images may contain errors; the app does
not treat them as documentary evidence of the book.

## Replace one image

Inspect the supplied image and identify the existing work's `id` in
`public/collection/catalog.json`. Confirm whether it is a single image, a numbered
panel, or an object reference. The following IDs and paths are placeholders:

```sh
node scripts/replace-artwork.mjs --work WORK_ID --image /path/to/replacement.png
node scripts/replace-artwork.mjs --work WORK_ID --image /path/to/replacement.png --apply
npm run prepare-art
make check
```

The first command reports a proposed replacement without changing public files.
The second installs locally. The helper validates PNG (Portable Network Graphics)
chunk checksums, strips embedded generation text and other ancillary metadata,
and gives the result a content-hashed filename. It preserves compressed pixel data
and standard color information; the original input stays untouched. Animated PNGs
and embedded color profiles are rejected; convert those privately to a static sRGB
PNG and visually verify the conversion first. This is metadata hygiene, not an
assessment of image content or factual accuracy.

For a montage or alternate-image group, add `--panel N` to both commands; numbering
starts at one. Replacing panel 1 also updates the cover image. Other panels, their
order, and the `presentation` mode are preserved. For a modeled object, add
`--reference`; this changes its inspection image and retains the 3D display.
For wall lettering, replacing the reference image does not change `wallText`.
Optionally add `--alt 'A concise description of the replacement'` to update the
selected image's alt text. Review group-level alt text separately if necessary.

Stop the preview server while applying catalog changes; restart after rebuilding
previews so a tab cannot mix versions. Check the work in both the room and its
inspection panel, at desktop and phone sizes. Review aspect ratio, cropping,
frame treatment, alt text, and whether an old note still describes an imperfection
that has now been corrected. A replacement that includes a painted frame may need
`frame: none` to avoid an extra frame. A reference image does not remodel an object.

The helper retains old files for review and rollback. Before release, compare
assets against all catalog `image`, `referenceImage`, and panel references; remove
only confirmed unreferenced files, then regenerate previews. Both `assets/` and
`previews/` are shipped by Vite, so unused files are still public until removed.
Do not delete files by title patterns or assume a cover is the group's only image.

## Caption and display corrections

For an explicitly requested editorial correction, edit only the relevant public
fields in `catalog.json`. Preserve attribution layers and distinguish the visible
image from the narrated work. Do not add guessed spellings, invented curator
feelings, or new book claims. New factual claims need the companion's permitted
local evidence, within the creator's listening limit. Purely visual replacements
and copy edits do not require regenerating transcripts.

`frame` controls added framing; `object` selects a procedural display;
`referenceImage` stays in inspection; `wallText` is the reviewed lettering rendered
on the wall. `panels` preserves numbered order, and `presentation: variants`
distinguishes alternatives from a sequence. Do not split a cohesive montage into
unrelated entries or move its companion work when replacing a panel.

The layout's `workId` points to a catalog ID. Keep `assetStatus` separate from
`placementStatus`: an installed image can still have a candidate placement.
Geometry or medium changes need collision, viewing-clearance, and route checks.
A new work requires an explicit reservation; use the import workflow below.

## Keep spot fixes across future exports

Keep a private change record under ignored `.local/curation/` containing the stable
work ID, panel number if applicable, old and new public asset names, the user's
requested change, and private source location. Do not commit it or copy raw prompts
into public captions. The public Git diff records the curated result.

Before applying a later export, compare its affected work records with this log
and the current catalog. The importer preserves unmentioned works but replaces
mentioned records, so an older export can restore an outdated image or caption.
Reconcile the companion's private selection with the replacement and regenerate
the reviewed bundle, or omit the stale record from the installation. Never assume
an export's timestamp makes every field newer. Keep the supplied original private
so the companion can reproduce the next export. Do not silently discard a spot fix.

## Install a reviewed export

Use the [heard-so-far companion](https://github.com/iwvelando/heard-so-far) skill at
`skills/export-exhibition/SKILL.md`. The export workflow is currently on its
`codex/exhibition-milestone` branch pending merge. Follow that repo's listening,
evidence, and privacy instructions; this app's finished-book audience does not
advance the creator's listening position.

A handoff archive may contain raw prompts and original images alongside reviewed
public data. Extract it only to private staging, never under `public/`. Inspect
which directory actually contains the reviewed `catalog.json` and selected assets.
Only those reviewed records and sanitized images belong in the app; an inventory
of candidates is not approval to publish their prompts or captions.

```sh
node scripts/install-collection.mjs --bundle /path/to/reviewed/export
node scripts/install-collection.mjs --bundle /path/to/reviewed/export --apply
npm run prepare-art
make check
```

For a new work, add `--place work-id=reservation-id` to both commands. Existing
works retain their positions. The importer checks public fields, paths, image
hashes, frames, object types, panel order, and room/medium compatibility before
writing. It does not verify book claims or strip embedded metadata from an export;
review and sanitation belong to the producing workflow. Confirm all new files and
the staged diff before commit. Never commit the archive or private provenance.

`npm run prepare-art` uses local Playwright and its canvas encoder to build compact
WebP previews and `scene-assets.json`. Builds verify preview coverage and checksums.
Commit the selected originals, generated previews, manifest, catalog, and any
intentional layout changes together. The preview builder is not a substitute for
checking an image's visual content.
