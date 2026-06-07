const { prisma } = require("./client");
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
const sql = require("../data/questions/sql.json");
const devops = require("../data/questions/devops.json");

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    const allQuestions = [
      ...dsa,
      ...python,
      ...javascript,
      ...java,
      ...systemDesign,
      ...dbms,
      ...os,
      ...networking,
      ...react,
      ...nodejs,
      ...sql,
      ...devops,
    ];

    for (const q of allQuestions) {
      await prisma.question.upsert({
        where: { id: q.id || `builtin_${Math.random()}` },
        update: {},
        create: {
          topic: q.topic,
          questionText: q.questionText,
          answerText: q.answerText,
          difficulty: q.difficulty,
          type: q.type,
          source: "builtin",
          starterCode: q.starterCode || null,
          testCases: q.testCases || null,
        },
      });
    }

    console.log(`✅ Seeded ${allQuestions.length} questions`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
