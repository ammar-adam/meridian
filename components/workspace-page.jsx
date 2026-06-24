/**
 * Standard content wrapper for workspace views. Keeps padding and max-width consistent.
 */
export default function WorkspacePage({ children, width = 'default', className = '' }) {
  const widthClass = {
    narrow: 'm-page-narrow',
    default: 'm-page',
    medium: 'm-page-medium',
    wide: 'm-page-wide',
  }[width] ?? 'm-page'

  return <div className={`${widthClass} ${className}`.trim()}>{children}</div>
}

export function WorkspaceSection({ title, description, actions, children, className = '', bare = false }) {
  const body = bare ? children : <div className="m-card m-card-pad">{children}</div>

  return (
    <section className={`m-workspace-section ${className}`.trim()}>
      {(title || actions) && (
        <div className="m-workspace-section-header">
          <div>
            {title && <h2 className="m-workspace-section-title">{title}</h2>}
            {description && <p className="m-workspace-section-desc">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {body}
    </section>
  )
}
