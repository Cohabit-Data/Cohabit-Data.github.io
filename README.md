# Cohabit's small website

Four pages Apple and Plaid need before real banks and outside testers:

| Path | Why |
|---|---|
| `/.well-known/apple-app-site-association` | Lets `https://<site>/plaid/…` open the app (Plaid requires a universal link for OAuth banks: Chase, Amex, Capital One…). The app id is the Team ID + the bundle id. Not used by the pilot (Hosted Link returns to the app by itself); only needed for the universal-link upgrade, which also needs the Associated Domains capability in Xcode. |
| `/plaid/oauth/` | The redirect URI registered with Plaid; shown only if the app didn't open. |
| `/privacy/` | Privacy policy URL for App Store Connect and Plaid (made from `PRIVACY.md`). |
| `/support/` | Support URL for App Store Connect. |
| `/invite/` | v72: where household and Pip-friend invites land (`#join=CODE`, `#pip=CODE`): how to get Cohabit (the Get-the-app link in `tab/config.js`), then the code to enter, and a button that opens the app if it's there. |
| `/tab/` | v44: a friend's view of a shared tab (no app): what's owed, add what they paid. Fill in `tab/config.js` (project ref, the Get-the-app link). The app needs `COHABIT_SITE_HOST` set to this site's host. |

Publish (free): make a **public** GitHub repo named `<account>.github.io` (Cohabit's: `Cohabit-Data/Cohabit-Data.github.io` → https://cohabit-data.github.io), copy
this folder's contents into a folder of its own (not a repo inside this repo — e.g.
`rsync -a --delete --exclude .git web/ ~/Developer/cohabit-site/`), including `.nojekyll`
(without it GitHub's Jekyll build drops dot-folders such as `.well-known/`) and push it there;
then Settings → Pages → Deploy from a branch → main, / (root), and tick Enforce HTTPS once it
appears. GitHub Pages ignores `_headers` and serves the association file as
`application/octet-stream`, which Apple accepts in practice. The site is then
`https://<your-github-username>.github.io`. Cloudflare Pages or Netlify work too (they
read `_headers`, which serves the association file as JSON).

Check: `curl -i https://<site>/.well-known/apple-app-site-association` returns 200 and
the JSON, with no redirect.
