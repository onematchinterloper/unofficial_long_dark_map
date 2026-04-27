import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
  type WheelEvent,
} from 'react'
import type { Difficulty, MapsData } from './mapsTypes'
import { resolveMapUrl } from './mapsTypes'
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'

type AreaDef = {
  id: string
  title: string
  /** coords in the *image's natural pixel space* (homemap) */
  coords: [number, number, number, number]
  /**
   * Where this click goes in maps.json:
   * one segment = level 2 (region), two = level 3 (sub-location under that region)
   */
  path: [string] | [string, string]
}

const AREAS: AreaDef[] = [
  { id: 'forlorn-muskeg', title: 'Forlorn Muskeg', coords: [1747, 1332, 2046, 1394], path: ['forlorn-muskeg'] },
  { id: 'broken-railroad', title: 'Broken Railroad', coords: [1312, 1266, 1628, 1329], path: ['broken-railroad'] },
  { id: 'mountain-town', title: 'Mountain Town', coords: [1587, 795, 1876, 855], path: ['mountain-town'] },
  { id: 'hushed-river-valley', title: 'Hushed River Valley', coords: [1405, 366, 1769, 429], path: ['hushed-river-valley'] },
  { id: 'keepers-pass', title: "Keeper's Pass", coords: [2222, 567, 2485, 643], path: ['keepers-pass'] },
  { id: 'bleak-inlet', title: 'Bleak Inlet', coords: [2358, 1570, 2585, 1629], path: ['bleak-inlet'] },
  { id: 'the-ravine', title: 'The Ravine', coords: [2459, 1212, 2662, 1294], path: ['ravine'] },
  { id: 'winding-river', title: 'Winding River', coords: [2459, 1132, 2715, 1192], path: ['winding-river-&-carter-hydro-dam'] },
  { id: 'pleasant-valley', title: 'Pleasant Valley', coords: [2735, 735, 3035, 798], path: ['pleasant-valley'] },
  { id: 'timberwolf-mountain', title: 'Timberwolf Mountain', coords: [2938, 434, 3313, 493], path: ['timberwolf-mountain'] },
  { id: 'ash-canyon', title: 'Ash Canyon', coords: [3425, 300, 3650, 360], path: ['ash-canyon'] },
  { id: 'coastal-highway', title: 'Coastal Highway', coords: [2897, 1352, 3206, 1413], path: ['coastal-highway'] },
  { id: 'crumbling-highway', title: 'Crumbling Highway', coords: [3039, 1805, 3375, 1882], path: ['crumbling-highway'] },
  { id: 'desolation-point', title: 'Desolation Point', coords: [3225, 1548, 3540, 1611], path: ['desolation-point'] },
  { id: 'mystery-lake', title: 'Mystery Lake', coords: [2022, 1005, 2276, 1068], path: ['mystery-lake'] },
  { id: 'blackrock', title: 'Blackrock', coords: [2617, 205, 2828, 265], path: ['blackrock'] },
  { id: 'far-range-branch-line', title: 'Far Range Branch Line', coords: [741, 1591, 1127, 1667], path: ['far-range-branch-line'] },
  { id: 'transfer-pass', title: 'Transfer Pass', coords: [655, 1294, 924, 1356], path: ['transfer-pass'] },
  { id: 'forsaken-airfield', title: 'Forsaken Airfield', coords: [193, 1379, 524, 1440], path: ['forsaken-airfield'] },
  { id: 'sundered-pass', title: 'Sundered Pass', coords: [589, 945, 860, 1008], path: ['sundered-pass'] },
  { id: 'zone-of-contamination', title: 'Zone of Contamination', coords: [814, 1176, 1093, 1269], path: ['zone-of-contamination'] },
  { id: 'tftft-transitional-cave', title: 'TFTFT Transitional Cave', coords: [610, 1060, 780, 1140], path: ['transition-cave'] },
  { id: 'tftft-langston-mine', title: 'Langston Mine', coords: [910, 1035, 1025, 1100], path: ['zone-of-contamination', 'langston-mine'] },
]

function pathsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((s, i) => s === b[i])
}

