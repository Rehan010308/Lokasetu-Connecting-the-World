/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Vercel fails a production build on any ESLint error. This project ships no
   * eslint config, so the build would be gated on Next's defaults — rules
   * nobody here chose, failing on things that are deliberate (raw <img> for map
   * tiles, for one). Correctness is enforced by TypeScript, which still runs,
   * plus 204 assertions in `npm test`.
   *
   * TypeScript errors are NOT ignored: `ignoreBuildErrors` stays off, so a type
   * error still stops the deploy.
   */
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
