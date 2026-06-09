import { HistoricalData, DashboardData } from "../types";

export const DEFAULT_QUOTE = "Discipline Today Success Tomorrow";

export const SEED_DATA: HistoricalData = {
  "2026-06-09": {
    date: "2026-06-09",
    studySession: {
      startTime: "06:30 AM",
      endTime: "01:45 PM",
      totalStudyTime: "07h 15m"
    },
    summary: {
      lecturesCount: 4,
      questionsSolvedCount: 77,
      revisionTopicsCount: 3,
      efficiency: "92%"
    },
    lectures: [
      { name: "Ray Optics Lec 2", subject: "Physics", duration: "01:15:20" },
      { name: "Ray Optics Lec 3", subject: "Physics", duration: "01:08:45" },
      { name: "Chemical Bonding", subject: "Chemistry", duration: "01:25:10" },
      { name: "Board English Lecture", subject: "English", duration: "00:45:30" }
    ],
    questionSources: {
      moduleQuestions: 32,
      dppQuestions: 21,
      pyqQuestions: 18,
      coachingSheetQuestions: 6,
      testPaperQuestions: 0
    },
    revisionCompleted: [
      "Kinematics",
      "Ray Optics",
      "Chemical Bonding",
      "Some Basic Concepts",
      "Bond Parameters"
    ],
    topicsCovered: [
      "Reflection of Light",
      "Refraction and Snell's Law",
      "Lens Formula & Mirror Formula",
      "Chemical Bonding – Introduction",
      "Bond Parameters and Characteristics"
    ],
    importantNotes: [
      "Need more practice on mirror & lens questions.",
      "Complete remaining PYQs tomorrow.",
      "Revise numerical formulae from Ray Optics."
    ]
  },
  "2026-06-08": {
    date: "2026-06-08",
    studySession: {
      startTime: "08:00 AM",
      endTime: "03:30 PM",
      totalStudyTime: "07h 30m"
    },
    summary: {
      lecturesCount: 3,
      questionsSolvedCount: 55,
      revisionTopicsCount: 2,
      efficiency: "88%"
    },
    lectures: [
      { name: "Electrostatics Lec 5", subject: "Physics", duration: "01:30:00" },
      { name: "Coordination Compounds Lec 1", subject: "Chemistry", duration: "01:15:00" },
      { name: "Definite Integration Lec 4", subject: "Mathematics", duration: "01:20:00" }
    ],
    questionSources: {
      moduleQuestions: 20,
      dppQuestions: 15,
      pyqQuestions: 15,
      coachingSheetQuestions: 5,
      testPaperQuestions: 0
    },
    revisionCompleted: [
      "Electrostatics Properties",
      "Integration Basics"
    ],
    topicsCovered: [
      "Electric Potential due to Dipole",
      "Nomenclature of Coordination Compounds",
      "Properties of Definite Integrals"
    ],
    importantNotes: [
      "Calculus is getting interesting. Revise properties before next lecture.",
      "Chemistry IUPAC rules require a quick glance again."
    ]
  }
};
