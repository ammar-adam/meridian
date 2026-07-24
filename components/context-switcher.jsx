'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  getAllFunds,
  getFundProfile,
  getActiveStrategy,
  setActiveFundId,
  setActiveStrategyId,
  ensureActiveFund,
} from '@/lib/fund-profile'

export function FundSwitcher({ onChange }) {
  const [funds, setFunds] = useState([])
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    function load() {
      ensureActiveFund()
      setFunds(getAllFunds())
      const active = getFundProfile()
      setActiveId(active?.id || '')
    }
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  function handleChange(e) {
    const id = e.target.value
    if (!id || id === '__add__') return
    setActiveFundId(id)
    setActiveId(id)
    onChange?.()
    window.dispatchEvent(new Event('meridian-context-change'))
  }

  const activeFund = funds.find(f => f.id === activeId)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {funds.length > 0 ? (
        <select value={activeId} onChange={handleChange} className="m-select m-context-select" aria-label="Active fund">
          {!activeId && <option value="">Select fund…</option>}
          {funds.map(f => (
            <option key={f.id} value={f.id}>{f.fundName}</option>
          ))}
        </select>
      ) : (
        <span className="text-[12px]" style={{ color: 'var(--m-muted)' }}>No fund yet</span>
      )}
      <Link href="/fund/setup" className="m-btn-ghost m-btn-sm">
        + Add fund
      </Link>
    </div>
  )
}

export function StrategySwitcher({ onChange }) {
  const [fund, setFund] = useState(null)
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    function load() {
      const f = getFundProfile()
      setFund(f)
      setActiveId(f?.activeStrategyId || '')
    }
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  if (!fund || fund.strategies.length <= 1) return null

  function handleChange(e) {
    const id = e.target.value
    setActiveStrategyId(id)
    setActiveId(id)
    onChange?.()
    window.dispatchEvent(new Event('meridian-context-change'))
  }

  return (
    <select value={activeId} onChange={handleChange} className="m-select m-context-select" aria-label="Active strategy">
      {fund.strategies.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  )
}

export function ActiveContextLabel() {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function load() {
      const f = getFundProfile()
      const s = getActiveStrategy(f)
      if (!f) { setLabel('Select fund…'); return }
      setLabel(s && s.name !== 'Primary' ? `${f.fundName} · ${s.name}` : f.fundName)
    }
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  if (!label) return null
  return <span className="truncate text-[11px]" style={{ color: 'var(--m-muted)' }}>{label}</span>
}
