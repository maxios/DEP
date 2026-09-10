import onnxruntime from '../../../node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1' with { type: 'file' }
import providersShared from '../../../node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_shared.so' with { type: 'file' }
import type { NativeLibrary } from '../native'

// The providers shim is only dlopen'ed by onnxruntime itself when a non-CPU
// execution provider is requested, so it is materialised but never preloaded.
export default [
  { name: 'libonnxruntime.so.1', source: onnxruntime },
  { name: 'libonnxruntime_providers_shared.so', source: providersShared, preload: false },
] satisfies NativeLibrary[]
