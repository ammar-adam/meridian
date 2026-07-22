import { proofPacketToText } from '@/lib/proof-packet'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Render proof packet as printable HTML for PDF generation. */
export function renderProofHtml(packet) {
  const p = packet || {}
  const checks = (p.indexChecks || [])
    .map(c => `<tr><td>${esc(c.index)}</td><td>${c.present === false ? 'miss' : c.present === true ? 'present' : '?'}</td><td>${esc(String(c.checkedAt || '').slice(0, 10))}</td></tr>`)
    .join('')

  const body = `
    <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 40px; color: #18181b;">
      <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #71717a; margin: 0 0 8px;">Meridian proof packet</p>
      <h1 style="font-size: 28px; margin: 0 0 4px;">${esc(p.company?.name)}</h1>
      <p style="color: #52525b; margin: 0 0 24px;">${esc(p.company?.domain || '')}${p.generatedAt ? ` · ${esc(String(p.generatedAt).slice(0, 10))}` : ''}</p>

      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a;">Provenance</h2>
        <p style="line-height: 1.6;">${esc(p.provenance?.provenance || p.provenance?.source || '—')}</p>
        ${p.provenance?.firstSeen ? `<p><strong>First seen:</strong> ${esc(p.provenance.firstSeen)}</p>` : ''}
      </section>

      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a;">Coverage</h2>
        <p style="line-height: 1.6;">${esc(p.coverage?.label || p.verification?.label || 'Coverage unknown')}</p>
        ${p.coverage?.detail ? `<p style="color: #52525b;">${esc(p.coverage.detail)}</p>` : ''}
      </section>

      ${checks ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a;">Index checks</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead><tr style="border-bottom: 1px solid #e4e4e7;"><th align="left">Index</th><th align="left">Result</th><th align="left">Date</th></tr></thead>
          <tbody>${checks}</tbody>
        </table>
      </section>` : ''}

      ${p.reach?.directReach || p.reach?.primaryEmail ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a;">Reach</h2>
        ${p.reach.primaryEmail ? `<p>Email: ${esc(p.reach.primaryEmail)}</p>` : ''}
        ${p.reach.primaryLinkedIn ? `<p>LinkedIn: ${esc(p.reach.primaryLinkedIn)}</p>` : ''}
      </section>` : ''}

      <section style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #71717a; white-space: pre-wrap;">${esc(proofPacketToText(p))}</section>
    </div>
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 16mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${body}</body>
</html>`
}
