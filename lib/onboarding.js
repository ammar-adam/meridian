const KEY = 'meridian_onboarding'

const DEFAULT = {
  completedWelcome: false,
  sawDemo: false,
  firstBriefAt: null,
  dismissedFundPrompt: false,
  briefCount: 0,
}

export function getOnboardingState() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT }
  }
}

export function patchOnboarding(patch) {
  const next = { ...getOnboardingState(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('meridian-onboarding-change'))
  }
  return next
}

export function markWelcomeDone() {
  return patchOnboarding({ completedWelcome: true })
}

export function markDemoSeen() {
  return patchOnboarding({ sawDemo: true })
}

export function incrementBriefCount() {
  const state = getOnboardingState()
  const briefCount = (state.briefCount || 0) + 1
  return patchOnboarding({
    briefCount,
    firstBriefAt: state.firstBriefAt || new Date().toISOString(),
  })
}

export function shouldShowFundPrompt() {
  const s = getOnboardingState()
  return s.briefCount >= 1 && !s.dismissedFundPrompt
}

export function dismissFundPrompt() {
  return patchOnboarding({ dismissedFundPrompt: true })
}

export function needsWelcome() {
  return !getOnboardingState().completedWelcome
}
