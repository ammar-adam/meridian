export const MEMO_TEMPLATE_IDS = ['default', 'compact']

export const MEMO_TEMPLATE_OPTIONS = [
  { id: 'default', label: 'Standard', description: 'Visual one-pager with hero image' },
  { id: 'compact', label: 'Compact', description: 'Text-forward layout, denser sections, no hero image' },
]

export function normalizeMemoTemplateId(templateId) {
  return MEMO_TEMPLATE_IDS.includes(templateId) ? templateId : 'default'
}

export function memoTemplatePath(templateId = 'default') {
  const id = normalizeMemoTemplateId(templateId)
  return `/templates/${id}.html`
}

export function resolveMemoTemplateId(profile) {
  return normalizeMemoTemplateId(profile?.memoTemplateId)
}
