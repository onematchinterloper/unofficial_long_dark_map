export type Difficulty = 'pilgrim' | 'interloper'

export type MapImages = {
  [K in Difficulty]?: string
}

export type SubLocation = {
  /** Display name in the UI (sidebar, header, dev tools) */
  title?: string
  map: MapImages
}

export type RegionNode = {
  /** Display name in the UI (sidebar, header) */
  title?: string
  map: MapImages
  /** Level 3: POIs / interiors / sub-maps that belong to this region */
  locations?: Record<string, SubLocation>
}

export type MapsData = {
  version: number
  /** Level 1: whole island / Great Bear (optional URLs if you use JSON for overworld) */
  overworld: { map: MapImages; title?: string }
  /** Level 2: named regions. Some entries may have `locations` for level 3 */
  regions: Record<string, RegionNode>
  /** Transitional / connector maps (caves, ravines, highway segments, etc.) */
  transitions: Record<string, RegionNode>
}

/** Resolves a level-2 or level-3 map node: regions first, then transitions (ids do not overlap). */
export function getRegionNode(data: MapsData, id: string): RegionNode | undefined {
  return data.regions[id] ?? data.transitions[id]
}

export function resolveMapUrl(
  data: MapsData,
  path: string[],
  difficulty: Difficulty,
): string | null {
  if (path.length === 0) {
    return data.overworld.map[difficulty] ?? null
  }
  if (path.length === 1) {
    return getRegionNode(data, path[0])?.map[difficulty] ?? null
  }
  if (path.length === 2) {
    return getRegionNode(data, path[0])?.locations?.[path[1]]?.map[difficulty] ?? null
  }
  return null
}
