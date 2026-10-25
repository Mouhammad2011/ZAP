# Zap

Zap is a React + Vite short-video app with Rot and chronological Raw feeds, topic and density controls, reel reactions, comments, analytics, profile sheets, and a reel composer. Render serves the Vite build as a static site. Firebase Authentication, Cloud Firestore, and Cloud Storage provide accounts, live comments and feed posts, saved/followed/liked/reposted markers, and uploaded MP4 hosting.

## Run locally

```sh
npm install
npm run dev
```

Without Firebase environment values, the app runs in local demo mode. Copy `.env.example` to `.env.local` and fill it from Firebase Console > Project settings > Your apps to enable cloud mode.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Email/Password** under Authentication sign-in providers.
3. Create a Cloud Firestore database and a Cloud Storage bucket.
4. Copy the web app config values into `.env.local`. These `VITE_` values are included in the browser bundle and identify the project; they are not service-account secrets. The Firebase rules in this repo enforce ownership and upload restrictions.
5. In Firebase Authentication settings, add the exact deployed Render hostname (for example, `zap.onrender.com`) and any custom domain to the authorized domains list.
6. Deploy the checked-in rules with Firebase CLI after selecting your Firebase project:

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only firestore:rules,storage
   ```

Firebase setup references: [Web SDK setup](https://firebase.google.com/docs/web/setup), [email/password accounts](https://firebase.google.com/docs/auth/web/password-auth), [Firestore rules](https://firebase.google.com/docs/firestore/security/get-started), and [Storage uploads and rules](https://firebase.google.com/docs/storage/web/upload-files).

The app creates user profile documents in `users`, reel metadata in `reels`, and comments under `reels/{reelId}/comments`. Likes and reposts are mirrored into per-user marker collections and per-reel subcollections so their live totals can be read. Saved reels and follows are stored under the user's document. MP4 files upload to `reels/{uid}/{reelId}.mp4` in Storage.

## Deploy to Render

This repository includes a `render.yaml` Blueprint for a Render static site. Connect the repository to Render and create a new **Blueprint** from it, or create a **Static Site** manually with:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Node version: 22 (selected by `.node-version`)

The Blueprint adds the rewrite that lets the React app load on direct page refreshes. In the Render site’s **Environment** settings, add each `VITE_FIREBASE_*` value from `.env.example` for the build, then redeploy. Vite embeds these values at build time, so changes take effect after a new deploy. Render’s [static site guide](https://render.com/docs/static-sites), [Blueprint reference](https://render.com/docs/blueprint-spec), and [rewrite rules](https://render.com/docs/redirects-rewrites) cover these settings.

Firebase’s client config is public by design; keep the Firestore and Storage rules deployed and do not put service-account keys in Vite variables.

`npm run build` creates the production bundle locally. Render builds and deploys it whenever you push to the connected branch.

Demo reels use public Pexels video and Unsplash poster URLs. Cloud published posts and comments sync between signed-in clients; the feed also keeps its curated demo reels. Firebase client config is public by design, so keep Firestore and Storage rules deployed and do not place service-account keys in Vite variables.
