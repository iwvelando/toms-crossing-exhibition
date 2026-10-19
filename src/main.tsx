import { prepareSceneMedia, type PreviewIndex, type SceneMedia } from "./scene-media";
import { Joystick } from "./joystick";
import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { Gallery } from "./scene";
import type { Catalog, GalleryHandle, Work } from "./types";
import { locationLabel, reservationTitle, validateLayout, type Layout, type Reservation } from "./layout";
import { RoutePanel } from "./route";
import { ArtImage } from "./art-image";
import "./style.css";

function App() {
  const [mouseLook,setMouseLook]=useState(false);
  const [mouseLookError,setMouseLookError]=useState("");
  const [previews,setPreviews]=useState<PreviewIndex>({});
  const [media,setMedia]=useState<SceneMedia>(new Map());
  const [loadProgress,setLoadProgress]=useState(0);
  const [entered, setEntered] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>();
  const [layout, setLayout] = useState<Layout>();
  const [planning, setPlanning] = useState(false);
  const [route, setRoute] = useState(false);
  const [reservation, setReservation] = useState<Reservation>();
  const [roomId, setRoomId] = useState("chamber-1");
  const room = layout ? locationLabel(layout, roomId) : undefined;
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Work>();
  const [browse, setBrowse] = useState(false);
  const [roomFilter, setRoomFilter] = useState("all");
  const [about, setAbout] = useState(false);
  const [help, setHelp] = useState(false);
  const [near, setNear] = useState<Work | Reservation>();
  const [graphics, setGraphics] = useState(true);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const gallery = useRef<GalleryHandle>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const overlay = !!selected || !!reservation || route || browse || about || help;
  useEffect(() => {
    if (!overlay) return;
    priorFocus.current = document.activeElement as HTMLElement;
    const close = () => {
      setSelected(undefined);
      setReservation(undefined);
      setRoute(false);
      setBrowse(false);
      setAbout(false);
      setHelp(false);
    };
    const timer = window.setTimeout(
      () => dialog.current?.querySelector<HTMLButtonElement>("button")?.focus(),
      20,
    );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const items = [
          ...(dialog.current?.querySelectorAll<HTMLElement>(
            "button, a[href], input, select, summary",
          ) ?? []),
        ].filter((x) => !x.hasAttribute("disabled") && x.getClientRects().length > 0 &&
          (!x.closest("details:not([open])") || x.matches("details:not([open]) > summary")));
        const first = items[0],
          last = items.at(-1);
        if (!dialog.current?.contains(document.activeElement)) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", key);
      priorFocus.current?.focus();
    };
  }, [overlay]);
  useEffect(() => {
    if (overlay)
      dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [selected?.id, reservation?.id, route, browse, about, help]);
  useEffect(() => {
    const toggleMouseLook = (event: KeyboardEvent) => {
      if (!entered || !graphics || overlay || event.defaultPrevented || event.repeat ||
          event.ctrlKey || event.altKey || event.metaKey || event.shiftKey ||
          event.key.toLowerCase() !== "m" ||
          !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest("input, textarea, select"))) return;
      event.preventDefault();
      setMouseLookError("");
      gallery.current?.toggleMouseLook();
    };
    window.addEventListener("keydown", toggleMouseLook);
    return () => window.removeEventListener("keydown", toggleMouseLook);
  }, [entered, graphics, overlay]);
  async function enter() {
    if (!agreed || loading) return;
    setLoading(true);
    setLoadProgress(0);
    setError("");
    try {
      const [response, planResponse] = await Promise.all([
        fetch("/collection/catalog.json"), fetch("/collection/layout.json"),
      ]);
      if (!response.ok || !planResponse.ok)
        throw new Error(
          "The collection could not be loaded. Please try again.",
        );
      const data = (await response.json()) as Catalog;
      if (data.version !== 1 || !Array.isArray(data.works))
        throw new Error("This collection format is not supported.");
      const plan = await planResponse.json() as Layout;
      validateLayout(plan, data.works.map(w => w.id));
      const prepared=await prepareSceneMedia(data,graphics,setLoadProgress);
      setPreviews(prepared.previews);setMedia(prepared.media);
      setLayout(plan);
      setCatalog(data);
      setEntered(true);
      if (!graphics) setBrowse(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load the collection.",
      );
    } finally {
      setLoading(false);
    }
  }
  function view(work: Work | Reservation) {
    if ("assetStatus" in work) { setReservation(work); setSelected(undefined); }
    else { setSelected(work); setReservation(undefined); }
    setBrowse(false);
    setRoute(false);
  }
  function tour(step: number) {
    if (!catalog?.works.length) return;
    const next = (index + step + catalog.works.length) % catalog.works.length;
    setIndex(next);
    gallery.current?.visit(catalog.works[next].id);
  }
  const close = () => {
    setSelected(undefined);
    setReservation(undefined);
    setRoute(false);
    setBrowse(false);
    setAbout(false);
    setHelp(false);
  };
  return (
    <>
      <Gallery
        ref={gallery}
        entered={entered}
        layout={layout}
        planning={planning}
        onMouseLook={setMouseLook}
        onMouseLookError={setMouseLookError}
        media={media}
        onRoom={setRoomId}
        works={catalog?.works ?? []}
        paused={overlay}
        onNear={setNear}
        onSelect={view}
        onUnavailable={() => setGraphics(false)}
      />
      <div className="vignette" />
      <div className={`app ${!entered ? "in-foyer" : ""}`} inert={overlay}>
        <header>
          <button
            className="wordmark"
            onClick={() => {
              if (entered) gallery.current?.reset();
            }}
            aria-label="Return to gallery entrance"
          >
            <span>TOM’S CROSSING</span>
            <small>AN UNOFFICIAL EXHIBITION</small>
          </button>
          <nav aria-label="Exhibition navigation">
            {entered && (
              <button className="nav-link" onClick={() => setBrowse(true)}>
                Collection{" "}
                <span className="count">
                  {catalog?.works.length.toString().padStart(2, "0")}
                </span>
              </button>
            )}
            {entered && <button className="nav-link" onClick={() => setRoute(true)}>Route</button>}
            <button className="nav-link" onClick={() => setAbout(true)}>
              About <span aria-hidden="true">↗</span>
            </button>
          </nav>
        </header>
        {!entered ? (
          <main className="foyer">
            <div className="foyer-copy">
              <p className="eyebrow">
                <span className="line" /> A READER-MADE COLLECTION
              </p>
              <h1>
                A story.
                <br />A place to
                <br />
                <em>remember.</em>
              </h1>
              <p className="intro">
                An imagined space for the art, objects, and impressions left by{" "}
                <i>Tom’s Crossing.</i>
              </p>
              <p className="author">
                Inspired by the novel by Mark Z. Danielewski
              </p>
              <p className="listening-note">
                This fan exhibition is based exclusively on the curator’s
                audiobook listening. Names and other spellings are rendered as
                heard and interpreted, and may differ from the printed text.
              </p>
            </div>
            <section className="entry-sign" aria-labelledby="entry-title">
              <div className="sign-top">
                <span className="small-number">01 / THE FOYER</span>
                <span className="tiny-star" aria-hidden="true">
                  ✳
                </span>
              </div>
              <p className="eyebrow">BEFORE YOU ENTER</p>
              <h2 id="entry-title">
                For those who have
                <br />
                finished the book.
              </h2>
              <p>
                This exhibition contains spoilers for <i>Tom’s Crossing</i>,
                including its premise, characters, and events. Please finish the
                novel before entering.
              </p>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>I understand and want to enter.</span>
              </label>
              <button
                className="enter-button"
                disabled={!agreed || loading}
                onClick={enter}
              >
                {loading ? `Preparing the gallery · ${loadProgress}%` : "Enter the exhibition"}
                <span aria-hidden="true">↗</span>
              </button>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              {!graphics && (
                <p className="quiet">
                  3D is unavailable on this device. Enter to explore the
                  accessible collection.
                </p>
              )}
              <p className="sign-foot">
                A living collection · Unofficial fan interpretation
              </p>
            </section>
          </main>
        ) : (
          <main className="gallery-ui" aria-label="Walkable exhibition">
            <div className="room-heading">
              <p className="eyebrow">{planning ? "THE EXHIBITION / PLANNING PREVIEW" : "THE EXHIBITION"}</p>
              <h1>{room?.title ?? "The exhibition"}</h1>
              <p>{room?.subtitle}</p>
            </div>
            {graphics ? (
              <>
                <div className="crosshair" aria-hidden="true" />
                {near && (
                  <button className="inspect-hint" onClick={() => view(near)}>
                    <span>{"title" in near ? near.title : reservationTitle(near)}</span>
                    <small>
                      <span className="keyboard-inspect">Inspect work <kbd>E</kbd></span>
                      <span className="touch-inspect">Tap to inspect work</span>
                    </small>
                  </button>
                )}
                <Joystick onMove={(x,y)=>gallery.current?.steer(x,y)} />
              </>
            ) : (
              <div className="graphics-fallback">
                <h2>The collection is still open.</h2>
                <p>Your browser could not start the 3D room.</p>
                <button
                  className="enter-button"
                  onClick={() => setBrowse(true)}
                >
                  Browse the artworks →
                </button>
              </div>
            )}
          </main>
        )}
        <footer>
          <span className="footer-left">
            {entered
              ? "WALK SLOWLY. LOOK CLOSELY."
              : "A NOVEL REIMAGINED IN ART & SPACE"}
          </span>
          {entered ? (
            <div className="tour-controls">
              <button
                aria-label="Previous artwork"
                onClick={() => tour(-1)}
              >
                ←
              </button>
              <button
                onClick={() => {
                  if (catalog) gallery.current?.visit(catalog.works[index].id);
                }}
              >
                Visit a work{" "}
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(catalog?.works.length ?? 0).padStart(2, "0")}
                </span>
              </button>
              <button aria-label="Next artwork" onClick={() => tour(1)}>
                →
              </button>
            </div>
          ) : (
            <span className="footer-center">Curated by Isaac</span>
          )}
          {entered ? (
            <div className="explore-controls">
              <button className="nav-link" onClick={() => setHelp(true)}>How to explore <span aria-hidden="true">?</span></button>
              {graphics && <span className="mouse-look-status" role="status">
                {mouseLookError || <>Mouse look {mouseLook ? "on" : "off"} · <kbd>M</kbd> to {mouseLook ? "release" : "capture"}{mouseLook && " · Esc also releases"}</>}
              </span>}
            </div>
          ) : (
            <span className="footer-right">
              LOCAL PREVIEW <span className="status-dot" />
            </span>
          )}
        </footer>
      </div>
      {overlay && (
        <div
          className={`overlay ${selected ? "work-overlay" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <section
            ref={dialog}
            className={`dialog ${selected ? "work-dialog" : browse ? "collection-dialog" : "text-dialog"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button className="close" onClick={close} aria-label="Close panel">
              ✕
            </button>
            {route && layout ? (
              <RoutePanel layout={layout} current={roomId} planning={planning} onPlanning={setPlanning}
                onVisit={id => { gallery.current?.visitRoom(id); setRoomId(id); close(); }} onReview={view} />
            ) : reservation ? (
              <>
                <p className="eyebrow">PLANNING PLACEHOLDER / PROVISIONAL</p>
                <h2 id="dialog-title">{reservationTitle(reservation)}</h2>
                <p>{layout?.rooms.find(r => r.id === reservation.room)?.title ?? reservation.room.replaceAll("-", " ")}</p>
                <p>{reservation.group ? "A flexible bay for a group of works. Its eventual count, dimensions, and arrangement still need review." : "A neutral study reserving space for a possible work. Its dimensions and position are estimates."}</p>
                <p>The artwork has not been installed in this preview. This marker makes no claim about its final appearance or attribution.</p>
                <p className="quiet">Candidate placement · {reservation.footprint[0]} × {reservation.footprint[1]} × {reservation.footprint[2]} m planning envelope.</p>
                <button className="text-action" onClick={() => { gallery.current?.visitReservation(reservation.id); close(); }}>View reserved position <span>↗</span></button>
                <button className="text-action secondary" onClick={() => { setReservation(undefined); setRoute(true); }}>Back to route <span>←</span></button>
              </>
            ) : selected ? (
              <>
                <div className="work-image">
                  {selected.panels ? (
                    <Montage key={selected.id} work={selected} />
                  ) : (selected.referenceImage ?? selected.image) ? (
                    <ArtImage key={selected.referenceImage ?? selected.image} image={(selected.referenceImage ?? selected.image)!} alt={selected.alt} />
                  ) : (
                    <ObjectStudy />
                  )}
                </div>
                <div className="work-copy">
                  <p className="eyebrow">
                    {selected.collection === "exhibition"
                      ? "FROM THE EXHIBITION"
                      : "A READER’S INTERPRETATION"}
                  </p>
                  <h2 id="dialog-title">{selected.title}</h2>
                  <p className="medium">{selected.medium}</p>
                  {selected.wallText && <p className="reference-note">Image reference · The passage displays the wording directly on its wall. The architecture in this reference image is imagined.</p>}
                  {selected.referenceImage && <p className="reference-note">Image reference · The gallery displays this work as a 3D object. The model and reference are separate interpretations.</p>}
                  <p>{selected.description}</p>
                  {selected.placement && <div className="placement-note">
                    <h3>{selected.placement.label}</h3>
                    <p>{selected.placement.note}</p>
                  </div>}
                  <dl>
                    <dt>
                      {selected.collection === "exhibition"
                        ? "In-book attribution"
                        : "Collection"}
                    </dt>
                    <dd>{selected.attribution}</dd>
                    <dt>Digital realization</dt>
                    <dd>{selected.credit}</dd>
                  </dl>
                  <div className="curator-note">
                    <h3>{selected.collection === "exhibition"
                      ? "About this reconstruction"
                      : "About this interpretation"}</h3>
                    <p>{selected.note}</p>
                  </div>
                  <p className="source-credit">
                    Inspired by <i>{catalog?.title}</i> by {catalog?.author}. An
                    unofficial, interpreted work; no affiliation or endorsement.
                  </p>
                  <button
                    className="text-action"
                    onClick={() => {
                      setIndex(catalog!.works.findIndex(work=>work.id===selected.id));
                      gallery.current?.visit(selected.id);
                      close();
                    }}
                  >
                    View in the room <span>↗</span>
                  </button>
                  <button
                    className="text-action secondary"
                    onClick={() => {
                      setSelected(undefined);
                      setBrowse(true);
                    }}
                  >
                    Back to collection <span>←</span>
                  </button>
                </div>
              </>
            ) : browse ? (
              <>
                <p className="eyebrow">A LIVING COLLECTION</p>
                <h2 id="dialog-title">Objects &amp; impressions</h2>
                <p className="collection-intro">
                  Reconstructions of described works and images from one
                  reader’s imagination. Each keeps its own attribution.
                </p>
                <label className="room-filter">
                  Browse by story grouping
                  <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
                    <option value="all">All works</option>
                    {[...new Map(catalog?.works.filter(w => w.placement).map(w => [w.placement!.room, w.placement!.label])).entries()].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <p className="collection-intro">The installed works sit within the larger room plan. Open Route to explore the spaces or reveal the planning placeholders.</p>
                <div className="collection-grid">
                  {catalog?.works.filter(w => roomFilter === "all" || w.placement?.room === roomFilter).map((work, i) => (
                    <button
                      className="art-card"
                      key={work.id}
                      onClick={() => view(work)}
                    >
                      <div className="card-image">
                        {(work.referenceImage ?? work.image) ? (
                          <img
                            src={`/collection/${previews[work.referenceImage ?? work.image!]?.image ?? work.referenceImage ?? work.image}`}
                            alt={work.alt}
                            loading="lazy"
                          />
                        ) : (
                          <ObjectStudy />
                        )}
                      </div>
                      <div className="card-meta">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <small>
                            {work.collection === "exhibition"
                              ? "EXHIBITION RECONSTRUCTION"
                              : "PERSONAL INTERPRETATION"}
                          </small>
                          <h3>{work.title}</h3>
                          {work.panels && <p>{work.panels.length}-image {work.presentation === "variants" ? "comparison · Alternate interpretations" : "montage · View in order"}</p>}
                        </div>
                        <span aria-hidden="true">↗</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : about ? (
              <>
                <p className="eyebrow">ABOUT THE PROJECT</p>
                <h2 id="dialog-title">
                  A reader’s response,
                  <br />
                  given a place.
                </h2>
                <p>
                  This is an unofficial fan exhibition inspired by{" "}
                  <i>Tom’s Crossing</i> by Mark Z. Danielewski, curated by
                  Isaac.
                </p>
                {entered ? (
                  <p>
                    The collection brings together digital reconstructions of
                    artworks described in the novel and personal images made
                    during a first reading. Generated images and modeled objects
                    are interpretations. Unspecified details remain the choices
                    of their makers.
                  </p>
                ) : (
                  <p>
                    Reader-made images and objects respond to the novel. Further
                    details about the collection are available after accepting
                    the spoiler warning.
                  </p>
                )}
                <p>
                  Room dimensions, partitions, and the connected annexes are
                  original design choices. The exhibition brings in-book artworks
                  and reader-directed images together across the five-day journey
                  and what follows.
                </p>
                <p>
                  Selected reflections may accompany individual artworks. This
                  site does not publish the reader’s private conversations or
                  listening history.
                </p>
                <p className="source-credit">
                  The novel is credited to its author. In-book makers and
                  digital production are credited separately. No affiliation or
                  endorsement is implied.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">TAKE YOUR TIME</p>
                <h2 id="dialog-title">How to explore</h2>
                <dl className="controls-list">
                  <dt>Look around</dt>
                  <dd>
                    Drag with your mouse or right thumb. On desktop, press M to capture the mouse. The cursor disappears and mouse movement turns the camera freely around the centered crosshair, without screen-edge limits. Press M again or Escape to release it. Opening a panel also releases the mouse.
                  </dd>
                  <dt>Walk</dt>
                  <dd>
                    W A S D or arrow keys. On touch devices, drag the left joystick; pushing farther walks faster. Release it to stop.
                  </dd>
                  <dt>Inspect</dt>
                  <dd>
                    Tap a nearby artwork or its inspection label. On desktop, click it or look toward it and press E.
                  </dd>
                  <dt>Move directly</dt>
                  <dd>Open Route to choose a room. Use the arrows at the bottom to visit each installed work.</dd>
                  <dt>Browse without walking</dt>
                  <dd>Open Collection for every work and its full label.</dd>
                </dl>
                <p className="quiet">
                  Reduced-motion preferences are respected. There is no head
                  bob, timed route, or sound.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Montage({work}: {work: Work}) {
  const panels=work.panels!;
  const [index,setIndex]=useState(0);
  const panel=panels[index];
  return <div className="sequence-view" aria-label={work.presentation === "variants" ? "Alternate interpretations" : "Ordered montage"}>
    <div className="sequence-main"><ArtImage key={panel.image} image={panel.image} alt={panel.alt} /></div>
    <div className="sequence-navigation">
      <button aria-label={work.presentation === "variants" ? "Previous interpretation" : "Previous montage image"} disabled={index===0} onClick={()=>setIndex(i=>i-1)}>←</button>
      <p aria-live="polite"><span>{String(index+1).padStart(2,"0")} / {panels.length}</span><br />{panel.title}</p>
      <button aria-label={work.presentation === "variants" ? "Next interpretation" : "Next montage image"} disabled={index===panels.length-1} onClick={()=>setIndex(i=>i+1)}>→</button>
    </div>
    <ol className="sequence-thumbnails" aria-label={work.presentation === "variants" ? "Alternate interpretations" : "Montage sequence, read left to right"}>
      {panels.map((item,i)=><li key={item.image}><button aria-label={`Image ${i+1}: ${item.title}`} aria-pressed={i===index} onClick={()=>setIndex(i)}>
        <img src={`/collection/${item.image}`} alt="" loading="lazy" /><span>{String(i+1).padStart(2,"0")}</span>
      </button></li>)}
    </ol>
  </div>;
}

function ObjectStudy() {
  return (
    <div
      className="object-study"
      role="img"
      aria-label="A modeled scotch glass holding red syrup, displayed on a dark plinth"
    >
      <div className="glass-rim" />
      <div className="glass-body">
        <div className="syrup" />
        <div className="glass-glint" />
      </div>
      <div className="object-plinth" />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
