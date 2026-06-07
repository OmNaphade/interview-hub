const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_DIR = path.join(DATA_DIR, "extracted");

// Files to skip (these are template files or non-documents)
const SKIP_FILES = new Set([
  "questions", "templates", "extracted", "formatted",
  "coding-card.json", "coding-section.json",
  "theory-question.json", "theory-section.json",
]);

// Recursively find all PDF and DOCX files
function findDocuments(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_FILES.has(entry.name)) {
        findDocuments(fullPath, results);
      }
    } else if (
      entry.name.endsWith(".pdf") ||
      entry.name.endsWith(".docx") ||
      entry.name.endsWith(".doc")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

async function extractPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  return {
    text: data.text,
    pages: data.numpages,
    metadata: data.info || {},
  };
}

async function extractDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    text: result.value,
    warnings: result.messages || [],
  };
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = findDocuments(DATA_DIR);
  console.log(`Found ${files.length} documents to process...\n`);

  let success = 0;
  let failed = 0;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(DATA_DIR, filePath);
    const safeName = relativePath.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const outputPath = path.join(OUTPUT_DIR, `${safeName}.json`);

    process.stdout.write(`  ${relativePath}... `);

    try {
      let result;
      if (ext === ".pdf") {
        result = await extractPDF(filePath);
      } else if (ext === ".docx" || ext === ".doc") {
        result = await extractDOCX(filePath);
      }

      const output = {
        source: relativePath,
        extractedAt: new Date().toISOString(),
        ...result,
        text: result.text.trim(),
        wordCount: result.text.trim().split(/\s+/).filter(Boolean).length,
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
      console.log(`✅ (${output.wordCount} words)`);
      success++;
    } catch (err) {
      console.log(`❌ ${err.message.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\n✅ Done: ${success} extracted, ${failed} failed`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
