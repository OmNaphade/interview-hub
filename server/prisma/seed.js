const { prisma } = require("./client");

// ── Source 1: Existing topic JSON files (old format, ~5 per topic) ──────────
const dsa = require("../data/questions/dsa.json");
const python = require("../data/questions/python.json");
const javascript = require("../data/questions/javascript.json");
const java = require("../data/questions/java.json");
const systemDesign = require("../data/questions/system_design.json");
const dbms = require("../data/questions/dbms.json");
const os = require("../data/questions/os.json");
const networking = require("../data/questions/networking.json");
const react = require("../data/questions/react.json");
const nodejs = require("../data/questions/nodejs.json");
const sql_old = require("../data/questions/sql.json");
const devops = require("../data/questions/devops.json");

// ── Source 2: server/data/data-theory.json (79 theory questions in template format) ──
const theoryData = require("../data/data-theory.json");

// ── Source 3: server/data/data-coding.json (37 coding cards in template format) ─────
const codingData = require("../data/data-coding.json");

// ── Source 4: Extracted questions from 327 markdown files in data/Docs/ ────
const extractedDevops = require("../data/questions/extracted/devops.json");
const extractedDbms = require("../data/questions/extracted/dbms.json");
const extractedNetworking = require("../data/questions/extracted/networking.json");
const extractedSystemDesign = require("../data/questions/extracted/system_design.json");
const extractedOs = require("../data/questions/extracted/os.json");
const extractedNodejs = require("../data/questions/extracted/nodejs.json");

// ── Section → topic mapping for data-theory.json ────────────────────────────
const THEORY_TOPIC_MAP = {
  s1:  "java",   // Core Java — OOP Concepts
  s2:  "java",   // Collections & Generics
  s3:  "java",   // Java 8+ Features
  s4:  "java",   // Multithreading
  s5:  "sql",    // JDBC & SQL Security
  s6:  "java",   // Servlet & JSP
  s7:  "java",   // Spring Core & Boot
  s8:  "java",   // Hibernate & JPA
  s9:  "java",   // Spring MVC & REST
  s10: "java",   // Spring Security & JWT
};

// ── Section → topic mapping for data-coding.json ────────────────────────────
const CODING_TOPIC_MAP = {
  arrays:  "dsa",       // Arrays & Pairs
  strings: "dsa",       // Strings
  ds:      "dsa",       // Data Structures
  trees:   "dsa",       // Trees
  ll:      "dsa",       // Linked Lists
  math:    "dsa",       // Math / Patterns
  sql:     "sql",       // SQL
  misc:    "javascript",// Misc / JS
  new5:    "javascript",// New Questions
};

// ── Parse difficulty from tags array (capitalized → lowercase) ──────────────
function parseDifficulty(tags) {
  if (!tags || !Array.isArray(tags)) return "medium";
  const valid = ["easy", "medium", "hard"];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (valid.includes(lower)) return lower;
  }
  return "medium";
}

// ── Convert data-theory.json sections → flat questions ───────────────────────
function convertTheoryQuestions() {
  const questions = [];
  let seq = 1;

  for (const section of theoryData) {
    const topic = THEORY_TOPIC_MAP[section.id];
    if (!topic || !section.questions) continue;

    for (const q of section.questions) {
      const difficulty = parseDifficulty(q.tags);
      questions.push({
        // Use a predictable ID based on topic + sequence so upsert works
        id: `theory_${topic}_${seq++}`,
        topic,
        questionText: q.question || "",
        answerText: q.explanation || "",
        difficulty,
        type: "theory",
        source: "builtin",
        starterCode: q.code || null,
        testCases: null,
      });
    }
  }

  return questions;
}

// ── Convert data-coding.json sections → flat questions ───────────────────────
function convertCodingQuestions() {
  const questions = [];
  let seq = 1;

  for (const section of codingData) {
    const topic = CODING_TOPIC_MAP[section.id];
    if (!topic || !section.cards) continue;

    for (const card of section.cards) {
      const difficulty = parseDifficulty(card.tags);
      questions.push({
        id: `coding_${topic}_${seq++}`,
        topic,
        questionText: card.title || "",
        answerText: card.approach || "",
        difficulty,
        type: "coding",
        source: "builtin",
        starterCode: card.code || null,
        testCases: null,
      });
    }
  }

  return questions;
}

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Source 1: existing topic files (old format, ~5 per topic)
    const existingQuestions = [
      ...dsa, ...python, ...javascript, ...java,
      ...systemDesign, ...dbms, ...os, ...networking,
      ...react, ...nodejs, ...sql_old, ...devops,
    ];

    // Source 2 & 3: template-format files from data/ folder
    const theoryQuestions = convertTheoryQuestions();
    const codingQuestions = convertCodingQuestions();

    // Source 4: extracted markdown questions
    const extractedQuestions = [
      ...extractedDevops,
      ...extractedDbms,
      ...extractedNetworking,
      ...extractedSystemDesign,
      ...extractedOs,
      ...extractedNodejs,
    ];

    const allQuestions = [...existingQuestions, ...theoryQuestions, ...codingQuestions, ...extractedQuestions];
    console.log(`  Total questions to seed: ${allQuestions.length}`);
    console.log(`  (${existingQuestions.length} from topic files, ${theoryQuestions.length} from data-theory.json, ${codingQuestions.length} from data-coding.json, ${extractedQuestions.length} from markdown extraction)`);

    // ⚠️ Collect ALL existing IDs in a single query instead of 4,843 individual lookups
    const allIds = allQuestions.map(q => q.id || `builtin_${Math.random().toString(36).slice(2)}`);
    const existing = await prisma.question.findMany({
      where: { id: { in: allIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map(q => q.id));

    // Filter to only new questions
    const newQuestions = allQuestions.filter((q, i) => !existingIds.has(allIds[i]));

    // Batch insert with createMany (1 query instead of thousands)
    if (newQuestions.length > 0) {
      await prisma.question.createMany({
        data: newQuestions.map(q => ({
          id: q.id,
          topic: q.topic,
          questionText: q.questionText,
          answerText: q.answerText,
          difficulty: q.difficulty || "medium",
          type: q.type || "theory",
          source: q.source || "builtin",
          starterCode: q.starterCode || null,
          testCases: q.testCases || null,
        })),
      });
    }

    console.log(`✅ Done: ${newQuestions.length} created, ${existingIds.size} already exist (skipped)`);
    console.log(`   Total in database: ${newQuestions.length + existingIds.size}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

let seqId = 1000;

seed();
