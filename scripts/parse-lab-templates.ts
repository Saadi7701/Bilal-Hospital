import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const templatesDir = path.join(process.cwd(), "lab_templates");
const outputFile = path.join(process.cwd(), "scripts", "parsed_lab_templates.json");

if (!fs.existsSync(templatesDir)) {
  console.error("lab_templates directory does not exist.");
  process.exit(1);
}

const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith(".xls") || f.endsWith(".xlsx") || f.endsWith(".xlsm"));

console.log(`Found ${files.length} Excel template files in ${templatesDir}`);

const parsedTemplates: Record<string, any> = {};

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  console.log(`\n========================================`);
  console.log(`Parsing file: ${file}`);
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true, cellStyles: true, cellFormula: true });
    const templateData: any = {
      filename: file,
      sheets: {},
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet to JSON row array
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      
      console.log(`--- Sheet: ${sheetName} (${rawRows.length} rows) ---`);
      
      templateData.sheets[sheetName] = rawRows;
    }

    parsedTemplates[file] = templateData;
  } catch (err: any) {
    console.error(`Error parsing file ${file}:`, err.message);
  }
}

fs.writeFileSync(outputFile, JSON.stringify(parsedTemplates, null, 2), "utf-8");
console.log(`\nSuccessfully saved all parsed templates to ${outputFile}`);
