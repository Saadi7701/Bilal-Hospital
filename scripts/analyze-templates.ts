import * as fs from "fs";
import * as path from "path";

const parsedFile = path.join(process.cwd(), "scripts", "parsed_lab_templates.json");
const data = JSON.parse(fs.readFileSync(parsedFile, "utf-8"));

console.log("==================================================");
console.log("LABORATORY TEMPLATES ANALYSIS FROM EXCEL FILES");
console.log("==================================================");

for (const fileName of Object.keys(data)) {
  console.log(`\nFILE: ${fileName}`);
  const sheets = data[fileName].sheets;
  for (const sheetName of Object.keys(sheets)) {
    const rows: any[][] = sheets[sheetName];
    if (!rows || rows.length === 0) continue;

    console.log(`  SHEET: ${sheetName}`);
    // Find non-empty rows
    const nonEntries = rows
      .map((r, i) => ({ index: i, cells: r.filter((c) => c !== null && c !== undefined && String(c).trim() !== "") }))
      .filter((r) => r.cells.length > 0);

    // Print first 15 rows summary
    for (const row of nonEntries.slice(0, 25)) {
      console.log(`    Row ${row.index + 1}: ${row.cells.join(" | ")}`);
    }
  }
}