function titleForMapPath(path: string[]): string {
  if (path.length === 0) return 'Great Bear'
  const area = AREAS.find((a) => pathsEqual(a.path, path))
  if (area) return area.title
  if (path.length === 1) return path[0]
  return path[1] ?? path[0] ?? 'Map'
}

function scaledCoords(coords: AreaDef['coords'], scaleX: number, scaleY: number) {
  const [x1, y1, x2, y2] = coords
  return [
    Math.round(x1 * scaleX),
    Math.round(y1 * scaleY),
    Math.round(x2 * scaleX),
    Math.round(y2 * scaleY),
  ].join(',')
}

/** Unclamped client position → natural image pixels (same convention as `AreaDef.coords` / `maps.json` rects). */
function clientToNatural(clientX: number, clientY: number, img: HTMLImageElement) {
  const r = img.getBoundingClientRect()
  if (r.width < 1 || r.height < 1 || !img.naturalWidth || !img.naturalHeight) {
    return { x: 0, y: 0 }
  }
  const u = (clientX - r.left) / r.width
  const v = (clientY - r.top) / r.height
  return {
    x: u * img.naturalWidth,
    y: v * img.naturalHeight,
  }
}

function naturalRectFromTwoClientPoints(
  aX: number,
  aY: number,
  bX: number,
  bY: number,
  img: HTMLImageElement,
): [number, number, number, number] {
  const p1 = clientToNatural(aX, aY, img)
  const p2 = clientToNatural(bX, bY, img)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const x1 = Math.max(0, Math.min(w, Math.round(Math.min(p1.x, p2.x))))
  const y1 = Math.max(0, Math.min(h, Math.round(Math.min(p1.y, p2.y))))
  const x2 = Math.max(0, Math.min(w, Math.round(Math.max(p1.x, p2.x))))
  const y2 = Math.max(0, Math.min(h, Math.round(Math.max(p1.y, p2.y))))
  return [x1, y1, x2, y2] as [number, number, number, number]
}

function logLinkToolOutput(opts: {
  mapPath: string[]
  mapTitle: string
  difficulty: Difficulty
  coords: [number, number, number, number]
}) {
  const { mapPath, mapTitle, difficulty, coords } = opts
  const [x1, y1, x2, y2] = coords
  const pathJson = JSON.stringify(mapPath)
  const route =
    mapPath.length === 0
      ? '/'
      : mapPath.length === 1
        ? `/region/${encodeURIComponent(mapPath[0])}`
        : `/region/${encodeURIComponent(mapPath[0])}/${encodeURIComponent(mapPath[1] ?? '')}`
  const block = `
--- TLD dev (copy/paste) ---
map:       ${mapTitle}   (${pathJson} · ${difficulty})
route:     ${route}
natural:   [${x1}, ${y1}, ${x2}, ${y2}]

// AreaDef-style (overworld)
coords:    [${x1}, ${y1}, ${x2}, ${y2}]

// maps.json (example link entry you wire up)
"coords": [${x1}, ${y1}, ${x2}, ${y2}]
---`
  // eslint-disable-next-line no-console
  console.log(block)
  const oneline = JSON.stringify({ mapPath, mapTitle, difficulty, coords: [x1, y1, x2, y2] })
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard
      .writeText(oneline)
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('(also copied one-line JSON to clipboard)')
      })
      .catch(() => {
        // ignore
      })
  }
}

type LinkRectToolProps = {
  imageRef: RefObject<HTMLImageElement | null>
  mapPath: string[]
  mapTitle: string
  difficulty: Difficulty
}

