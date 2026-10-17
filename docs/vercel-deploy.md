# Deploy Loop from your Vercel account (5 minutes)

Our main Vercel account hit the free limit (100 deploys a day), so the live site is stuck on an old version. Your account gets its own fresh limit. Same code, same database, just a new link.

**You need:** a GitHub account with access to `lukeganndev/hackathon` (Luke added you), and the `.env.local` file Luke sent you.

## Steps

1. Go to **https://vercel.com/signup** and choose **Continue with GitHub**. Pick the free **Hobby** plan. Don't add a card.
2. On your dashboard click **Add New… → Project**.
3. Find **lukeganndev/hackathon** and click **Import**.
   - Don't see it? Click **Adjust GitHub App Permissions**, give Vercel access to that repo, then come back.
4. Leave the defaults as they are (Framework: **Next.js**, Root Directory: `./`).
5. Open **Environment Variables**.
   - Open `.env.local` in any text editor, select everything (Ctrl+A), copy, and paste it into the first **Key** box. Vercel splits it into rows by itself.
   - Check that you see these 6 names, each with a value:
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
6. Click **Deploy**. It takes about a minute.
7. When it says **Congratulations**, click **Continue to Dashboard** and copy the link under **Domains** (something like `hackathon-abc123.vercel.app`).
8. **Send Luke the link.**

## Check it works
- Open the link: you should see "Your campus, on Loop."
- Sign in with your UA email. The code arrives by email; check spam.

## Rules so we don't hit the limit again
- Every push to `main` makes a new deploy. Luke will push in batches.
- Never post the `.env.local` contents or a screenshot of the Environment Variables anywhere. They're secret keys.
