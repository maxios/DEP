import onnxruntime from '../../../node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/libonnxruntime.so.1' with { type: 'file' }
import type { NativeLibrary } from '../native'

export default [{ name: 'libonnxruntime.so.1', source: onnxruntime }] satisfies NativeLibrary[]
