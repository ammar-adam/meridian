import fs from 'fs'
import path from 'path'
import { populateTemplate } from './populate-template'

export { populateTemplate } from './populate-template'

export function renderMemo(data) {
  const templatePath = path.join(process.cwd(), 'public', 'memo-template.html')
  const html = fs.readFileSync(templatePath, 'utf-8')
  return populateTemplate(html, data)
}
