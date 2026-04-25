import { useEffect, useMemo, useRef, useState } from 'react'
import type { Difficulty, MapsData } from './mapsTypes'
import { resolveMapUrl } from './mapsTypes'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'

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

export function StartMapPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('pilgrim')
  const [maps, setMaps] = useState<MapsData | null>(null)
  const [menuCollapsed, setMenuCollapsed] = useState(false)
  const [imgScale, setImgScale] = useState<{ x: number; y: number } | null>(null)
  const startImgRef = useRef<HTMLImageElement | null>(null)
  const navigate = useNavigate()
  const { regionId, locationId } = useParams()
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

  const viewerTitle = useMemo(() => titleForMapPath(mapPath), [mapPath])

  const inViewer = mapPath.length > 0

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
        <div className="tldMenu__title">{menuCollapsed ? 'TLD' : 'TLD Map'}</div>
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
          <header className="tld__topbar">
            <div className="tld__nav">
              <div className="tld__breadcrumb" title={mapPath.join(' / ')}>
                <span className="tld__bc-muted">TLD</span>
                <span className="tld__bc-sep"> / </span>
                <span>{viewerTitle}</span>
              </div>
            </div>
            {mapPath.length > 1 && (
              <div className="tld__row">
                <Link className="tld__back" to={toRegion(mapPath[0])}>
                  Up
                </Link>
              </div>
            )}
          </header>

          <section className="tld__viewer" aria-label="Map viewer">
            {selectedMapUrl ? (
              <img src={selectedMapUrl} alt={viewerTitle} draggable={false} />
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
        <header className="tld__topbar">
          <div className="tld__nav">
            <div className="tld__breadcrumb">
              <span className="tld__bc-muted">TLD</span>
              <span className="tld__bc-sep"> / </span>
              <span>Overworld</span>
            </div>
          </div>
        </header>

        <section className="tld__start" aria-label="World map">
          <img
            ref={startImgRef}
            src={startMapSrc}
            alt="Start Map"
            useMap="#map-links"
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
        </section>
      </div>
    </main>
  )
}
