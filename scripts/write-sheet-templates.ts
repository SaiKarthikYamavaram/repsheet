// Run with `bun run templates` to refresh the CSV files you import into Google Sheets.
import { STARTER } from '../src/lib/starter';

for (const [name, csv] of Object.entries(STARTER)) {
  await Bun.write(`sheet-templates/${name}.csv`, csv);
}
