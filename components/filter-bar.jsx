export default function FilterBar({ filters, trailing }) {
  return (
    <div className="m-toolbar">
      {filters.map(f => (
        <div key={f.label} className="m-filter-group">
          <span className="m-filter-label">{f.label}</span>
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="m-select !w-auto py-1"
          >
            <option value="all">All</option>
            {f.options.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      ))}
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  )
}