function LinkRectTool({ imageRef, mapPath, mapTitle, difficulty }: LinkRectToolProps) {
  const [rect, setRect] = useState<null | { x: number; y: number; w: number; h: number }>(null)
  const dragRef = useRef<null | { start: { x: number; y: number } }>(null)

  const localFromEvent = (e: PointerEvent<HTMLDivElement>) => {
    const t = e.currentTarget
    const b = t.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }

  return (
    <div
      className="tldDev"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        const p = localFromEvent(e)
        dragRef.current = { start: p }
        setRect({ x: p.x, y: p.y, w: 0, h: 0 })
      }}
      onPointerMove={(e) => {
        const d = dragRef.current
        if (!d) return
        e.preventDefault()
        e.stopPropagation()
        const p = localFromEvent(e)
        const x1 = Math.min(d.start.x, p.x)
        const y1 = Math.min(d.start.y, p.y)
        const w = Math.abs(p.x - d.start.x)
        const h = Math.abs(p.y - d.start.y)
        setRect({ x: x1, y: y1, w, h })
      }}
      onPointerUp={(e) => {
        const d = dragRef.current
        dragRef.current = null
        e.preventDefault()
        e.stopPropagation()
        if (d) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }
        if (!d) {
          setRect(null)
          return
        }
        const p = localFromEvent(e)
        setRect(null)
        const el = e.currentTarget
        const b = el.getBoundingClientRect()
        const aX = b.left + d.start.x
        const aY = b.top + d.start.y
        const bX = b.left + p.x
        const bY = b.top + p.y
        const img = imageRef.current
        if (!img?.naturalWidth) return
        if (Math.abs(bX - aX) < 3 && Math.abs(bY - aY) < 3) return
        const coords = naturalRectFromTwoClientPoints(aX, aY, bX, bY, img)
        if (coords[0] === coords[2] || coords[1] === coords[3]) return
        logLinkToolOutput({ mapPath, mapTitle, difficulty, coords })
      }}
      onPointerCancel={(e) => {
        dragRef.current = null
        setRect(null)
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          // ignore
        }
      }}
    >
      {rect && rect.w + rect.h > 0 && (
        <div
          className="tldDev__box"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        />
      )}
    </div>
  )
}

