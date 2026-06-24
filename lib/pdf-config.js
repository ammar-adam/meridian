export function isServerPdfEnabled() {
  return process.env.MERIDIAN_ENABLE_SERVER_PDF === 'true'
}
