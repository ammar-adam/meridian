'use client'

import { useState } from 'react'
import { buildProofPacket, proofPacketToText } from '@/lib/proof-packet'

/**
 * Export proof packet as JSON download or clipboard text.
 */
export default function ProofPacketActions({ company, fundName = '', thesis = '', compact = false }) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!company?.name) return null

  async function copyPacket() {
    setBusy(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const packet = buildProofPacket(company, { origin, fundName, thesis })
      await navigator.clipboard.writeText(proofPacketToText(packet))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    } finally {
      setBusy(false)
    }
  }

  function downloadJson() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const packet = buildProofPacket(company, { origin, fundName, thesis })
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(company.name || 'company').replace(/\s+/g, '-').toLowerCase()}-proof.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? '' : 'mt-1'}`}>
      <button
        type="button"
        onClick={copyPacket}
        disabled={busy}
        className="m-btn-ghost m-btn-sm opacity-70 hover:opacity-100"
        title="Copy proof packet (source, first-seen, index checks)"
      >
        {copied ? 'Copied' : 'Proof'}
      </button>
      <button
        type="button"
        onClick={downloadJson}
        className="m-btn-ghost m-btn-sm opacity-60 hover:opacity-100"
        title="Download proof packet JSON"
      >
        JSON
      </button>
    </div>
  )
}
