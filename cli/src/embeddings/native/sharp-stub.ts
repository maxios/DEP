// Stands in for `sharp` inside the standalone binary.
//
// `@huggingface/transformers` imports sharp unconditionally for its image
// pipelines, but sharp ships a native libvips build per platform that cannot
// be embedded in a cross-compiled executable. DEP only embeds text, so the
// bundle swaps sharp for this stub (see scripts/build.ts); transformers only
// requires the import to be truthy at load time.
export default function sharp(): never {
  throw new Error('Image processing is not available in the dep binary: sharp is not bundled.')
}
