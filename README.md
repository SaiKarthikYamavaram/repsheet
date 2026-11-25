# Repsheet

A personal Android gym app. Your routine and exercise videos come from a Google Sheet you can edit any time. Your logged sets stay on your phone and back up to a private sheet through a Google Form.

The app works before you do any of this, using a built-in Push/Pull/Legs routine.

## Connect your routine sheet

1. Create a Google Sheet with five tabs named exactly `exercises`, `routine`, `settings`, `app` and `warmup`.
2. Import the matching file from `sheet-templates/` into each tab, using **File > Import > Replace current sheet**.
3. Paste YouTube links into the `video_url` column of `exercises`.
4. Click **Share**, then set **General access** to **Anyone with the link** as **Viewer**.
5. Copy the ID from the sheet's address, which is the part between `/d/` and `/edit`, into `SHEET_ID` in `src/config.ts`.
6. Publish an update (see below).

Edits to the sheet reach the app the next time it opens, when you come back to it after 10 minutes away, or when you pull down on the Today tab. If an edit breaks something, the app keeps your last good routine and shows **Sync problem**. Tap it to see which row needs fixing.

### Tabs

**exercises**

| Column | Meaning |
| --- | --- |
| `name` | Exercise name. Each name can appear only once. It links your history, so renaming starts a new history. |
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
| `rep_min`, `rep_max` | Target rep range. `rep_min` can't be more than `rep_max`. Hitting `rep_max` on every set triggers the add-weight hint. |
| `rest_sec` | Rest timer length in seconds. |
| `increment_kg` | How much + and − change the weight, and how much the hint adds. |
| `superset` | Optional. Give neighbouring rows the same label, such as `A`, to pair them. The app moves between them with no rest, then rests after each round. |

**settings**

| Key | Meaning |
| --- | --- |
| `weekly_target` | Workouts per week. Sets the Today ring and the streak. Default 4. |
| `bar_kg` | Your bar's weight, for plates and warm-ups. Default 20. |
| `plate_kg` | A plate size you have. Add one row per size. Defaults to 25, 20, 15, 10, 5, 2.5 and 1.25. |

**warmup** is optional. It holds the warm-up a new workout opens on and the cool-down shown after you finish. Until you add it, the app uses the program's built-in warm-ups for days named Push, Pull and Legs, and an empty tab does the same. To add the tab to a sheet you already use, add a new tab named `warmup`, then import `sheet-templates/warmup.csv` into it with **File > Import > Replace current sheet**.

| Column | Meaning |
| --- | --- |
| `day_name` | Which day it belongs to. Must match a `day_name` in `routine`, ignoring capitals. |
| `phase` | `warmup` or `cooldown`. |
| `name` | The move or stretch, such as Arm circles. |
| `amount` | Optional. How much, such as `15 reps` or `30 sec each arm`. |
| `how` | Optional. A short how-to. |
| `seconds` | Optional. Adds a timer that holds for this many seconds. |
| `sides` | Optional. Use `2` for moves done on each arm or leg. The timer runs once per side and buzzes when it's time to switch. |

**app** is optional. Keep it as its own tab, because Google blanks text in a column of mostly numbers.

| Key | Meaning |
| --- | --- |
| `min_version` | Shows a **New version available** banner on any older APK, such as `1.1.0`. Use all three numbers. The app still works without updating. |
| `update_url` | Where the new version comes from. Must start with `https://`. Use the APK's direct download link, ending in `.apk`, and **Download and install** downloads it inside the app and opens Android's installer. Any other link, such as the Expo build page, opens in the browser. |

## Check your form

Tap **Check my form with the camera** on an exercise or during a workout. Prop the phone where the screen says, step into view, and do your set. The app counts reps, outlines your body in green or red, and says what to fix after each rep, with the angle it measured and the limit, such as *Torso lean 62°, keep it under 55°*. It also flags reps faster than 1 second, tells you to turn side-on or face the camera when you're set up the wrong way, and sums up the most common faults in **This set**. **How to do it** lists the correct form.

It works for squats, lunges, Romanian deadlifts, presses, flys, curls, rows, pulldowns, face pulls, triceps moves, leg machines and back extensions, matched by the words in the exercise name. Shrugs and calf raises move too little for the camera to judge, so they have no check. The check reads joint angles only, so it can't see grip, breathing or a rounded back.

Everything runs on the phone and nothing is recorded. The first check needs internet to download the pose model.

## Back up your logs

1. Create a Google Form with these eleven **Short answer** questions, using these exact titles, all optional: `id`, `logged_at`, `type`, `day`, `exercise`, `set`, `weight_kg`, `reps`, `record`, `value_cm`, `person`.
2. In **Settings > Responses**, turn off **Collect email addresses** and **Limit to 1 response**, and make sure the form doesn't require sign-in.
3. In the **Responses** tab, click **Link to Sheets** to create the backup sheet. Keep this sheet private.
4. Click **Send**, choose the link icon, and copy the link into `FORM_URL` in `src/config.ts`.
5. Publish an update.

Each person enters their name once on the **Sync and updates** page, and it fills the `person` column, so people sharing the app can filter their own rows. Everyone on the same APK shares one routine sheet and one backup sheet, so anyone with access to the backup sheet can read everyone's logs.

Each ticked set becomes one row when you finish a workout, dated to when you ticked it. Bodyweight and body measurements each add a row when you save them. If you're offline, rows wait on the phone and send later. Retries can occasionally repeat a row, and the `id` column lets you spot repeats. Anyone who gets the form link could add junk rows, but they can't read your data and it doesn't change what's on your phone.

To keep a copy without the form, tap **Export logs as CSV** on the **Sync and updates** page and share it to Drive, Gmail or Keep. It has every finished set, bodyweight and measurement.

## Performance monitoring

EAS Observe records startup and screen load times, finished-workout counts and sync errors, and shows them on the project's Observe tab at expo.dev. It collects from installed APKs only, not Expo Go, and it never receives your name or your lifts. To query from the terminal, run `bunx eas-cli@latest observe:metrics-summary`.

## Develop

```bash
bun install
bun run android     # builds and runs a development build, since expo-observe isn't in Expo Go
bun run test
bun run typecheck
bun run templates   # rewrites sheet-templates/ from src/lib/starter.ts
```

## Release

Builds use RNRepo prebuilt native libraries on Android to cut build time. Set `DISABLE_RNREPO=true` to build everything from source if a prebuilt library causes trouble.

Build an installable APK. You need a new build only when native code or dependencies change. Bump `version` in `app.json` first, because updates only reach APKs with a matching version:

```bash
bunx eas-cli@latest build --platform android --profile preview
```

After the build finishes, put its version in `min_version` and its APK link in `update_url`, both in the `app` tab. To get the APK link, run `bunx eas-cli@latest build:view <build id> --json` and copy `applicationArchiveUrl`. Anyone on an older APK then sees the banner, and **Download and install** on **Sync and updates** installs the new version over the old one, keeping their logs. The first time, Android asks you to allow installs from Repsheet.

In the app, tap the sync status on any tab to open **Sync and updates**. **Check for updates** downloads the latest over-the-air update and offers a restart, and the app's own version is shown there.

Push JavaScript and asset changes over the air. The app downloads the update in the background, then applies it on the next launch, so an update can take up to two full restarts to appear:

```bash
bunx eas-cli@latest update --channel preview --environment preview --message "What changed"
```
