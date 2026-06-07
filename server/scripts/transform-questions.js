const fs = require("fs");
const path = require("path");

const QUESTIONS_DIR = path.join(__dirname, "..", "data", "questions");
const OUTPUT_DIR = path.join(QUESTIONS_DIR, "formatted");

const topicFiles = [
  "dbms.json", "devops.json", "dsa.json", "java.json",
  "javascript.json", "networking.json", "nodejs.json",
  "os.json", "python.json", "react.json", "sql.json",
  "system_design.json",
];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getTopicLabel(topic) {
  const labels = {
    dbms: "DBMS",
    devops: "DevOps",
    dsa: "Data Structures & Algorithms",
    java: "Java",
    javascript: "JavaScript",
    networking: "Computer Networking",
    nodejs: "Node.js",
    os: "Operating Systems",
    python: "Python",
    react: "React",
    sql: "SQL",
    system_design: "System Design",
  };
  return labels[topic] || capitalize(topic);
}

function transformTheory(question, idx) {
  const diff = capitalize(question.difficulty || "medium");
  return {
    id: question.id || `q${idx + 1}`,
    question: question.questionText,
    explanation: question.answerText || "",
    code: question.starterCode || "",
    language: "",
    tableHeaders: [],
    tableRows: [],
    note: "",
    tip: "",
    warn: "",
    difficulty: diff,
    tags: [diff, "Frequent"],
  };
}

function transformCoding(question, idx) {
  const diff = capitalize(question.difficulty || "medium");
  return {
    num: String(idx + 1),
    numColor: diff === "Easy" ? "teal" : diff === "Hard" ? "red" : "yellow",
    title: question.questionText,
    desc: question.answerText ? question.answerText.split(".")[0] + "." : "",
    tags: [diff],
    complexity: [],
    approach: question.answerText || "",
    sqlNote: "",
    language: "",
    code: question.starterCode || "",
    difficulty: diff,
  };
}

function main() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const summary = [];

  for (const file of topicFiles) {
    const filePath = path.join(QUESTIONS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const questions = JSON.parse(raw);

    const topic = path.basename(file, ".json");
    const label = getTopicLabel(topic);

    const theoryQuestions = [];
    const codingCards = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.type === "coding") {
        codingCards.push(transformCoding(q, codingCards.length));
      } else {
        theoryQuestions.push(transformTheory(q, theoryQuestions.length));
      }
    }

    const topicDir = path.join(OUTPUT_DIR, topic);
    if (!fs.existsSync(topicDir)) {
      fs.mkdirSync(topicDir, { recursive: true });
    }

    // Write theory section
    if (theoryQuestions.length > 0) {
      const theorySection = {
        id: `s_${topic}_theory`,
        icon: "",
        color: "c1",
        dcolor: "d1",
        title: `${label} — Theory`,
        toc: `${label} Theory`,
        questions: theoryQuestions,
      };
      fs.writeFileSync(
        path.join(topicDir, "theory.json"),
        JSON.stringify(theorySection, null, 2),
        "utf-8"
      );
    }

    // Write coding section
    if (codingCards.length > 0) {
      const codingSection = {
        id: `s_${topic}_coding`,
        label: `${label} — Coding`,
        cards: codingCards,
      };
      fs.writeFileSync(
        path.join(topicDir, "coding.json"),
        JSON.stringify(codingSection, null, 2),
        "utf-8"
      );
    }

    summary.push({
      topic,
      label,
      theory: theoryQuestions.length,
      coding: codingCards.length,
    });
  }

  console.log("✅ Transformation complete!");
  console.log("────────────────────────────────────");
  console.log("Topic".padEnd(25) + "Theory".padEnd(10) + "Coding");
  console.log("────────────────────────────────────");
  for (const s of summary) {
    console.log(
      s.label.padEnd(25) +
      String(s.theory).padEnd(10) +
      String(s.coding)
    );
  }
  console.log("────────────────────────────────────");
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
