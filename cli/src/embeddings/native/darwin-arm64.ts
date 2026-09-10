import onnxruntime from '../../../node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/libonnxruntime.1.21.0.dylib' with { type: 'file' }
import type { NativeLibrary } from '../native'

export default [{ name: 'libonnxruntime.1.21.0.dylib', source: onnxruntime }] satisfies NativeLibrary[]
