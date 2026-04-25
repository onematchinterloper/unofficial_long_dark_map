export type Difficulty = 'pilgrim' | 'interloper'

export type MapImages = {
  [K in Difficulty]?: string
}

export type SubLocation = {
  map: MapImages
}

export type RegionNode = {
  map: MapImages
  /** Level 3: POIs / interiors / sub-maps that belong to this region */
  locations?: Record<string, SubLocation>
}

export type MapsData = {
  version: number
  /** Level 1: whole island / Great Bear (optional URLs if you use JSON for overworld) */
  overworld: { map: MapImages }
  /** Level 2: named regions. Some entries may have `locations` for level 3 */
  regions: Record<string, RegionNode>
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
    return data.regions[path[0]]?.map[difficulty] ?? null
  }
  if (path.length === 2) {
    return data.regions[path[0]]?.locations?.[path[1]]?.map[difficulty] ?? null
  }
  return null
}
