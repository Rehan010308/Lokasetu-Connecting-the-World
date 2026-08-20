import type { CSSProperties } from 'react';

/**
 * Inline CSS custom properties, typed.
 *
 * React's `CSSProperties` has no index signature, so `style={{ '--hue': 210 }}`
 * is a type error even though it is exactly what the DOM wants. Rather than
 * scatter `as any` through the components, the cast lives here once, named, with
 * the reason attached.
 *
 * Used for the per-person avatar colour and the per-category chip tint — values
 * that are computed at runtime and therefore cannot live in the stylesheet.
 */
export function vars(input: Record<string, string | number>): CSSProperties {
  return input as unknown as CSSProperties;
}

/** The same, merged with ordinary style properties. */
export function styleWith(base: CSSProperties, custom: Record<string, string | number>): CSSProperties {
  return { ...base, ...(custom as unknown as CSSProperties) };
}
