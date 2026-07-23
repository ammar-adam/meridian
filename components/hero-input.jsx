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
    if (!text) {
      router.push('/brief')
      return
    }

    const intake = parseIntakeText(text)

    if (intake.kind === 'company_url' || intake.kind === 'company_urls') {
      const url = intake.companyUrls?.[0]
      if (url) {
        router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
        return
      }
    }

    if (intake.kind === 'fund_url') {
      sessionStorage.setItem('meridian_setup_url', intake.fundUrl)
      if (intake.fundName) sessionStorage.setItem('meridian_setup_name', intake.fundName)
      router.push('/fund/setup')
      return
    }

    if (intake.kind === 'pipeline' && intake.pipeline?.length) {
      importPipelineContacts(intake.pipeline)
      const first = intake.pipeline.find(c => c.url || c.domain)
      if (first) {
        const url = first.url || `https://${first.domain}`
        router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
        return
      }
    }

    if (intake.kind === 'thesis') {
      setPendingThesis(text, true)
      if (!hasFundProfile()) {
        router.push('/fund/setup?next=' + encodeURIComponent('/flow'))
        return
      }
      router.push('/flow')
      return
    }

    router.push(`/brief?url=${encodeURIComponent(text)}&autogen=1`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    routeInput(value)
  }

  async function handleIntake(payload) {
    if (payload.kind === 'company_url' || payload.kind === 'company_urls') {
      const url = payload.companyUrls?.[0]
      if (url) router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
      return
    }
    if (payload.kind === 'fund_url') {
      sessionStorage.setItem('meridian_setup_url', payload.fundUrl)
      if (payload.fundName) sessionStorage.setItem('meridian_setup_name', payload.fundName)
      router.push('/fund/setup')
      return
    }
    if (payload.kind === 'pipeline' && payload.pipeline?.length) {
      importPipelineContacts(payload.pipeline)
      const first = payload.pipeline.find(c => c.url || c.domain)
      if (first) {
        const url = first.url || `https://${first.domain}`
        router.push(`/brief?url=${encodeURIComponent(url)}&autogen=1`)
      }
      return
    }
    if (payload.kind === 'thesis') {
      setPendingThesis(payload.thesis, true)
      if (!hasFundProfile()) {
        router.push('/fund/setup?next=' + encodeURIComponent('/flow'))
        return
      }
      router.push('/flow')
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
        <button type="submit" className={isLanding ? 'm-btn-glow shrink-0' : 'm-btn-primary shrink-0 px-6'}>
          Generate brief
        </button>
      </form>
      {isLanding && (
        <IntakeDropzone
          compact
          onIntake={handleIntake}
          hint="Drop company URL, contacts, or fund website"
          className="border-slate-200 bg-white hover:border-indigo-200 [&_p]:text-slate-500"
        />
      )}
    </div>
  )
}
