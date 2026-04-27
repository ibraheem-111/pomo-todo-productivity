# Pomo Todo Productivity

A terminal-inspired productivity app for tasks, projects, focus sessions, and personal lessons.

## Current Scope

- Local-first React app
- Today and inbox task queues
- Project tracking with next actions and Google Docs URL links
- Pomodoro focus timer
- Reduced "overwhelmed" mode with a 5-minute focus option
- Personal lesson prompts and review metrics
- Local persistence through `localStorage`

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run build
```

## Private Access

For immediate personal-only access on Cloudflare Pages, use Cloudflare Access in front of the deployed site:

- Application type: Self-hosted
- Application domain: your Pages domain
- Policy action: Allow
- Include selector: Emails
- Value: your exact Google email address

Avoid broad rules such as `Everyone`, `Emails ending in`, or all valid one-time-pin users unless you intentionally want more people to access the app.

## Google Login

The app also supports an in-app Supabase Google auth gate. It activates only when these Cloudflare Pages environment variables are set:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ALLOWED_EMAIL=
```

`VITE_ALLOWED_EMAIL` should be your exact Google account email. Users who authenticate with any other Google account are blocked by the app.

Supabase setup required:

- Create a Supabase project
- Enable the Google provider in Supabase Auth
- Create a Google OAuth web client
- Add your deployed app URL to Google Authorized JavaScript origins
- Add the Supabase Google callback URL to Google Authorized redirect URIs
- Add the same deployed app URL to Supabase Auth redirect URLs

## Next Work

- Add editable task details for due dates, reminders, and energy
- Add persistent reminder scheduling through Supabase or Cloudflare Workers
- Add Google OAuth and Drive Picker for selecting docs
- Add PWA manifest and mobile install polish
