const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "..", "data", "Docs");
const OUTPUT_DIR = path.join(__dirname, "..", "data", "questions", "extracted");

// ── Directory → topic mapping ──────────────────────────────────────────────
const TOPIC_MAP = {
  "awesome-devops-interview-main": "devops",
  "aws-interview-questions-main":   "devops", // AWS is DevOps-adjacent
  "devops-exercises-master":        "devops",
  "system-design-main":             "system_design",
  "awesome-behavioral-interviews-main": "devops", // soft skills / behavioral
  "test-your-sysadmin-skills-master": "devops",
};

// ── Subdirectory → topic overrides for devops-exercises-master/topics/ ─────
const EXERCISE_TOPIC_MAP = {
  kubernetes:           "devops",
  docker:               "devops",
  ansible:              "devops",
  terraform:            "devops",
  aws:                  "devops",
  azure:                "devops",
  gcp:                  "devops",
  cicd:                 "devops",
  circleci:             "devops",
  jenkins:              "devops",
  devops:               "devops",
  git:                  "devops",
  linux:                "devops",
  python:               "python",
  sql:                  "sql",
  databases:            "dbms",
  kafka:                "devops",
  security:             "devops",
  networking:           "networking",
  monitoring:           "devops",
  prometheus:           "devops",
  grafana:              "devops",
  datadog:              "devops",
  observability:        "devops",
  openshift:            "devops",
  argo:                 "devops",
  chaos_engineering:    "devops",
  sre:                  "devops",
  dns:                  "networking",
  os:                   "os",
  programming:          "devops",
  node:                 "nodejs",
  shell:                "devops",
  software_development: "devops",
  soft_skills:          "devops",
  misc:                 "devops",
  coding:               "dsa",
  cloud:                "devops",
  containers:           "devops",
  flask_container_ci:   "devops",
  flask_container_ci2:  "devops",
  zuul:                 "devops",
};

// ── Files to skip ──────────────────────────────────────────────────────────
const SKIP_FILES = new Set([
  "README.md", "README-pt-BR.md", "README-zh_CN.md",
  "CONTRIBUTING.md", "CONTRIBUTING-pt-BR.md",
  "LICENSE", "credits.md", "credits-pt-BR.md",
  "faq.md", "faq-pt-BR.md",
  "prepare_for_interview.md", "prepare_for_interview-pt-BR.md",
  "CODE_OF_CONDUCT.md",
]);

const SKIP_DIRS = new Set([
  "images", "scripts", "certificates", "diagrams",
]);

// ── Track stats ────────────────────────────────────────────────────────────
let totalExtracted = 0;
let globalSeqId = 0;

// ── Parser: #### Question: ... → **Answer:** ... ───────────────────────────
function parseAwesomeFormat(text) {
  const questions = [];
  const regex = /####\s*Question:\s*(.+?)\s*\n+(?:\*\*Answer:\*\*\s*)?([\s\S]*?)(?=\n####\s*Question:|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim().replace(/\n{3,}/g, "\n\n").trim();
    if (q && a && a.length > 10) {
      questions.push({ question: q, answer: a });
    }
  }
  return questions;
}

// ── Parser: ## N. What is ... (AWS format) ─────────────────────────────────
function parseAwsFormat(text) {
  const questions = [];
  // Matches: ## N. Question text — captures full question line and body
  const regex = /^##\s+(\d+)\.\s+(.+)$/gm;
  const sections = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const q = match[2].trim();
    sections.push({ question: q, answer: "", startIdx: regex.lastIndex });
  }
  // Extract body from startIdx of section N to start of section N+1 (or end of text)
  for (let i = 0; i < sections.length; i++) {
    const endIdx = i + 1 < sections.length ? sections[i + 1].startIdx - 1 : text.length;
    const body = text.substring(sections[i].startIdx, endIdx).trim();
    let answer = body.replace(/```[\s\S]*?```/g, "").trim();
    if (sections[i].question && answer.length > 20) {
      questions.push({ question: sections[i].question, answer: answer.substring(0, 2000).trim() });
    }
  }
  return questions;
}

