'use client'

import { useEffect, useState } from 'react'
import {
  getAllFunds,
  getFundProfile,
  getActiveStrategy,
  setActiveFundId,
  setActiveStrategyId,
} from '@/lib/fund-profile'

export function FundSwitcher({ onChange }) {
  const [funds, setFunds] = useState([])
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const all = getAllFunds()
    const active = getFundProfile()
    setFunds(all)
    setActiveId(active?.id || '')
  }, [])

  if (funds.length <= 1) return null

  function handleChange(e) {
    const id = e.target.value
    setActiveFundId(id)
    setActiveId(id)
    onChange?.()
    window.dispatchEvent(new Event('meridian-context-change'))
  }

  return (
    <select value={activeId} onChange={handleChange} className="m-select m-context-select" aria-label="Active fund">
      {funds.map(f => (
        <option key={f.id} value={f.id}>{f.fundName}</option>
      ))}
    </select>
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
      if (!f) { setLabel(''); return }
      setLabel(s && s.name !== 'Primary' ? `${f.fundName} · ${s.name}` : f.fundName)
    }
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  if (!label) return null
  return <span className="truncate text-[11px] text-zinc-500">{label}</span>
}
