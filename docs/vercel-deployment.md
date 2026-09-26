# Deploy OmniCore frontend to Vercel

The Next.js frontend lives in `apps/web` in a pnpm monorepo. The NestJS API and PostgreSQL database are **not** deployed by this Vercel frontend project.

1. In Vercel, choose **Add New → Project** and import `franklinajithan/omnicore-retail-platform`.
2. Select the `feat/catalog-foundation` branch for an initial preview, or merge the PR into `main` before a production deployment.
3. Set **Root Directory** to `apps/web`; framework preset **Next.js**.
4. Use **Install Command** `pnpm install --no-frozen-lockfile` (repository currently has no committed lockfile), **Build Command** `pnpm build`, and leave the output directory at the Next.js default.
5. Deploy. The catalogue currently runs as an in-browser demo: data is not persisted, and the NestJS API/database are separate deployment milestones.

Do not add a production API URL or credentials until a deployed, authenticated backend exists. Keep the existing GitHub CI regression suite enabled.
