/**
 * Build identity.
 *
 * Exists because "which build am I actually running?" turned into a guessing
 * game: Windows saves repeated downloads as lokasetu.zip, lokasetu (1).zip,
 * lokasetu (2).zip, so an extract command naming the plain file quietly kept
 * unpacking the oldest one. The version is printed in the app so the answer is
 * visible instead of inferred.
 */
export const VERSION = '4.1.5';
export const BUILD = 'multi-city · desktop deck · earnings · vercel-ready';
