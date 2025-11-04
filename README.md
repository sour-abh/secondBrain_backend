# secondBrain backend — Vercel deployment

This project exposes an Express API (routes under `/app/v1`) and is configured to run on Vercel Serverless Functions.

Summary of changes for Vercel
- `api/index.ts` — serverless wrapper that exports the existing Express app using `serverless-http` and uses a cached MongoDB connection pattern.
- `vercel.json` — minimal build config for the `api` functions.
- `.gitignore` — added `.env` and build artifacts.

Environment variables (set these in Vercel dashboard -> Project -> Settings -> Environment Variables):
- `DB_CONNECT` — MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster/.../dbname`).
- `JWT_SECRET` — secret used for signing JWTs.
- `FRONTEND_URL` — URL of your frontend (used for CORS), e.g. `https://your-frontend.vercel.app`.

Note: `PORT` is not required for serverless functions.

How to deploy
1. Push the repository to GitHub (or a Git provider) and connect the repo in the Vercel dashboard.
2. Add the environment variables above in Vercel Project Settings.
3. Deploy — Vercel will detect the `api/` folder and deploy serverless functions.

How the frontend should call the API
- Use the backend base URL from Vercel, e.g. `https://<your-backend>.vercel.app/app/v1/...`.
- In your frontend, store the base URL in an environment variable (for Vite: `VITE_API_BASE`) and use it in requests.

Local verification

1) Install deps and build (PowerShell / bash):
```
npm install
npm run build
```

2) Local dev server (original Express server for quick dev):
```
npm run dev
```

3) Emulate Vercel locally (recommended to test serverless behavior):
```
npm i -g vercel
vercel dev
```

Security and secret rotation
- I removed the `.env` file from the working tree to avoid accidental commits. However, if the secret was previously pushed to a remote, you must rotate the MongoDB password/URI and the `JWT_SECRET`.
- To remove `.env` from the git history (non-destructive approach), follow these steps locally:

  1. Install the BFG Repo-Cleaner or use git filter-repo.
  2. Run (example with BFG):
     ```
     # Backup your repo first
     git clone --mirror <repo-url> repo-mirror.git
     cd repo-mirror.git
     bfg --delete-files ".env"
     git reflog expire --expire=now --all && git gc --prune=now --aggressive
     git push
     ```

  If you'd like, I can provide exact commands for your environment or perform the removal (you'll need to confirm since it rewrites history).

Questions or next steps
- I can run `npm install` and `npm run build` here now and fix any TypeScript or build issues that appear.
- I can also remove the `.env` from git history for you (needs confirmation).

If you'd like me to continue with either, tell me which to run next.