// ── Parser: <details><summary>Q</summary>A</details> ───────────────────────
function parseDetailsFormat(text) {
  const questions = [];
  const regex = /<details>[\s\S]*?<summary>[\s\S]*?<\/summary>[\s\S]*?<\/details>/gi;
  // Also try simpler: lines starting with Q/A
  const detailRegex = /<details>[\s\S]*?<summary>\s*(.+?)\s*<\/summary>\s*([\s\S]*?)<\/details>/gi;
  let match;
  while ((match = detailRegex.exec(text)) !== null) {
    const q = match[1].trim().replace(/<[^>]+>/g, "").trim();
    const a = match[2].trim().replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (q && a && a.length > 10 && !q.toLowerCase().includes("click to expand")) {
      questions.push({ question: q, answer: a.substring(0, 2000).trim() });
    }
  }
  return questions;
}

// ── Parser: Q: / A: format (k8s file) ──────────────────────────────────────
function parseQandAFormat(text) {
  const questions = [];
  const regex = /(?:^|\n)#{1,4}\s*(?:Question|Q)[:\s]*\s*(.+?)(?:\n|$)([\s\S]*?)(?=\n#{1,4}\s*(?:Question|Q)[:\s]*|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim();
    // Remove "A:" prefix from answer if present
    const cleanA = a.replace(/^(?:\*\*)?A[:\s]\*{0,2}\s*/i, "").trim();
    if (q && cleanA && cleanA.length > 10) {
      questions.push({ question: q, answer: cleanA.substring(0, 2000).trim() });
    }
  }
  return questions;
}

// ── Generic fallback: extract Q&A from any markdown ────────────────────────
function parseGenericFormat(text) {
  const questions = [];

  // Pattern: **Q:** or **Question:** followed by text, then **A:** or **Answer:**
  const qaRegex = /(?:\*\*|__)?(?:Q|Question|Q\.)[:：\s]*\*{0,2}\s*([^\n]+)[\s\S]*?(?:\*\*|__)?(?:A|Answer|A\.)[:：\s]*\*{0,2}\s*([\s\S]*?)(?=(?:\*\*|__)?(?:Q|Question|Q\.)[:：\s]*\*{0,2}|$)/gi;
  let match;
  while ((match = qaRegex.exec(text)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim().replace(/\n{3,}/g, "\n\n").trim();
    if (q && a && a.length > 15) {
      questions.push({ question: q, answer: a.substring(0, 2000).trim() });
    }
  }

  // Pattern: numbered list items that look like questions followed by answers
  if (questions.length === 0) {
    const listRegex = /^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]?\s*([\s\S]*?)(?=^\d+\.\s+\*\*|$)/gim;
    while ((match = listRegex.exec(text)) !== null) {
      const q = match[1].trim();
      const a = match[2].trim();
      if (q && a && a.length > 15) {
        questions.push({ question: q, answer: a.substring(0, 2000).trim() });
      }
    }
  }

  return questions;
}

// ── Determine difficulty from question/answer content ──────────────────────
function guessDifficulty(q, a) {
  const text = (q + " " + a).toLowerCase();
  if (text.includes("beginner") || text.includes("basic") || text.includes("fundamental") || text.includes("simple") || text.includes("introduction") || text.includes("what is")) return "easy";
  if (text.includes("advanced") || text.includes("complex") || text.includes("deep dive") || text.includes("optimization") || text.includes("scalability") || text.includes("architecture") || text.includes("design")) return "hard";
  return "medium";
}

