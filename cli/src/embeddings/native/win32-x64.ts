import directml from '../../../node_modules/onnxruntime-node/bin/napi-v3/win32/x64/DirectML.dll' with { type: 'file' }
import onnxruntime from '../../../node_modules/onnxruntime-node/bin/napi-v3/win32/x64/onnxruntime.dll' with { type: 'file' }
import type { NativeLibrary } from '../native'

/**
 * onnxruntime.dll on Windows is built with the DirectML execution provider and
 * imports DirectML.dll at load time. Windows resolves imports against modules
 * already in the process before it searches directories, so loading DirectML
 * first lets onnxruntime load from a directory that is on no search path.
 */
export default [
  { name: 'DirectML.dll', source: directml, symbol: 'DMLCreateDevice' },
  { name: 'onnxruntime.dll', source: onnxruntime },
] satisfies NativeLibrary[]
