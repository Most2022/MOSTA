import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up server parsing limits
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Google Gen AI SDK
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY is not defined in the environment. AI features will fail.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// SYSTEM INSTRUCTION FOR PARSING THE STUDY REPORT
const SYSTEM_INSTRUCTION = `You are the backend AI for MOSTA - JEE Study Dashboard. Your job is to parse raw natural language study reports written by a student throughout their day, and extract/convert them into a structured JSON dashboard object.

Depending on the operation:
1. NEW REPORT: Extract the state from the raw text. Ensure start-time, end-time, totalStudyTime, lectures, questionSources, revisionCompleted, topicsCovered, and importantNotes are fully populated. Estimate the study session efficiency (percentage string, e.g. "85%") based on hours studied, lectures completed, questions solved, and notes.
2. UPDATE/APPEND: You will be given the 'currentData' JSON object representing the day's current parsed dashboard status, and an 'updateText' with additional activities or changes. Merge the 'updateText' contents intelligently into 'currentData':
   - Sum up similar question source counts (e.g., if existing DPP Questions is 21 and update reports "solved 10 more DPP questions", update DPP questions count to 31).
   - If a new lecture is completed, append it to lectures.
   - If new topics are studied / revised, merge them uniquely into topicsCovered and revisionCompleted arrays.
   - Append any new important notes.
   - Re-evaluate the start time, end time, total study time, and efficiency accordingly.

CRITICAL RULES:
- The values for subject in lectures MUST be clean, standardized names like "Physics", "Chemistry", "Mathematics", "English", or other valid JEE subjects.
- Duration of lectures should be in HH:MM:SS format (e.g., "01:15:20" or "01:00:00"). If not specified or if the user says "45 mins", represent it as "00:45:00".
- If startTime and endTime are specified, calculate totalStudyTime precisely (e.g. 06:30 AM to 01:45 PM is '07h 15m'). If they are not specified, estimate/derive totalStudyTime based on lectures duration and overall content.
- Ensure all numbers (e.g. questions count, lectures count, revision topics count) are integers.
- Efficiency must be estimated as an elegant percentage string (e.g., "92%").
- Always return a perfect JSON object fitting the response schema. No commentary, markdown code blocks, or extra text.`;

// API route to parse raw student report
app.post("/api/analyze", async (req, res) => {
  try {
    const { report, currentData, currentDate } = req.body;

    if (!report) {
      return res.status(400).json({ error: "Missing report content." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API Key is not configured on the server. Please check your Secrets settings.",
      });
    }

    const todayString = currentDate || new Date().toISOString().split("T")[0];

    let prompt = "";
    if (currentData) {
      prompt = `
You are updating an existing JEE Study Tracker Dashboard.
Here is the current dashboard JSON data:
${JSON.stringify(currentData, null, 2)}

Here is the student's additional study update text:
"${report}"

Current date is: ${todayString}

Please incorporate the news/updates into the JSON. Do not replace existing information unless the update explicitly overrides it; instead, sum question counts, append lists uniquely, and refine the session duration/times.
`;
    } else {
      prompt = `
Please construct a complete JEE Study Tracker Dashboard JSON from the raw study report.
Student's study report text:
"${report}"

Current date to use is: ${todayString}
`;
    }

    // Call Gemini using the recommended model and response schema setup
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: "The date of the report, format YYYY-MM-DD. Use the current date if not specified.",
            },
            studySession: {
              type: Type.OBJECT,
              properties: {
                startTime: { type: Type.STRING, description: "Study start time, e.g. '06:30 AM' or '08:00 AM'. Use 'Not specified' if unknown." },
                endTime: { type: Type.STRING, description: "Study end time, e.g. '01:45 PM' or '05:00 PM'. Use 'Not specified' if unknown." },
                totalStudyTime: { type: Type.STRING, description: "Derived or stated total study duration, e.g. '07h 15m' or '6h 20m'" },
              },
              required: ["startTime", "endTime", "totalStudyTime"],
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                lecturesCount: { type: Type.INTEGER, description: "Total count of lectures completed on this day" },
                questionsSolvedCount: { type: Type.INTEGER, description: "Sum of all questions solved from all sources (DPP, PYQ, Modules, etc.)" },
                revisionTopicsCount: { type: Type.INTEGER, description: "Number of revision topics listed" },
                efficiency: { type: Type.STRING, description: "An estimated study efficiency percentage, e.g. '92%' based on success, hours, and density." },
              },
              required: ["lecturesCount", "questionsSolvedCount", "revisionTopicsCount", "efficiency"],
            },
            lectures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the lecture, e.g. 'Ray Optics Lecture 2'" },
                  subject: { type: Type.STRING, description: "Standard Chemistry, Physics, Mathematics, English, etc." },
                  duration: { type: Type.STRING, description: "Estimated or user-specified duration of this lecture in HH:MM:SS" },
                },
                required: ["name", "subject", "duration"],
              },
            },
            questionSources: {
              type: Type.OBJECT,
              properties: {
                moduleQuestions: { type: Type.INTEGER, description: "Number of Module Questions solved" },
                dppQuestions: { type: Type.INTEGER, description: "Number of DPP Questions solved" },
                pyqQuestions: { type: Type.INTEGER, description: "Number of PYQs solved" },
                coachingSheetQuestions: { type: Type.INTEGER, description: "Number of Coaching Sheet Questions solved" },
                testPaperQuestions: { type: Type.INTEGER, description: "Number of Test Paper Questions solved" },
              },
              required: ["moduleQuestions", "dppQuestions", "pyqQuestions", "coachingSheetQuestions", "testPaperQuestions"],
            },
            revisionCompleted: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of topics/chapters revised on this day, e.g., ['Ray Optics', 'Chemical Bonding']",
            },
            topicsCovered: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific subtopics studied today, e.g., ['Reflection of Light', 'Refraction']",
            },
            importantNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Reminders, alerts, or personal notes of practice needs, e.g., ['Need more practice on mirror questions.']",
            },
          },
          required: [
            "date",
            "studySession",
            "summary",
            "lectures",
            "questionSources",
            "revisionCompleted",
            "topicsCovered",
            "importantNotes",
          ],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Error analyzing report:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Serve frontend assets and handle index.html wildcard routing
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving of built assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 MOSTA Server running on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