export default function MapPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('pilgrim')
  const [maps, setMaps] = useState<MapsData | null>(null)
  const [menuCollapsed, setMenuCollapsed] = useState(false)
  const [imgScale, setImgScale] = useState<{ x: number; y: number } | null>(null)
  const startImgRef = useRef<HTMLImageElement | null>(null)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const viewerImgRef = useRef<HTMLImageElement | null>(null)
  const wheelFocusRef = useRef<null | { u: number; v: number; clientX: number; clientY: number }>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { regionId, locationId } = useParams()
  const isDev = searchParams.get('dev') === '1' || searchParams.get('dev') === 'true'
  /** Empty = level 1 (overworld / homemap). [region] = level 2. [region, sub] = level 3. */
  const mapPath = useMemo(() => {
    if (!regionId) return []
    if (!locationId) return [regionId]
    return [regionId, locationId]
  }, [regionId, locationId])

  const toHome = () => '/'
  const toRegion = (id: string) => `/region/${encodeURIComponent(id)}`
  const toLocation = (rid: string, lid: string) => `/region/${encodeURIComponent(rid)}/${encodeURIComponent(lid)}`

  const base = import.meta.env.BASE_URL
  const startMapSrc = `${base}assets/img/homemap.png`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${base}assets/js/maps.json`)
        if (!res.ok) throw new Error(`maps.json HTTP ${res.status}`)
        const json = (await res.json()) as MapsData
        if (!cancelled) setMaps(json)
      } catch (e) {
        console.error(e)
        if (!cancelled) setMaps(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [base])

  useEffect(() => {
    const img = startImgRef.current
    if (!img) return

    const compute = () => {
      if (!img.naturalWidth || !img.naturalHeight) return
      if (!img.clientWidth || !img.clientHeight) return
      setImgScale({
        x: img.clientWidth / img.naturalWidth,
        y: img.clientHeight / img.naturalHeight,
      })
    }

    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  const selectedMapUrl = useMemo(() => {
    if (!maps) return null
    return resolveMapUrl(maps, mapPath, difficulty)
  }, [maps, mapPath, difficulty])

  // Reset pan/zoom when switching maps or difficulty.
  useEffect(() => {
    wheelFocusRef.current = null
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setDragging(false)
  }, [selectedMapUrl])

  /** After wheel zoom, correct pan in the same frame (before paint) so there is no one-frame “jump”. */
  useLayoutEffect(() => {
    const pending = wheelFocusRef.current
    if (!pending) return
    wheelFocusRef.current = null
    const img = viewerImgRef.current
    if (!img) return
    const r1 = img.getBoundingClientRect()
    if (r1.width < 1 || r1.height < 1) return
    const { u, v, clientX, clientY } = pending
    const errX = clientX - (r1.left + u * r1.width)
    const errY = clientY - (r1.top + v * r1.height)
    setPan((p) => ({ x: p.x + errX, y: p.y + errY }))
  }, [zoom])

  const applyWheelZoomToCursor = (e: WheelEvent) => {
    const img = viewerImgRef.current
    if (!img) return
    const r0 = img.getBoundingClientRect()
    if (r0.width < 1 || r0.height < 1) return

    const u = Math.min(1, Math.max(0, (e.clientX - r0.left) / r0.width))
    const v = Math.min(1, Math.max(0, (e.clientY - r0.top) / r0.height))

    const z0 = zoom
    let dy = e.deltaY
    if (e.deltaMode === 1) dy *= 16
    if (e.deltaMode === 2) dy *= 800
    // Exponential step: many small trackpad events accumulate smoothly; large mouse steps still feel continuous.
    const z1 = Math.min(6, Math.max(0.5, z0 * Math.exp(-dy * 0.0011)))
    if (Math.abs(z1 - z0) < 1e-5) return

    wheelFocusRef.current = { u, v, clientX: e.clientX, clientY: e.clientY }
    setZoom(z1)
  }

  // Pointer-based drag/pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
      setDragging(true)
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom }
      dragStartRef.current = null
      setDragging(false)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 1) {
      const start = dragStartRef.current
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      setPan({ x: start.panX + dx, y: start.panY + dy })
      return
    }

    if (pointersRef.current.size === 2) {
      const pinch = pinchRef.current
      if (!pinch) return
      const pts = Array.from(pointersRef.current.values())
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      const dist = Math.hypot(dx, dy)
      const ratio = dist / pinch.dist
      const next = Math.min(Math.max(pinch.zoom * ratio, 0.5), 6)
      setZoom(next)
    }
  }

  const onPointerUpOrCancel = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      dragStartRef.current = null
      setDragging(false)
    }
  }

  const viewerTitle = useMemo(() => titleForMapPath(mapPath), [mapPath])

  const inViewer = mapPath.length > 0
  const menuRegionTitle = inViewer ? viewerTitle : 'Overworld'

  const regions = useMemo(() => {
    if (!maps) return []
    return Object.keys(maps.regions).sort((a, b) => a.localeCompare(b))
  }, [maps])

  const currentRegionLocations = useMemo(() => {
    if (!maps) return []
    const regionId = mapPath[0]
    if (!regionId) return []
    const locs = maps.regions[regionId]?.locations
    if (!locs) return []
    return Object.keys(locs).sort((a, b) => a.localeCompare(b))
  }, [maps, mapPath])

  const goTo = (nextPath: string[]) => {
    if (nextPath.length === 0) {
      navigate('/')
      return
    }
    if (nextPath.length === 1) {
      navigate(toRegion(nextPath[0]))
      return
    }
    navigate(toLocation(nextPath[0], nextPath[1] ?? ''))
  }

  const menu = (
    <aside className={menuCollapsed ? 'tldMenu tldMenu--collapsed' : 'tldMenu'} aria-label="Navigation">
      <div className="tldMenu__header">
        <div className="tldMenu__headerText">
          <div className="tldMenu__title">{menuCollapsed ? 'TLD' : 'TLD Map'}</div>
          {!menuCollapsed && <div className="tldMenu__regionName">{menuRegionTitle}</div>}
        </div>
        <button
          type="button"
          className="tldMenu__toggle"
          onClick={() => setMenuCollapsed((v) => !v)}
          aria-pressed={menuCollapsed}
          title={menuCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {menuCollapsed ? '»' : '«'}
        </button>
      </div>

      {menuCollapsed && (
        <div className="tldMenu__collapsedRow">
          <Link className="tldMenu__homeCompact" to={toHome()} title="Home (overworld)">
            Home
          </Link>
        </div>
      )}

      {!menuCollapsed && (
        <>
          <div className="tldMenu__section">
            <div className="tldMenu__label">Navigation</div>
            <NavLink className={({ isActive }) => (isActive ? 'tldMenu__item active' : 'tldMenu__item')} to={toHome()}>
              Home
            </NavLink>
            {mapPath.length > 1 && (
              <NavLink
                className="tldMenu__item"
                to={mapPath.length === 2 ? toRegion(mapPath[0]) : toHome()}
              >
                Up one level
              </NavLink>
            )}
          </div>

          <div className="tldMenu__section">
            <div className="tldMenu__label">Difficulty</div>
            <div className="tldMenu__row">
              <button
                type="button"
                className={difficulty === 'pilgrim' ? 'tldMenu__pill active' : 'tldMenu__pill'}
                onClick={() => setDifficulty('pilgrim')}
              >
                Pilgrim
              </button>
              <button
                type="button"
                className={difficulty === 'interloper' ? 'tldMenu__pill active' : 'tldMenu__pill'}
                onClick={() => setDifficulty('interloper')}
              >
                Interloper
              </button>
            </div>
          </div>

          <div className="tldMenu__section">
            <div className="tldMenu__label">Regions</div>
            {regions.map((r) => (
              <NavLink
                key={r}
                className={({ isActive }) => (isActive ? 'tldMenu__item active' : 'tldMenu__item')}
                to={toRegion(r)}
              >
                {titleForMapPath([r])}
              </NavLink>
            ))}
          </div>

          {mapPath.length >= 1 && currentRegionLocations.length > 0 && (
            <div className="tldMenu__section">
              <div className="tldMenu__label">Inside {titleForMapPath([mapPath[0]])}</div>
              {currentRegionLocations.map((loc) => (
                <NavLink
                  key={loc}
                  className={({ isActive }) => (isActive ? 'tldMenu__item active' : 'tldMenu__item')}
                  to={toLocation(mapPath[0], loc)}
                >
                  {titleForMapPath([mapPath[0], loc])}
                </NavLink>
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  )

  if (inViewer) {
    return (
      <main className="tldLayout">
        {menu}
        <div className="tldMain">
          <section className="tld__viewer" aria-label="Map viewer">
            {selectedMapUrl ? (
              <div
                ref={viewerRef}
                className={[
                  dragging && !isDev ? 'tldViewer tldViewer--dragging' : 'tldViewer',
                  isDev ? 'tldViewer--dev' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onWheel={(e) => {
                  e.preventDefault()
                  applyWheelZoomToCursor(e)
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpOrCancel}
                onPointerCancel={onPointerUpOrCancel}
              >
                <img
                  ref={viewerImgRef}
                  src={selectedMapUrl}
                  alt={viewerTitle}
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                />
                {isDev && (
                  <LinkRectTool
                    imageRef={viewerImgRef}
                    mapPath={mapPath}
                    mapTitle={viewerTitle}
                    difficulty={difficulty}
                  />
                )}
              </div>
            ) : (
              <p className="tld__missing">No image URL in maps.json for this path and difficulty.</p>
            )}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="tldLayout">
      {menu}
      <div className="tldMain">
        <section
          className={isDev ? 'tld__start tld__start--dev' : 'tld__start'}
          aria-label="World map"
        >
          <img
            ref={startImgRef}
            src={startMapSrc}
            alt="Start Map"
            useMap={isDev ? undefined : '#map-links'}
            id="start-map-image"
            draggable={false}
            onLoad={() => {
              const img = startImgRef.current
              if (!img?.naturalWidth || !img?.naturalHeight) return
              if (!img.clientWidth || !img.clientHeight) return
              setImgScale({
                x: img.clientWidth / img.naturalWidth,
                y: img.clientHeight / img.naturalHeight,
              })
            }}
          />

          <map name="map-links">
            {AREAS.map((a) => (
              <area
                key={a.id}
                alt={a.title}
                title={a.title}
                href="#"
                shape="rect"
                coords={imgScale ? scaledCoords(a.coords, imgScale.x, imgScale.y) : a.coords.join(',')}
                onClick={(e) => {
                  e.preventDefault()
                  goTo([...a.path])
                }}
              />
            ))}
          </map>
          {isDev && (
            <LinkRectTool
              imageRef={startImgRef}
              mapPath={[]}
              mapTitle={titleForMapPath([])}
              difficulty={difficulty}
            />
          )}
        </section>
      </div>
    </main>
  )
}
