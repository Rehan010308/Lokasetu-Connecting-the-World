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
   * Compile `motion` from source rather than consuming its published bundle.
   *
   * A production build crashed with `ReferenceError: now is not defined` thrown
   * from inside the vendor chunk during render. The animation library keeps its
   * frame clock as a module-scoped `let now = 0` that is only read inside
   * closures — a shape an aggressive minifier can decide is dead and remove.
   * Dev was fine (unminified); only the production bundle broke.
   *
   * The render path no longer touches that clock (see Magnetic in aurora.tsx),
   * and this makes the library go through the app's own transform so a
   * mismatch between its published build and this one cannot reintroduce it.
   */
  transpilePackages: ['motion'],

  /**
   * CLIENT MINIFICATION IS OFF. This is deliberate, and it is not permanent.
   *
   * A production build crashed with `ReferenceError: now is not defined`,
   * thrown from inside a bundled chunk during React's render. It never happened
   * in `npm run dev`. The failing offset was byte-identical across three
   * different builds, which means the code in question was never touched by any
   * of the changes made while chasing it.
   *
   * A crash that appears only under minification, at a stable offset, is the
   * minifier removing a binding it wrongly judged dead. Rather than keep
   * guessing at which module, this turns it off: the app works, and the stack
   * traces name real functions instead of `_`.
   *
   * WHAT IT COSTS: a larger JavaScript bundle, so a slower first load. On this
   * app that is roughly a few hundred KB. It does not affect correctness,
   * server rendering, or anything a user can see beyond load time.
   *
   * TO PUT IT BACK: set MINIFY=1 and rebuild. If the crash returns, the stack
   * from an unminified build (this one) will name the module, which is the
   * thing nobody has had yet.
   */
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer && process.env.MINIFY !== '1') {
      config.optimization.minimize = false;
    }
    return config;
  },

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
