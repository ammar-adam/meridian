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

function useFundContext(onChange) {
  const [funds, setFunds] = useState([])
  const [activeId, setActiveId] = useState('')
  const [strategyId, setStrategyId] = useState('')
  const [fund, setFund] = useState(null)

  useEffect(() => {
    function load() {
      ensureActiveFund()
      const list = getAllFunds()
      const active = getFundProfile()
      setFunds(list)
      setFund(active)
      setActiveId(active?.id || '')
      setStrategyId(active?.activeStrategyId || getActiveStrategy(active)?.id || '')
    }
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  function changeFirm(id) {
    if (!id) return
    setActiveFundId(id)
    const next = getFundProfile(id)
    setActiveId(id)
    setFund(next)
    setStrategyId(next?.activeStrategyId || getActiveStrategy(next)?.id || '')
    onChange?.()
    window.dispatchEvent(new Event('meridian-context-change'))
  }

  function changeVehicle(id) {
    if (!id) return
    setActiveStrategyId(id)
    setStrategyId(id)
    setFund(getFundProfile())
    onChange?.()
    window.dispatchEvent(new Event('meridian-context-change'))
  }

  return { funds, fund, activeId, strategyId, changeFirm, changeVehicle }
}

/** Firm + vehicle pickers — the mandate context for every workspace surface. */
export function FundSwitcher({ onChange, variant = 'bar' }) {
  const { funds, fund, activeId, strategyId, changeFirm, changeVehicle } = useFundContext(onChange)
  const strategies = fund?.strategies || []
  const dark = variant === 'sidebar'

  if (funds.length === 0) {
    return (
      <div className={dark ? 'space-y-2' : 'flex flex-wrap items-center gap-2'}>
        <span className="text-[12px]" style={{ color: dark ? 'rgba(255,255,255,0.45)' : 'var(--m-muted)' }}>
          No firm yet
        </span>
        <Link
          href="/fund/setup"
          className={dark ? 'text-[12px] font-medium text-white/80 hover:text-white' : 'm-btn-ghost m-btn-sm'}
        >
          + Add firm
        </Link>
      </div>
    )
  }

  const selectStyle = dark
    ? {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#f8fafc',
        width: '100%',
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
      }
    : undefined

  return (
    <div className={dark ? 'space-y-2.5' : 'flex flex-wrap items-end gap-3'}>
      <label className={dark ? 'block' : 'flex flex-col gap-1'}>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'var(--m-muted-2)' }}
        >
          Firm
        </span>
        <select
          value={activeId}
          onChange={(e) => changeFirm(e.target.value)}
          className={dark ? undefined : 'm-select m-context-select min-w-[180px]'}
          style={selectStyle}
          aria-label="Active firm"
        >
          {funds.map(f => (
            <option key={f.id} value={f.id}>{f.fundName}</option>
          ))}
        </select>
      </label>

      {strategies.length > 0 && (
        <label className={dark ? 'block' : 'flex flex-col gap-1'}>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'var(--m-muted-2)' }}
          >
            Investing from
          </span>
          <select
            value={strategyId || strategies[0]?.id}
            onChange={(e) => changeVehicle(e.target.value)}
            className={dark ? undefined : 'm-select m-context-select min-w-[160px]'}
            style={selectStyle}
            aria-label="Active fund vehicle"
            disabled={strategies.length === 1}
          >
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}

      {!dark && (
        <Link href="/fund/setup" className="m-btn-ghost m-btn-sm mb-0.5">
          + Add firm
        </Link>
      )}
    </div>
  )
}

export function StrategySwitcher() {
  // Folded into FundSwitcher — kept as no-op export for older imports.
  return null
}

export function ActiveContextLabel() {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function load() {
      const f = getFundProfile()
      const s = getActiveStrategy(f)
      if (!f) { setLabel('Select firm…'); return }
      setLabel(s && s.name !== 'Primary' ? `${f.fundName} · ${s.name}` : f.fundName)
    }
    load()
    window.addEventListener('meridian-context-change', load)
    return () => window.removeEventListener('meridian-context-change', load)
  }, [])

  if (!label) return null
  return <span className="truncate text-[11px]" style={{ color: 'var(--m-muted)' }}>{label}</span>
}
