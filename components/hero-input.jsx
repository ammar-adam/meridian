'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasFundProfile } from '@/lib/fund-profile'
import { setPendingThesis } from '@/lib/source-session'
import { importPipelineContacts } from '@/lib/pipeline-contacts'
import { parseIntakeText } from '@/lib/intake-parser'
import IntakeDropzone from '@/components/intake-dropzone'

export default function HeroInput({ variant = 'default' }) {
  const [value, setValue] = useState('')
  const router = useRouter()
  const isLanding = variant === 'landing'

  function routeInput(raw) {
    const text = raw?.trim()
    const go = (path) => {
      // Landing: hard navigate so submit is never swallowed during Clerk hydration.
      if (isLanding && typeof window !== 'undefined') {
        window.location.assign(path)
        return
      }
      router.push(path)
    }

    if (!text) {
      go('/brief')
      return
    }

    const intake = parseIntakeText(text)

    if (intake.kind === 'company_url' || intake.kind === 'company_urls') {
      const url = intake.companyUrls?.[0]
      if (url) {
        go(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
        return
      }
    }

    if (intake.kind === 'fund_url') {
      sessionStorage.setItem('meridian_setup_url', intake.fundUrl)
      if (intake.fundName) sessionStorage.setItem('meridian_setup_name', intake.fundName)
      go('/fund/setup')
      return
    }

    if (intake.kind === 'pipeline' && intake.pipeline?.length) {
      importPipelineContacts(intake.pipeline)
      const first = intake.pipeline.find(c => c.url || c.domain)
      if (first) {
        const url = first.url || `https://${first.domain}`
        go(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
        return
      }
    }

    if (intake.kind === 'thesis') {
      setPendingThesis(text, true)
      if (!hasFundProfile()) {
        go('/fund/setup?next=' + encodeURIComponent('/flow'))
        return
      }
      go('/flow')
      return
    }

    go(`/brief?url=${encodeURIComponent(text)}&autogen=1`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    routeInput(value)
  }

  async function handleIntake(payload) {
    const go = (path) => {
      if (isLanding && typeof window !== 'undefined') {
        window.location.assign(path)
        return
      }
      router.push(path)
    }

    if (payload.kind === 'company_url' || payload.kind === 'company_urls') {
      const url = payload.companyUrls?.[0]
      if (url) go(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
      return
    }
    if (payload.kind === 'fund_url') {
      sessionStorage.setItem('meridian_setup_url', payload.fundUrl)
      if (payload.fundName) sessionStorage.setItem('meridian_setup_name', payload.fundName)
      go('/fund/setup')
      return
    }
    if (payload.kind === 'pipeline' && payload.pipeline?.length) {
      importPipelineContacts(payload.pipeline)
      const first = payload.pipeline.find(c => c.url || c.domain)
      if (first) {
        const url = first.url || `https://${first.domain}`
        go(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
      }
      return
    }
    if (payload.kind === 'thesis') {
      setPendingThesis(payload.thesis, true)
      if (!hasFundProfile()) {
        go('/fund/setup?next=' + encodeURIComponent('/flow'))
        return
      }
      go('/flow')
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="company.com"
          className={isLanding ? 'm-input-landing flex-1' : 'm-input flex-1'}
        />
        <button type="submit" className="m-btn-primary shrink-0 px-6">
          Generate brief
        </button>
      </form>
      {isLanding && (
        <IntakeDropzone
          compact
          variant="landing"
          onIntake={handleIntake}
          hint="Drop company URL, contacts, or fund website"
        />
      )}
    </div>
  )
}
