# Deploying Project Boost Bingo to GitHub + Render (No Node install needed on your machine)

You do NOT need Node.js installed locally. Render installs and runs it for you in the cloud.
You only need a free GitHub account and a free Render account.

## Step 1 — Put the webapp folder on GitHub
1. Go to https://github.com and log in (or create a free account).
2. Click the "+" in the top right → "New repository".
   - Name it something like `project-boost-bingo`
   - Keep it Public or Private (either works with Render's free tier)
   - Click "Create repository"
3. On the new repo page, click "uploading an existing file".
4. Drag in everything from the `webapp` folder you received:
   - `server.js`
   - `package.json`
   - `cards_data.json`
   - `README.md`
   - the entire `cards` folder (all 50 PDFs)
5. Scroll down, click "Commit changes".

That's it — your code is now on GitHub.

## Step 2 — Connect Render
1. Go to https://render.com and sign up free (you can sign up directly with your GitHub account — easiest option).
2. Click "New +" → "Web Service".
3. Choose "Build and deploy from a Git repository" → select your `project-boost-bingo` repo.
4. Render will auto-detect settings. Confirm/set these:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Click "Create Web Service".

Render will now build and deploy automatically (takes 1-3 minutes). When it's done, you'll see
a live URL at the top like:

```
https://project-boost-bingo.onrender.com
```

## Step 3 — Test it
Visit that URL in your browser. You should see the "Get My Bingo Card" signup page.
Try entering a test name/email and confirm you get a Card ID and can download the PDF.

Check `https://YOUR-RENDER-URL/status` any time to see how many of the 50 cards are claimed.

## Step 4 — Point the QR code at your real URL
Once you have your live Render URL, send it to Claude (or run the included script yourself)
to regenerate the QR slide so it points to your real site instead of the placeholder:

```bash
python3 make_qr_slide.py "https://project-boost-bingo.onrender.com"
```

Then that's the slide you screen-share on Zoom / put in the invite.

## Notes on Render's free tier
- Free web services "spin down" after periods of inactivity and take ~30-50 seconds to
  wake up on the next visit. For a live event, it's worth visiting the URL yourself
  5-10 minutes before people start scanning, to "wake it up" ahead of time.
- `assignments.json` (who claimed which card) is stored on Render's disk. On the free tier,
  that storage can reset if the service restarts/redeploys — so avoid redeploying mid-event.
  For a one-time event like this, that's generally not an issue.
