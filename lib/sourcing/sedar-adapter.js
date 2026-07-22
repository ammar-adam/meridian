/**
 * SEDAR+ adapter — Canadian exempt distribution / early filings.
 *
 * TODO: SEDAR+ (Canadian Securities Administrators) does not offer a stable
 * public bulk API comparable to SEC EDGAR. Access typically requires a paid
 * data vendor or CSA/SEDAR+ account. Do NOT invent or scrape fake Canadian
 * filings. Wire a real client here once credentials / licensed feed exist.
 *
 * @returns {Promise<{ entities: object[], skipped: true, reason: string }>}
 */
export async function runSedarAdapter() {
  return {
    entities: [],
    skipped: true,
    reason: 'SEDAR+ API access pending',
  }
}
