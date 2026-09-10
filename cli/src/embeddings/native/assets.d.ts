// Native shared libraries embedded into the standalone binary via `with { type: 'file' }`.
// Each import resolves to a filesystem path: the real file when running from source,
// a `/$bunfs/...` virtual path inside a compiled executable.
declare module '*.dylib' {
  const path: string
  export default path
}
declare module '*.so' {
  const path: string
  export default path
}
declare module '*.so.1' {
  const path: string
  export default path
}
