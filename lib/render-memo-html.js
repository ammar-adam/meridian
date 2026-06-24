import fs from 'fs/promises'
import path from 'path'
import { populateTemplate } from '@/lib/populate-template'

export async function renderMemoHtml(memoData) {
  const templatePath = path.join(process.cwd(), 'public', 'memo-template.html')
  const template = await fs.readFile(templatePath, 'utf8')
  const body = populateTemplate(template, memoData)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${body}</body>
</html>`
}
