import type { Difficulty } from './mapsTypes'

const MAX_AGE_SEC = 60 * 60 * 24 * 365
const DIFFICULTY = 'tldmap_difficulty'
const MENU_COLLAPSED = 'tldmap_menu_collapsed'
const OPEN_GROUPS = 'tldmap_open_menu_groups'

function get(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'),
  )
  return m ? decodeURIComponent(m[1]!) : null
}

function set(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`
}

export function readDifficultyFromCookie(): Difficulty {
  const v = get(DIFFICULTY)
  if (v === 'interloper' || v === 'pilgrim') return v
  return 'pilgrim'
}

export function writeDifficultyToCookie(d: Difficulty) {
  set(DIFFICULTY, d)
}

export function readMenuCollapsedFromCookie(): boolean {
  const v = get(MENU_COLLAPSED)
  return v === '1' || v === 'true'
}

export function writeMenuCollapsedToCookie(collapsed: boolean) {
  set(MENU_COLLAPSED, collapsed ? '1' : '0')
}

export function readOpenMenuGroupsFromCookie(): Set<string> {
  const v = get(OPEN_GROUPS)
  if (!v) return new Set()
  try {
    const arr = JSON.parse(v) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function writeOpenMenuGroupsToCookie(ids: Set<string>) {
  set(OPEN_GROUPS, JSON.stringify([...ids].sort()))
}
