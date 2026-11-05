# Repsheet

A personal Android gym app. Your routine and exercise videos come from a Google Sheet you can edit any time. Your logged sets stay on your phone and back up to a private sheet through a Google Form.

The app works before you do any of this, using a built-in Push/Pull/Legs routine.

## Connect your routine sheet

1. Create a Google Sheet with four tabs named exactly `exercises`, `routine`, `settings` and `app`.
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
| `equipment` | Optional. Use `barbell` to show the plate calculator for this exercise. |

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
| `superset` | Optional. Give neighbouring rows the same label, such as `A`, to pair them. The app moves between them with no rest, then rests after each round. |

**settings**

| Key | Meaning |
| --- | --- |
| `weekly_target` | Workouts per week. Sets the Today ring and the streak. Default 4. |
| `bar_kg` | Your bar's weight, for plates and warm-ups. Default 20. |
| `plate_kg` | A plate size you have. Add one row per size. Defaults to 25, 20, 15, 10, 5, 2.5 and 1.25. |

**app** is optional. Keep it as its own tab, because Google blanks text in a column of mostly numbers.

| Key | Meaning |
| --- | --- |
| `min_version` | Shows a **New version available** banner on any older APK, such as `1.1.0`. Use all three numbers. The app still works without updating. |
| `update_url` | Link the banner opens, such as the APK's Expo build page. Must start with `https://`. |

## Back up your logs

1. Create a Google Form with these eleven **Short answer** questions, using these exact titles, all optional: `id`, `logged_at`, `type`, `day`, `exercise`, `set`, `weight_kg`, `reps`, `record`, `value_cm`, `person`.
2. In **Settings > Responses**, turn off **Collect email addresses** and **Limit to 1 response**, and make sure the form doesn't require sign-in.
3. In the **Responses** tab, click **Link to Sheets** to create the backup sheet. Keep this sheet private.
4. Click **Send**, choose the link icon, and copy the link into `FORM_URL` in `src/config.ts`.
5. Publish an update.

Each person enters their name once on the **Sync and updates** page, and it fills the `person` column, so people sharing the app can filter their own rows. Everyone on the same APK shares one routine sheet and one backup sheet, so anyone with access to the backup sheet can read everyone's logs.

Each ticked set becomes one row when you finish a workout. Bodyweight and body measurements each add a row when you save them. If you're offline, rows wait on the phone and send later. Retries can occasionally repeat a row, and the `id` column lets you spot repeats. Anyone who gets the form link could add junk rows, but they can't read your data and it doesn't change what's on your phone.

## Performance monitoring

EAS Observe records startup and screen load times, finished-workout counts and sync errors, and shows them on the project's Observe tab at expo.dev. It collects from installed APKs only, not Expo Go, and it never receives your name or your lifts. To query from the terminal, run `bunx eas-cli@latest observe:metrics-summary`.

## Develop

```bash
bun install
bun run android     # needs a development build, since expo-observe isn't in Expo Go
bun run test
bun run typecheck
bun run templates   # rewrites sheet-templates/ from src/lib/starter.ts
```

## Release

Build an installable APK. You need a new build only when native code or dependencies change. Bump `version` in `app.json` first, because updates only reach APKs with a matching version:

```bash
bunx eas-cli@latest build --platform android --profile preview
```

After installing a new APK, set `min_version` in the `app` tab so anyone on an older APK sees the banner.

In the app, tap the sync status on any tab to open **Sync and updates**. **Check for updates** downloads the latest over-the-air update and offers a restart, and the app's own version is shown there.

Push JavaScript and asset changes over the air. The app downloads the update in the background, then applies it on the next launch, so an update can take up to two full restarts to appear:

```bash
bunx eas-cli@latest update --channel preview --environment preview --message "What changed"
```
