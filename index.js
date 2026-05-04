
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function generateQuiz(topic, difficulty) {
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate a quiz with 5 multiple choice questions about "${topic}" at ${difficulty} difficulty level. 
        
Format your response EXACTLY like this for each question:
Question [number]: [question text]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
Correct Answer: [A/B/C/D]
Explanation: [brief explanation]

Make sure each question is separated by a blank line.`,
      },
    ],
  });

  return message.content[0].text;
}

function parseQuiz(quizText) {
  const questions = [];
  const questionBlocks = quizText.split("\n\n").filter((block) => block.trim());

  for (const block of questionBlocks) {
    const lines = block.split("\n");
    let question = "";
    const options = {};
    let correctAnswer = "";
    let explanation = "";

    for (const line of lines) {
      if (line.startsWith("Question")) {
        question = line.replace(/Question \d+:\s*/, "").trim();
      } else if (/^[A-D]\)/.test(line)) {
        const match = line.match(/^([A-D])\)\s*(.*)/);
        if (match) {
          options[match[1]] = match[2].trim();
        }
      } else if (line.startsWith("Correct Answer:")) {
        correctAnswer = line.replace("Correct Answer:", "").trim();
      } else if (line.startsWith("Explanation:")) {
        explanation = line.replace("Explanation:", "").trim();
      }
    }

    if (question && Object.keys(options).length === 4) {
      questions.push({
        question,
        options,
        correctAnswer,
        explanation,
      });
    }
  }

  return questions;
}

async function conductQuiz(questions) {
  let score = 0;
  const answers = [];

  console.log("\n=== QUIZ TIME ===\n");

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\nQuestion ${i + 1}/${questions.length}:`);
    console.log(q.question);
    console.log(`A) ${q.options.A}`);
    console.log(`B) ${q.options.B}`);
    console.log(`C) ${q.options.C}`);
    console.log(`D) ${q.options.D}`);

    let userAnswer = "";
    let validAnswer = false;

    while (!validAnswer) {
      userAnswer = await question("Your answer (A/B/C/D): ");
      userAnswer = userAnswer.toUpperCase();
      if (["A", "B", "C", "D"].includes(userAnswer)) {
        validAnswer = true;
      } else {
        console.log("Please enter A, B, C, or D");
      }
    }

    answers.push({
      questionNum: i + 1,
      userAnswer,
      correctAnswer: q.correctAnswer,
      question: q.question,
      explanation: q.explanation,
    });

    if (userAnswer === q.correctAnswer) {
      score++;
      console.log("✓ Correct!");
    } else {
      console.log(
        `✗ Incorrect. The correct answer is ${q.correctAnswer}.`
      );
    }
    console.log(`Explanation: ${q.explanation}`);
  }

  return { score, totalQuestions: questions.length, answers };
}

function displayResults(results) {
  console.log("\n=== QUIZ RESULTS ===\n");
  console.log(`Score: ${results.score}/${results.totalQuestions}`);
  console.log(
    `Percentage: ${((results.score / results.totalQuestions) * 100).toFixed(1)}%`
  );

  if (results.score === results.totalQuestions) {
    console.log("🏆 PERFECT SCORE! Outstanding performance!");
  } else if (results.score >= results.totalQuestions * 0.8) {
    console.log("🌟 Excellent work!");
  } else if (results.score >= results.totalQuestions * 0.6) {
    console.log("👍 Good effort!");
  } else {
    console.log("💪 Keep studying and try again!");
  }

  console.log("\n=== DETAILED REVIEW ===\n");
  for (const answer of results.answers) {
    console.log(`Question ${answer.questionNum}: ${answer.question}`);
    console.log(
      `Your answer: ${answer.userAnswer} ${
        answer.userAnswer === answer.correctAnswer ? "✓" : "✗"
      }`
    );
    console.log(`Correct answer: ${answer.correctAnswer}`);
    console.log(`Explanation: ${answer.explanation}\n`);
  }
}

async function main() {
  console.log("=== GENERAL KNOWLEDGE QUIZ ===\n");

  const topic = await question(
    "Enter a topic for the quiz (e.g., History, Science, Geography): "
  );
  const difficulty = await question(
    "Enter difficulty level (easy, medium, hard): "
  );

  