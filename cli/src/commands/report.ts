import { openDocumentationSet } from '../lib'
import { DepError } from '../context/errors'

export interface ReportFlags {
  used?: string | boolean
  json?: boolean
}

/**
 * Report which passages of an earlier answer were actually used. The request
 * is found in the record of answered requests, so this works from a different
 * run than the one that produced the bundle.
 */
export async function reportCommand(root: string, bundleId: string, flags: ReportFlags) {
  if (typeof flags.used !== 'string') {
    throw new DepError('INVALID_OPTION', 'pass --used with the passage ids you used, comma separated; --used "" reports that none were', { used: flags.used })
  }
  const used = flags.used.split(',').map((id) => id.trim()).filter(Boolean)
  const set = openDocumentationSet(root, { caller: 'cli:report' })
  try {
    const receipt = set.recordUsage(bundleId, used)
    if (flags.json) {
      console.log(JSON.stringify(receipt, null, 2))
    } else if (receipt.recorded) {
      console.log(`Recorded: ${receipt.used} of ${receipt.offered} offered passages were used.`)
    } else {
      console.log(`Not recorded: ${receipt.reason ?? 'the record could not be written'}`)
    }
  } finally {
    set.close()
  }
}