// ── Clean markdown to plain text (rough but good enough) ────────────────────
function cleanMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")  // Remove code blocks
    .replace(/`([^`]+)`/g, "$1")     // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // Links
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")  // Bold/italic
    .replace(/<[^>]+>/g, "")          // HTML tags
    .replace(/#{1,6}\s*/g, "")        // Headers
    .trim();
}

// ── Process a single markdown file ─────────────────────────────────────────
function processFile(filePath, topic) {
  try {
    let text = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath).toLowerCase();

    // Skip non-content files
    if (SKIP_FILES.has(fileName)) return [];
    if (text.length < 50) return [];

    // Try multiple parsers
    let questions = [];

    // 1. Try #### Question: format
    questions = parseAwesomeFormat(text);

    // 2. Try AWS ## N. format
    if (questions.length === 0) {
      questions = parseAwsFormat(text);
    }

    // 3. Try <details> format
    if (questions.length === 0) {
      questions = parseDetailsFormat(text);
    }

    // 4. Try Q:/A: format
    if (questions.length === 0) {
      questions = parseQandAFormat(text);
    }

    // 5. Generic fallback
    if (questions.length === 0) {
      questions = parseGenericFormat(text);
    }

    // Clean and deduplicate
    const seen = new Set();
    const result = [];
    for (const qa of questions) {
      const cleanQ = cleanMarkdown(qa.question).substring(0, 300);
      const cleanA = cleanMarkdown(qa.answer).substring(0, 2000);
      const key = cleanQ.toLowerCase().substring(0, 80);
      if (!key || seen.has(key) || cleanQ.length < 5 || cleanA.length < 10) continue;
      seen.add(key);

      const difficulty = guessDifficulty(cleanQ, cleanA);
      globalSeqId++;
      result.push({
        topic,
        questionText: cleanQ,
        answerText: cleanA,
        difficulty,
        type: "theory",
        source: "extracted",
        id: `${topic}_extracted_${globalSeqId}`,
      });
    }

    return result;
  } catch (err) {
    console.error(`  ❌ Error processing ${filePath}: ${err.message}`);
    return [];
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  console.log("📄 Extracting questions from markdown files...\n");

  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`❌ Docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const topicBuckets = {};

  // Walk through Docs/ subdirectories
  const dirs = fs.readdirSync(DOCS_DIR, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) {
      // Handle standalone files in Docs/
      const filePath = path.join(DOCS_DIR, dir.name);
      if (dir.name.endsWith(".md")) {
        const topic = "devops"; // standalone .md files in Docs/ are devops
        const questions = processFile(filePath, topic);
        if (questions.length > 0) {
          if (!topicBuckets[topic]) topicBuckets[topic] = [];
          topicBuckets[topic].push(...questions);
          console.log(`  ${dir.name}: ${questions.length} questions (standalone)`);
          totalExtracted += questions.length;
        }
      }
      continue;
    }

    const dirName = dir.name;
    const topic = TOPIC_MAP[dirName] || "devops";
    const dirPath = path.join(DOCS_DIR, dirName);
    console.log(`\n  📁 ${dirName}/ (topic: ${topic})`);

    // For devops-exercises-master, walk the topics/ subdirectory
    if (dirName === "devops-exercises-master") {
      const topicsDir = path.join(dirPath, "topics");
      if (fs.existsSync(topicsDir)) {
        const subDirs = fs.readdirSync(topicsDir, { withFileTypes: true });
        for (const subDir of subDirs) {
          if (!subDir.isDirectory()) {
            // Handle standalone .md files in topics/
            if (subDir.name.endsWith(".md")) {
              const subTopic = "devops";
              const questions = processFile(path.join(topicsDir, subDir.name), subTopic);
              if (questions.length > 0) {
                if (!topicBuckets[subTopic]) topicBuckets[subTopic] = [];
                topicBuckets[subTopic].push(...questions);
                console.log(`    ${subDir.name}: ${questions.length} questions`);
                totalExtracted += questions.length;
              }
            }
            continue;
          }
          const subTopic = EXERCISE_TOPIC_MAP[subDir.name] || "devops";
          const subDirPath = path.join(topicsDir, subDir.name);
          const files = fs.readdirSync(subDirPath).filter(f => f.endsWith(".md"));

          for (const file of files) {
            const filePath = path.join(subDirPath, file);
            const questions = processFile(filePath, subTopic);
            if (questions.length > 0) {
              if (!topicBuckets[subTopic]) topicBuckets[subTopic] = [];
              topicBuckets[subTopic].push(...questions);
              console.log(`    ${subDir.name}/${file}: ${questions.length} questions`);
              totalExtracted += questions.length;
            }
          }
        }
      }
      continue;
    }

    // For other directories, walk all .md files
    const files = [];
    function walkDir(dirPath) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walkDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          files.push(fullPath);
        }
      }
    }
    walkDir(dirPath);

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const questions = processFile(filePath, topic);
      if (questions.length > 0) {
        if (!topicBuckets[topic]) topicBuckets[topic] = [];
        topicBuckets[topic].push(...questions);
        console.log(`    ${fileName}: ${questions.length} questions`);
        totalExtracted += questions.length;
      }
    }
  }

  // ── Write output files ──────────────────────────────────────────────────
  console.log(`\n${"=".repeat(50)}`);
  console.log(`\n📊 Total extracted: ${totalExtracted} questions\n`);

  for (const [topic, questions] of Object.entries(topicBuckets)) {
    const filePath = path.join(OUTPUT_DIR, `${topic}.json`);
    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), "utf-8");
    console.log(`  ✅ ${topic}: ${questions.length} questions → ${filePath}`);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("\n🎉 Done! All questions extracted and saved to:", OUTPUT_DIR);
}

main();
