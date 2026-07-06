import fs from 'fs'
import path from 'path'
import { populateTemplate } from './populate-template'
import { normalizeMemoTemplateId } from './memo-template'

export { populateTemplate } from './populate-template'

export function renderMemo(data, templateId = 'default') {
  const id = normalizeMemoTemplateId(templateId)
  const templatePath = path.join(process.cwd(), 'public', 'templates', `${id}.html`)
  const html = fs.readFileSync(templatePath, 'utf-8')
  return populateTemplate(html, data)
}
