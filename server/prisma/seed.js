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

// ── Source 2: data/data-theory.json (79 theory questions in template format) ──
const theoryData = require("../../data/data-theory.json");

// ── Source 3: data/data-coding.json (37 coding cards in template format) ─────
const codingData = require("../../data/data-coding.json");

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

    const allQuestions = [...existingQuestions, ...theoryQuestions, ...codingQuestions];
    console.log(`  Total questions to seed: ${allQuestions.length}`);
    console.log(`  (${existingQuestions.length} from topic files, ${theoryQuestions.length} from data-theory.json, ${codingQuestions.length} from data-coding.json)`);

    let upserted = 0;
    let skipped = 0;

    for (const q of allQuestions) {
      const id = q.id || `builtin_${seqId++}`;

      // ⚠️ IMPORTANT: We explicitly set `id` in the `create` block so that
      //    the upsert's `where: { id }` actually matches on subsequent runs.
      //    Without this, Prisma generates a UUID and the upsert always creates
      //    a NEW record instead of updating the existing one.
      const existing = await prisma.question.findUnique({ where: { id } });

      if (existing) {
        skipped++;
      } else {
        await prisma.question.create({
          data: {
            id,
            topic: q.topic,
            questionText: q.questionText,
            answerText: q.answerText,
            difficulty: q.difficulty || "medium",
            type: q.type || "theory",
            source: q.source || "builtin",
            starterCode: q.starterCode || null,
            testCases: q.testCases || null,
          },
        });
        upserted++;
      }
    }

    console.log(`✅ Done: ${upserted} created, ${skipped} already exist (skipped)`);
    console.log(`   Total in database: ${upserted + skipped}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

let seqId = 1000;

seed();
