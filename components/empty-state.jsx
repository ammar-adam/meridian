import Link from 'next/link'

/**
 * Consistent empty states with connected next-step actions across workspace pages.
 */
export default function EmptyState({
  title,
  description,
  primaryHref,
  primaryLabel,
  onPrimary,
  secondaryHref,
  secondaryLabel,
  steps,
}) {
  return (
    <div className="m-empty-state">
      {title && <h2 className="m-empty-state-title">{title}</h2>}
      {description && <p className="m-empty-state-desc">{description}</p>}

      {(primaryHref || onPrimary || secondaryHref) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onPrimary && primaryLabel && (
            <button type="button" onClick={onPrimary} className="m-btn-primary">
              {primaryLabel}
            </button>
          )}
          {!onPrimary && primaryHref && (
            <Link href={primaryHref} className="m-btn-primary">
              {primaryLabel}
            </Link>
          )}
          {secondaryHref && (
            <Link href={secondaryHref} className="m-btn-secondary">
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}

      {steps?.length > 0 && (
        <ol className="m-empty-state-steps">
          {steps.map((step, i) => (
            <li key={step.label}>
              <span className="m-empty-state-step-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="font-medium">{step.label}</div>
                {step.desc && <div className="mt-0.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>{step.desc}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
