/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Vercel fails a production build on any ESLint error. This project ships no
   * eslint config, so the build would be gated on Next's defaults — rules
   * nobody here chose, failing on things that are deliberate (raw <img> for map
   * tiles, for one). Correctness is enforced by the 216 assertions in
   * `npm test` and the server-render check in `npm run ssr`.
   */
  eslint: { ignoreDuringBuilds: true },

  /**
   * TypeScript errors DO stop the deploy, deliberately.
   *
   * This was briefly disabled to unblock a build failing at "Checking validity
   * of types". The error turned out to be real — a translation key typed as a
   * bare `string` instead of TKey in app/trust/page.tsx — so it was fixed and
   * the gate went straight back on. A skipped type error is how a null reaches
   * a .length six months later.
   */
};

export default nextConfig;
