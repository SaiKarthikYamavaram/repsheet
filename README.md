# Repsheet

A personal Android gym app. Your routine and exercise videos come from a Google Sheet you can edit any time. Your logged sets stay on your phone and back up to a private sheet through a Google Form.

The app works before you do any of this, using a built-in Push/Pull/Legs routine.

## Connect your routine sheet

1. Create a Google Sheet with three tabs named exactly `exercises`, `routine` and `settings`.
2. Import the matching file from `sheet-templates/` into each tab, using **File > Import > Replace current sheet**.
3. Paste YouTube links into the `video_url` column of `exercises`.
4. Click **Share**, then set **General access** to **Anyone with the link** as **Viewer**.
5. Copy the ID from the sheet's address, which is the part between `/d/` and `/edit`, into `SHEET_ID` in `src/config.ts`.
6. Publish an update (see below).

Edits to the sheet reach the app the next time it opens, or when you pull down on the Today tab. If an edit breaks something, the app keeps your last good routine and shows **Sync problem**. Tap it to see which row needs fixing.

### Tabs

**exercises**

| Column | Meaning |
| --- | --- |
| `name` | Exercise name. It links your history, so renaming starts a new history. |
| `muscle` | Group shown in the Library. |
| `video_url` | YouTube link. Can be empty. |
| `cues` | Form reminder. Can be empty. |

**routine** has one row per exercise, in the order you do them.

| Column | Meaning |
| --- | --- |
| `day_order` | Position in your cycle: 1, 2, 3 and so on. |
| `day_name` | Workout name, such as Push. |
| `exercise` | Must match a `name` in `exercises`. |
| `sets` | Planned sets. |
| `rep_min`, `rep_max` | Target rep range. Hitting `rep_max` on every set triggers the add-weight hint. |
| `rest_sec` | Rest timer length in seconds. |
| `increment_kg` | How much + and − change the weight, and how much the hint adds. |

**settings**

| Key | Meaning |
| --- | --- |
| `weekly_target` | Workouts per week. Sets the Today ring and the streak. Default 4. |

## Back up your logs

1. Create a Google Form with these nine **Short answer** questions, using these exact titles, all optional: `id`, `logged_at`, `type`, `day`, `exercise`, `set`, `weight_kg`, `reps`, `record`.
2. In **Settings > Responses**, turn off **Collect email addresses** and **Limit to 1 response**, and make sure the form doesn't require sign-in.
3. In the **Responses** tab, click **Link to Sheets** to create the backup sheet. Keep this sheet private.
4. Click **Send**, choose the link icon, and copy the link into `FORM_URL` in `src/config.ts`.
5. Publish an update.

Each ticked set becomes one row when you finish a workout. If you're offline, rows wait on the phone and send later. Retries can occasionally repeat a row, and the `id` column lets you spot repeats. Anyone who gets the form link could add junk rows, but they can't read your data and it doesn't change what's on your phone.

## Develop

```bash
bun install
bun run android     # needs Expo Go or a development build
bun run test
bun run typecheck
bun run templates   # rewrites sheet-templates/ from src/lib/starter.ts
```

## Release

Build an installable APK. You need a new build only when native code or dependencies change:

```bash
bunx eas-cli@latest build --platform android --profile preview
```

Push JavaScript and asset changes over the air. The app downloads the update in the background, then applies it on the next launch, so an update can take up to two full restarts to appear:

```bash
bunx eas-cli@latest update --channel preview --environment preview --message "What changed"
```
