import * as fs from "fs";
import * as path from "path";

const parsedFile = path.join(process.cwd(), "scripts", "parsed_lab_templates.json");
const data = JSON.parse(fs.readFileSync(parsedFile, "utf-8"));

console.log("=== DETAILED PARAMETER EXTRACTION ===");

const filesToInspect = [
  "CBC.xls",
  "RFTs-.xlsx",
  "0584  ALT.xlsm",
  "Calcium.xlsx",
  "Blood Group.xls",
  "H-Pylori Antibody.xls",
  "HBsAg (By ICT) + HCV (ICT) -.xls",
  "Lipid Profile..xls",
  "MP.xls",
  "Pregnancy Test.xls",
  "Semen Analysis.xls",
  "Stool RE.xls",
  "Blood Sugar Fasting.xls",
  "BSR.xls"
];

for (const fileName of filesToInspect) {
  if (!data[fileName]) continue;
  console.log(`\n========================================`);
  console.log(`FILE: ${fileName}`);
  const sheets = data[fileName].sheets;
  for (const sheetName of Object.keys(sheets)) {
    const rows: any[][] = sheets[sheetName];
    if (!rows || rows.length === 0) continue;
    console.log(`--- SHEET: ${sheetName} ---`);
    rows.forEach((r, idx) => {
      const line = r.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").join(" | ");
      if (line) console.log(`[L${idx + 1}] ${line}`);
    });
  }
}
