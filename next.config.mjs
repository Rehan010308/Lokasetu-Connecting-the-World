/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * ESLint is not a build gate here.
   *
   * The project ships no eslint config, so a production build would be judged
   * against Next's defaults — rules nobody on this project chose. Correctness is
   * enforced by `npm run typecheck`, the assertions in `npm test`, and
   * `npm run ssr`, which renders every route the way the build does.
   */
  eslint: { ignoreDuringBuilds: true },

  /**
   * TypeScript errors DO stop the deploy. That gate stays on deliberately: a
   * skipped type error is how a null reaches a `.length` six months later.
   */

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
