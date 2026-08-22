/** `versionDiagnostic.ts`, `cleanupPanel.ts` — les versions relevées et ce qu'elles changent. */
const versions = {
  'versions.publishedCount': {
    one: '{count} version publiée',
    other: '{count} versions publiées'
  }
} as const

export default versions

export type FrenchVersions = typeof versions
