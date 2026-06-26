/** @deprecated Use runBatchJob from @/lib/batch-runner */
import { runBatchJob } from '@/lib/batch-runner'

export async function runBatchBrief({
  companies,
  fundProfile,
  sourceContext,
  onProgress,
  signal,
  forceRegenerate = false,
  researchMode = 'quick',
}) {
  return runBatchJob({
    companies,
    sourceContext,
    signal,
    forceRegenerate,
    researchMode,
    onProgress,
  })
}
