const KEY = 'meridian_team'

export function getTeamContext() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function setTeamContext(ctx) {
  if (!ctx) {
    localStorage.removeItem(KEY)
  } else {
    localStorage.setItem(KEY, JSON.stringify(ctx))
  }
  window.dispatchEvent(new Event('meridian-team-change'))
}

export function clearTeamContext() {
  setTeamContext(null)
}

export function hasTeam() {
  return Boolean(getTeamContext()?.teamId)
}
