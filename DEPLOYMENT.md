# Deploy Greener to Vercel

This project uses Next.js, Node.js 22 and pnpm 12.3.4. `vercel.json` pins the
install and build commands to pnpm; `pnpm-lock.yaml` is the authoritative lockfile.
The legacy npm lockfile is not used for deployment. Production uses the Next.js
Webpack builder, verified locally because Turbopack workers cannot bind ports in
this workspace. Inter is bundled in `app/fonts` with its SIL license; builds do
not download fonts from Google.

## Before deployment

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

Copy `.env.example` to `.env.local` for local development and fill in the actual
values. Keep `.env.local` out of Git.

## Deploy from GitHub

1. Commit and push the application files, including the new routes, services,
   images, font files, tests, and deployment configuration, to the GitHub
   repository connected to your Greener deployment.
2. In Vercel, choose **Add New → Project**, import that repository, select the
   **Next.js** preset, and leave the root directory at the repository root.
3. Add these environment variables for Production and Preview, using the values
   from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Install and build commands come from `vercel.json`; leave the output
   directory at its Next.js default.

Use the Supabase anon key, not a service-role key, for the public variable.
Environment changes require a new deployment because Next.js embeds public
variables during the build.

## Configure Supabase after Vercel assigns the domain

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to `https://YOUR-PROJECT.vercel.app` (or your production domain).
- Add `https://YOUR-PROJECT.vercel.app/auth/callback` to **Redirect URLs**.
- Keep `http://localhost:3000/auth/callback` if you develop locally.
- Add the exact preview callback URL when testing signup on a preview deployment.

Check login, signup/email confirmation, logout, dashboard loading, mobile map
stacking, readings pagination, and CSV export on the deployed URL.

## Deploy from the CLI instead

```sh
corepack pnpm dlx vercel login
corepack pnpm dlx vercel link
corepack pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL production
corepack pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
corepack pnpm dlx vercel --prod
```

Enter variable values at the prompts; do not paste credentials into committed
files or command arguments.

References: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build),
[Vercel environment variables](https://vercel.com/docs/environment-variables),
[Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
