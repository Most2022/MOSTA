import React, { useState, useEffect } from "react";
import {
  BookOpen,
  HelpCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  Play,
  Square,
  ClipboardList,
  Folder,
  Calendar,
  ChevronRight,
  Search,
  Flame,
  Target,
  Sparkles,
  History,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Quote,
  ChevronLeft,
  X,
  FileText,
  Settings,
  Download,
  Database,
  Camera
} from "lucide-react";
import { toPng } from "html-to-image";
import { DashboardData, HistoricalData } from "./types";
import { SEED_DATA, DEFAULT_QUOTE } from "./data/mockData";

export default function App() {
  // Onboarding landing screen status
  const [hasStarted, setHasStarted] = useState<boolean>(() => {
    return localStorage.getItem("mosta_has_started") === "true";
  });

  // Settings modal visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // State for historical records. Starts FRESH / Empty if not in localStorage.
  const [history, setHistory] = useState<HistoricalData>(() => {
    const saved = localStorage.getItem("mosta_study_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved history", e);
      }
    }
    return {}; // Empty by default when someone starts fresh!
  });

  // Current selected tracking date (defaults to today's date dynamically)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  // Raw report text input state
  const [reportInput, setReportInput] = useState<string>("");

  // UI state managers
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  
  // Custom dialog state to replace native window.confirm in iframe sandbox
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    isDanger: boolean;
    action: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDanger: false,
    action: () => {}
  });
  
  // Custom manual date adding states
  const [showAddDate, setShowAddDate] = useState<boolean>(false);
  const [newDateInput, setNewDateInput] = useState<string>("");

  // Productivity streak state (derived/persisted). Starts fresh at 0.
  const [streak, setStreak] = useState<number>(() => {
    const savedStreak = localStorage.getItem("mosta_streak");
    return savedStreak ? parseInt(savedStreak, 10) : 0;
  });

  const [goalCompletion, setGoalCompletion] = useState<number>(() => {
    const savedProgress = localStorage.getItem("mosta_goal_completion");
    return savedProgress ? parseInt(savedProgress, 10) : 0;
  });

  // Save onboarding state whenever it changes
  useEffect(() => {
    localStorage.setItem("mosta_has_started", hasStarted ? "true" : "false");
  }, [hasStarted]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("mosta_study_history", JSON.stringify(history));
  }, [history]);

  // Handle auto streak calculation or save state
  useEffect(() => {
    localStorage.setItem("mosta_streak", streak.toString());
  }, [streak]);

  useEffect(() => {
    localStorage.setItem("mosta_goal_completion", goalCompletion.toString());
  }, [goalCompletion]);

  // Loading animation message cycler
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAnalyzing) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  // Notification close timer
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const currentData = history[selectedDate];

  // Helper to extract weekday from date
  const getWeekdayName = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };

  // Helper to format date elegantly (e.g. "09 Jun 2026")
  const formatElegantDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Create empty placeholder data for untracked dates
  const createEmptyData = (date: string): DashboardData => {
    return {
      date,
      studySession: { startTime: "Not specified", endTime: "Not specified", totalStudyTime: "0h 00m" },
      summary: { lecturesCount: 0, questionsSolvedCount: 0, revisionTopicsCount: 0, efficiency: "0%" },
      lectures: [],
      questionSources: { moduleQuestions: 0, dppQuestions: 0, pyqQuestions: 0, coachingSheetQuestions: 0, testPaperQuestions: 0 },
      revisionCompleted: [],
      topicsCovered: [],
      importantNotes: []
    };
  };

  // Call server-side pipeline to analyze reports
  const analyzeStudyReport = async (isMerge: boolean = false) => {
    if (!reportInput.trim()) {
      setErrorMessage("Please write or paste your study activities report first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        report: reportInput,
        currentDate: selectedDate
      };

      if (isMerge && currentData) {
        payload.currentData = currentData;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const result: DashboardData = await response.json();
      
      // Update historical data state
      setHistory((prev) => ({
        ...prev,
        [selectedDate]: result
      }));

      // Adjust Goal Completion based on performance dynamically for fun tracking!
      const totalQs = (Object.values(result.questionSources) as number[]).reduce((a, b) => a + b, 0);
      if (totalQs > 50) {
        setGoalCompletion(Math.min(100, Math.floor(goalCompletion + 2)));
      }

      setSuccessMessage(
        isMerge
          ? "Dashboard updated successfully! New study items merged into today's tracking."
          : "Stunning progress! Gemini parsed your report and loaded your JEE Dashboard."
      );
      setReportInput(""); // Clear report box on success
    } catch (error: any) {
      console.error("Analysis failed:", error);
      setErrorMessage(error.message || "Failed to communicate with the Gemini analysis service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add custom manual tracking date
  const handleAddNewDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateInput) return;

    if (history[newDateInput]) {
      setSelectedDate(newDateInput);
      setShowAddDate(false);
      setNewDateInput("");
      setSuccessMessage("Switched to selected date.");
      return;
    }

    setHistory((prev) => ({
      ...prev,
      [newDateInput]: createEmptyData(newDateInput)
    }));
    setSelectedDate(newDateInput);
    setShowAddDate(false);
    setNewDateInput("");
    setSuccessMessage(`New tracking day created for ${newDateInput}!`);
  };

  const handleDeleteDate = (dateKey: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete tracking record?",
      description: `Are you sure you want to permanently delete the study report and dashboard charts for ${formatElegantDate(dateKey)}? This action cannot be reversed.`,
      confirmText: "Yes, Delete",
      cancelText: "Keep Record",
      isDanger: true,
      action: () => {
        setHistory((prev) => {
          const updatedHistory = { ...prev };
          delete updatedHistory[dateKey];
          
          const remainingKeys = Object.keys(updatedHistory);
          if (remainingKeys.length === 0) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");
            setSelectedDate(`${yyyy}-${mm}-${dd}`);
          } else {
            setSelectedDate(remainingKeys[remainingKeys.length - 1]);
          }
          return updatedHistory;
        });
        setSuccessMessage("Tracking record deleted.");
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Array of loading messages for visual rhythm
  const loadingMessages = [
    "Gemini is analyzing your raw study activities...",
    "Extracting JEE lectures details & subject categories...",
    "Summing question source metrics (DPPs, PYQs, Modules)...",
    "Syncing revision tags and calculating study efficiency metrics..."
  ];

  // Function to take screenshot of the active study dashboard (png)
  const downloadDashboardImage = async () => {
    const node = document.getElementById("mosta-dashboard-capture-area");
    if (!node) {
      setErrorMessage("Unable to find the study dashboard elements to capture.");
      return;
    }
    
    setSuccessMessage("Rendering high-contrast screenshot of your JEE study dashboard... Please wait.");
    
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#f8fafc", // Clean aesthetic background
        quality: 0.98,
        style: {
          borderRadius: "0",
          transform: "scale(1)",
        },
      });
      
      const link = document.createElement("a");
      link.download = `MOSTA_JEE_Dashboard_${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
      setSuccessMessage("Successfully downloaded dashboard image! Consistent work pays off. 📸");
    } catch (error: any) {
      console.error("Screenshot capture failed:", error);
      setErrorMessage("Failed to generate report image. Browser security or sandbox environments can sometimes restrict capture.");
    }
  };

  // Function to download full study logs as a standard JSON backup
  const downloadDatabaseJSON = () => {
    try {
      const dataStr = JSON.stringify(history, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `MOSTA_Study_Database_Backup.json`;
      link.href = url;
      link.click();
      setSuccessMessage("Database backup exported successfully! JSON file has downloaded.");
    } catch (error) {
      setErrorMessage("Failed to export JSON database file.");
    }
  };

  // Move to any date dynamically. Initializes co-pilot logs if blank/empty.
  const handleDateChange = (dateStr: string) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    
    if (!history[dateStr]) {
      setHistory((prev) => ({
        ...prev,
        [dateStr]: createEmptyData(dateStr)
      }));
      setSuccessMessage(`Initialized fresh co-pilot day for ${formatElegantDate(dateStr)}`);
    } else {
      setSuccessMessage(`Switched study log to ${formatElegantDate(dateStr)}`);
    }
  };

  // Permanently wipe out browser localStorage with confirmation
  const handleClearAllData = () => {
    setConfirmConfig({
      isOpen: true,
      title: "CRITICAL SYSTEM RESET?",
      description: "Are you sure you want to permanently delete all study reports, history logs, streak points, and preferences from your browser? This action cannot be undone!",
      confirmText: "Yes, Wipe All Data",
      cancelText: "Cancel Reset",
      isDanger: true,
      action: () => {
        localStorage.clear();
        setHistory({});
        setStreak(0);
        setGoalCompletion(0);
        setHasStarted(false);
        setIsSettingsOpen(false);
        setSuccessMessage("All browser data deleted completely. Resetting to default landing state.");
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Easily reload template seeds for high-fidelity evaluation
  const handleLoadDemoData = () => {
    setHistory(SEED_DATA);
    setStreak(15);
    setGoalCompletion(78);
    setSelectedDate("2026-06-09");
    setIsSettingsOpen(false);
    setSuccessMessage("Demo JEE study database populated successfully! Switched to sample logs.");
  };

  // ONBOARDING LANDING PAGE
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans relative overflow-hidden" id="onboarding-landing">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute -top-45 -right-45 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-45 -left-45 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black tracking-tighter text-blue-400">MOSTA</span>
              <span className="text-[9px] tracking-[0.2em] font-bold text-slate-400 uppercase">Academic OS</span>
            </div>
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">JEE STUDY CO-PILOT</span>
          </div>
        </header>

        <main className="max-w-4xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center relative z-10 flex-1 justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold mb-6 animate-pulse uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for JEE Advanced 2027</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl">
            Streamline Your JEE Study Prep with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">MOSTA Academic OS</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-sm max-w-xl mt-6 leading-relaxed">
            An advanced study summary dashboard. Paste unformatted notes detailing the day's lectures and practice fractions. Our inline Gemini intelligence parses everything into structured performance metrics instantly.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-12 text-left">
            <div className="p-4 bg-slate-850 border border-slate-800 rounded-2xl flex gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 h-fit">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">AI Report Parser</h3>
                <p className="text-xs text-slate-400 mt-1">Paste plain unformatted text. Gemini extracts lectures, study intervals, and precise subject categorizations instantly.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-800 rounded-2xl flex gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 h-fit">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Move On Any Day</h3>
                <p className="text-xs text-slate-400 mt-1">Jump to any date in the calendar. Add mock inputs, plan target days, and browse logs with persistent saves.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-800 rounded-2xl flex gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 h-fit">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Dynamic Metrics</h3>
                <p className="text-xs text-slate-400 mt-1">Calculates subject ratio distribution, daily efficiency scores, and tracks study streak durations with manual offset buttons.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-850 border border-slate-800 rounded-2xl flex gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 h-fit">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Dashboard Snapshots</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">Convert current analytics into clean, high-contrast visual PNGs download files with a single action.</p>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <button
              onClick={() => {
                localStorage.setItem("mosta_has_started", "true");
                setHasStarted(true);
                setSuccessMessage("Workspace loaded successfully! Start with empty logs or populate demo data.");
              }}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 font-bold text-sm tracking-wide text-white rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition cursor-pointer"
            >
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        <footer className="border-t border-slate-850 py-6 text-center text-[10px] text-slate-500 font-mono relative z-10">
          <p>© 2026 MOSTA ACADEMIC OS • Engineered for offline-first JEE peak productivity</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-850 flex flex-col font-sans" id="mosta-root">
      {/* SUCCESS / ERROR ALERTS */}
      <div className="fixed top-4 right-4 z-50 max-w-md space-y-2 pointer-events-none">
        {successMessage && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2 animate-bounce pointer-events-auto">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Success</p>
              <p className="text-xs opacity-90">{successMessage}</p>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-950/90 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2 animate-pulse pointer-events-auto">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Action Required</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* SYSTEM CONFIGURATION & SETTINGS COG MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in shrink-0 fade-in zoom-in-95 duration-200 text-slate-800">
            <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400 rotate-45" />
                <span className="font-bold text-sm uppercase tracking-wider">System Settings & Data Control</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Reset zone */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Danger Zone</span>
                </h4>
                <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Erase all tracked study dashboards, custom dates, persistent streak scores, and goal multipliers. <strong>This cannot be undone!</strong>
                  </p>
                  <button
                    onClick={handleClearAllData}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    Clear All Browser Data
                  </button>
                </div>
              </div>

              {/* Sample Data population */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>Interactive Testing</span>
                </h4>
                <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Start instantly with professional pre-populated demo JEE dashboards (for June 8 and June 9) to view the graphics without writing new reports.
                  </p>
                  <button
                    onClick={handleLoadDemoData}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    Load Sample Demo Logs
                  </button>
                </div>
              </div>

              {/* Export Full Backup JSON */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-500" />
                  <span>Local Data Backup</span>
                </h4>
                <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-600 leading-normal flex-1">
                    Download progress records to a local <code>.json</code> database backup file.
                  </p>
                  <button
                    onClick={downloadDatabaseJSON}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BEAUTIFUL CUSTOM COMPLIANT CONFIRMATION DIALOG MODAL */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 text-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${confirmConfig.isDanger ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                {confirmConfig.title}
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {confirmConfig.description}
            </p>
            
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-xl transition cursor-pointer"
              >
                {confirmConfig.cancelText}
              </button>
              
              <button
                onClick={confirmConfig.action}
                className={`flex-1 py-2 px-3 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md active:scale-95 ${
                  confirmConfig.isDanger
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/10"
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/10"
                }`}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-[#0f172a] text-white px-8 py-4 flex flex-col md:flex-row justify-between items-center shrink-0 shadow-lg gap-4" id="mosta-header">
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-6">
            <div className="flex flex-col leading-none">
              <span className="text-3xl font-black tracking-tighter text-blue-400">MOSTA</span>
              <span className="text-[10px] tracking-[0.2em] font-bold text-slate-400">ACADEMIC OS</span>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">JEE Study Dashboard</h2>
              <p className="text-sm font-semibold text-blue-100 leading-none">{getWeekdayName(selectedDate)}, {formatElegantDate(selectedDate)}</p>
            </div>
          </div>

          {/* Quick Timeline Toggle Trigger on Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1 text-xs"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Header Right Content */}
        <div className="flex items-center gap-6 mt-4 md:mt-0 justify-between w-full md:w-auto">
          <div className="text-right hidden sm:block">
            <span className="block text-[10px] uppercase font-bold text-slate-500 leading-none mb-0.5">Target Year</span>
            <span className="text-lg font-bold text-white tracking-tight leading-none">JEE 2027</span>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 italic">"Success is the sum of small efforts"</p>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">— Daily Motivation</p>
            </div>
          </div>

          {/* Settings Trigger Cog */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-inner"
            title="System Settings"
          >
            <Settings className="w-4 h-4 transition-transform duration-500 hover:rotate-95" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* SUB ACTIONS PANEL & HISTORICAL DAY BROWSER */}
      <section className="bg-slate-200/60 border-b border-slate-300/60 py-2.5 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              title="Open date logs"
            >
              <History className="w-4 h-4" />
              <span>Browse Logs ({Object.keys(history).length})</span>
            </button>
            
            <button
              onClick={() => setShowAddDate(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-600/30 text-white transition rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Day</span>
            </button>

            {/* Jump To Date Picker (Move on any day) */}
            <div className="flex items-center gap-2 bg-white border border-slate-300/80 rounded-xl px-3 py-1.5 shadow-xs focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide hidden md:inline">Jump to Day:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 focus:outline-none cursor-pointer outline-none"
                style={{ colorScheme: "light" }}
                title="Select study day"
              />
            </div>
          </div>

          {/* Quick Date selection list */}
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mr-1">Quick Select:</span>
            {Object.keys(history)
              .sort()
              .reverse()
              .slice(0, 5)
              .map((dateKey) => (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs ${
                    selectedDate === dateKey
                      ? "bg-blue-600 text-white font-bold shadow-md border border-blue-500"
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                  }`}
                >
                  {formatElegantDate(dateKey)}
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6" id="mosta-main">
        
        {/* SIDE BAR LAYOUT FOR TIMELINE AND GEMINI INPUT */}
        <section className={`col-span-1 space-y-6 ${isHistoryOpen ? "block" : "hidden lg:block"}`}>
          
          {/* HISTORY MANAGEMENT DRAWER/CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800">
            <div className="bg-slate-800 text-white px-4 py-3 font-semibold tracking-wider text-xs flex items-center justify-between uppercase border-b border-slate-750">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>Saved Study Logs</span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="lg:hidden text-slate-300 hover:text-white"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="p-3 max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar bg-slate-50/50">
              {Object.keys(history)
                .sort()
                .reverse()
                .map((dateKey) => {
                  const item = history[dateKey];
                  const qCount = item ? (Object.values(item.questionSources) as number[]).reduce((a, b) => a + b, 0) : 0;
                  const lecCount = item ? item.lectures.length : 0;
                  const eff = item ? item.summary.efficiency : "0%";
                  
                  return (
                    <div
                      key={dateKey}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition ${
                        selectedDate === dateKey
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedDate(dateKey);
                          // Option to auto-close slider on mobile
                          if (window.innerWidth < 1024) {
                            setIsHistoryOpen(false);
                          }
                        }}
                        className="flex-1 text-left"
                      >
                        <p className={`text-xs font-bold ${selectedDate === dateKey ? "text-blue-700" : "text-slate-850"}`}>
                          {formatElegantDate(dateKey)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {lecCount} Lectures • {qCount} Qs ({eff} Eff)
                        </p>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteDate(dateKey)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* DEDICATED GEMINI AI REPORT PANEL */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 flex flex-col relative pt-6 text-slate-800">
            <div className="absolute -top-3 left-6">
              <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-tighter">
                <span className="animate-pulse text-xs">✦</span> Gemini AI Engine
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-1 mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Paste study report</h3>
                <p className="text-[10px] text-slate-450 leading-normal">Include details of lectures completion, solved questions count and revision topics today.</p>
              </div>

              <textarea
                value={reportInput}
                onChange={(e) => setReportInput(e.target.value)}
                placeholder="Paste your raw daily study report here..."
                className="w-full h-56 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none text-[11px] text-slate-700 placeholder-slate-350 rounded-xl p-4 focus:outline-none font-mono leading-relaxed transition-all"
                disabled={isAnalyzing}
              />
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => analyzeStudyReport(false)}
                  disabled={isAnalyzing}
                  className="bg-blue-600 text-white rounded-xl py-3 text-[10px] font-bold shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest cursor-pointer text-center"
                >
                  Generate Dashboard
                </button>
                <button
                  onClick={() => analyzeStudyReport(true)}
                  disabled={isAnalyzing}
                  className="bg-slate-105 text-slate-650 rounded-xl py-3 text-[10px] font-bold hover:bg-slate-200 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest border border-slate-200 cursor-pointer text-center"
                >
                  Update Stats
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 mt-4 text-[10px] leading-relaxed text-slate-550 space-y-1 font-mono">
                <p className="font-bold text-slate-700 flex items-center gap-1 font-sans text-xs">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Tips for report input:
                </p>
                <p className="opacity-80">Include phrases like:</p>
                <ul className="list-disc pl-4 space-y-0.5 opacity-80 text-[9px]">
                  <li>"Started at 6:30 AM ... ended at 1:45 PM"</li>
                  <li>"Optics Lec 2 (1h 15m), Optics Lec 3 (1h 20m)"</li>
                  <li>"Solved 32 module questions, 21 DPPs, 18 PYQs"</li>
                  <li>"Revised Ray Optics, Chemical Bonding"</li>
                </ul>
              </div>
            </div>
          </div>

        </section>

        {/* STUDY DASHBOARD SECTION DISPLAY */}
        <section className={`col-span-1 lg:col-span-3 space-y-6 ${isHistoryOpen ? "blur-sm pointer-events-none lg:blur-none lg:pointer-events-auto" : ""}`}>
          
          {/* MANUAL ADD NEW DATE DIALOG MODAL */}
          {showAddDate && (
            <div className="bg-[#0f172a] border border-blue-900/50 p-4 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-250">
              <button
                onClick={() => setShowAddDate(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">
                Create New Day Study Tracker
              </h3>
              <form onSubmit={handleAddNewDate} className="flex gap-3 max-w-md">
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="bg-[#040812] border border-blue-950 p-2 text-xs rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition uppercase"
                >
                  Create Day
                </button>
              </form>
            </div>
          )}

          {/* AI ANALYZING RUNNING LAYER SCREEN */}
          {isAnalyzing && (
            <div className="bg-slate-950/80 border border-blue-500/30 backdrop-blur-md p-8 rounded-3xl flex flex-col items-center justify-center text-center py-16 animate-pulse shadow-2xl">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-900 border-t-indigo-400 animate-spin"></div>
                <Sparkles className="w-8 h-8 text-yellow-300 absolute top-4 left-4 animate-bounce" />
              </div>
              <h3 className="text-lg font-black tracking-wide text-white font-sans uppercase">
                MOSTA AI PROCESSING PIPELINE
              </h3>
              <div className="h-2 w-48 bg-blue-950 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-blue-400 animate-infinite-loading rounded-full" style={{ width: "60%" }}></div>
              </div>
              <p className="text-sm text-slate-300 font-medium max-w-md mt-4 transition-all duration-300 animate-fade">
                "{loadingMessages[loadingStep]}"
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Gemini is securely structuring your natural language input. Please wait...
              </p>
            </div>
          )}

          {!isAnalyzing && !currentData && (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center py-20 shadow-sm text-slate-800">
              <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-4 border border-blue-105">
                <ClipboardList className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-slate-805 uppercase tracking-wide">
                Uncharted Study Day
              </h3>
              <p className="text-slate-500 text-xs max-w-sm mt-2">
                No study report has been logged yet for the selected date <strong>{selectedDate}</strong>.
              </p>
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs max-w-md space-y-2">
                <p className="font-bold text-slate-700">How to get started:</p>
                <p className="text-slate-500 leading-relaxed">
                  Provide your daily activities report details in the <strong>Gemini AI Panel</strong> on the left, then click <strong>Generate Dashboard</strong> to build this day's analytics!
                </p>
              </div>
            </div>
          )}

          {/* CORE COMPLIANT DASHBOARD VISUALS */}
          {!isAnalyzing && currentData && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* REAL-TIME CONTROLS PANEL FOR CAPTURING AND DOWNLOADING LOGS */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm select-all">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    ACTIVE METRICS HUB:
                  </span>
                  <span className="text-xs font-black text-slate-800 font-mono bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl">
                    {selectedDate}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={downloadDashboardImage}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 active:scale-95 transition cursor-pointer"
                    title="Export styled image of this day's workspace"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Download Dashboard Image</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!currentData) return;
                      try {
                        const dataStr = JSON.stringify({ [selectedDate]: currentData }, null, 2);
                        const blob = new Blob([dataStr], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.download = `MOSTA_Day_Data_${selectedDate}.json`;
                        link.href = url;
                        link.click();
                        setSuccessMessage(`Day log snapshot successfully downloaded as JSON!`);
                      } catch (err) {
                        setErrorMessage("Export snapshot failed.");
                      }
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl active:scale-95 transition cursor-pointer"
                    title="Get a offline backup JSON files of the active study day"
                  >
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Get Today's Data</span>
                  </button>
                </div>
              </div>

              {/* IMAGES REFINEMENT BOX DESIGNATED AS THE SCREENSHOT CAPTURE AREA */}
              <div id="mosta-dashboard-capture-area" className="p-4 bg-slate-50 border border-slate-200/60 rounded-3xl space-y-6">
                
                {/* ROW 1: STATS CARDS ROW (5 Columns grid layout) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 col-span-1">
                
                {/* 1. Lectures Completed */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-slate-800 flex items-center gap-3.5 group hover:shadow-md transition duration-200">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition duration-200">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-blue-600 leading-none">
                      {String(currentData.summary.lecturesCount).padStart(2, "0")}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-tight">
                      Lectures<br />Completed
                    </p>
                  </div>
                </div>

                {/* 2. Questions Solved */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-slate-800 flex items-center gap-3.5 group hover:shadow-md transition duration-200">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition duration-200 block">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-blue-600 leading-none">
                      {currentData.summary.questionsSolvedCount}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-tight">
                      Questions<br />Solved
                    </p>
                  </div>
                </div>

                {/* 3. Revision Topics */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-slate-800 flex items-center gap-3.5 group hover:shadow-md transition duration-200">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition duration-200">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-blue-600 leading-none">
                      {String(currentData.summary.revisionTopicsCount).padStart(2, "0")}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-tight">
                      Revision<br />Topics
                    </p>
                  </div>
                </div>

                {/* 4. Study Time (Total) */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-slate-800 flex items-center gap-3.5 group hover:shadow-md transition duration-200">
                  <div className="p-3 bg-slate-105 text-slate-600 rounded-2xl group-hover:scale-105 transition duration-200">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-800 leading-none font-sans tracking-tight">
                      {currentData.studySession.totalStudyTime.includes("h") ? (
                        <>
                          {currentData.studySession.totalStudyTime.split(" ")[0]} <span className="text-lg font-bold">{currentData.studySession.totalStudyTime.split(" ")[1] || ""}</span>
                        </>
                      ) : (
                        currentData.studySession.totalStudyTime
                      )}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 leading-tight">
                      Study Time<br />(Total)
                    </p>
                  </div>
                </div>

                {/* 5. Today's Efficiency */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-slate-800 flex items-center gap-3.5 col-span-2 md:col-span-1 group hover:shadow-md transition duration-200 relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Efficiency</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-emerald-600">{currentData.summary.efficiency}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-500" style={{ width: currentData.summary.efficiency }}></div>
                </div>

              </div>

              {/* TWO COLUMN GRID BELOW INDEX CARDS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* LEFT COLLATERAL CARDS (Lectures, Study Session, Topics Covered) */}
                <div className="space-y-6">

                  {/* 1. LECTURES COMPLETED TABLE */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                    <div className="bg-slate-105 border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-xs flex items-center gap-2 uppercase text-slate-700">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Lectures Completed</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2 px-4 w-12">#</th>
                            <th className="py-2 px-4">Lecture Name</th>
                            <th className="py-2 px-4">Subject</th>
                            <th className="py-2 px-4 w-28">Duration</th>
                            <th className="py-2 px-4 w-12 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentData.lectures.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 px-4 text-center text-slate-400 italic">
                                No lectures recorded for this log entry.
                              </td>
                            </tr>
                          ) : (
                            currentData.lectures.map((lec, idx) => {
                              // Standard colors for subjects matching screenshot
                              let badgeColor = "bg-slate-100 text-slate-700";
                              const subj = lec.subject?.toLowerCase() || "";
                              if (subj.includes("physics")) {
                                badgeColor = "bg-[#e0f2fe] text-[#0369a1] border border-blue-100";
                              } else if (subj.includes("chemistry")) {
                                badgeColor = "bg-[#dcfce7] text-[#15803d] border border-green-100";
                              } else if (subj.includes("math")) {
                                badgeColor = "bg-[#ffedd5] text-[#c2410c] border border-orange-100";
                              } else if (subj.includes("english")) {
                                badgeColor = "bg-[#f3e8ff] text-[#6b21a8] border border-purple-100";
                              }

                              return (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                                  <td className="py-2.5 px-4 font-semibold text-slate-800">{lec.name}</td>
                                  <td className="py-2.5 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                                      {lec.subject}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-slate-600 font-medium">{lec.duration}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className="inline-block p-0.5 bg-emerald-100 text-emerald-600 rounded-full">
                                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-50 px-4 py-2 text-right border-t border-slate-100">
                      <button className="text-blue-600 hover:text-blue-500 font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1">
                        <span>View All Lectures</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 2. STUDY SESSION CARD */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                    <div className="bg-slate-105 border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-xs flex items-center gap-2 uppercase text-slate-700">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Study Session Details</span>
                    </div>

                    <div className="p-4 grid grid-cols-3 gap-4 text-center">
                      
                      {/* Start Time */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full mb-1">
                          <Play className="w-4.5 h-4.5 fill-current" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Start Time
                        </p>
                        <p className="text-sm font-black text-slate-800 mt-1 font-mono">
                          {currentData.studySession.startTime}
                        </p>
                      </div>

                      {/* End Time */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex flex-col items-center justify-center">
                        <div className="p-2 bg-rose-100 text-rose-700 rounded-full mb-1">
                          <Square className="w-4.5 h-4.5 fill-current" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          End Time
                        </p>
                        <p className="text-sm font-black text-slate-800 mt-1 font-mono">
                          {currentData.studySession.endTime}
                        </p>
                      </div>

                      {/* Total Duration */}
                      <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-200 flex flex-col items-center justify-center">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-full mb-1">
                          <Clock className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Time
                        </p>
                        <p className="text-sm font-black text-blue-700 mt-1 font-mono">
                          {currentData.studySession.totalStudyTime}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* 3. TOPICS COVERED TODAY */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                    <div className="bg-slate-105 border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-xs flex items-center gap-2 uppercase text-slate-700">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span>Topics Covered Today</span>
                    </div>

                    <div className="p-5 flex flex-col md:flex-row gap-6 justify-between items-start">
                      <ul className="space-y-2.5 flex-1 w-full">
                        {currentData.topicsCovered.length === 0 ? (
                          <li className="text-slate-400 italic text-xs">No specific topics extracted.</li>
                        ) : (
                          currentData.topicsCovered.map((topic, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                              <span className="leading-tight">{topic}</span>
                            </li>
                          ))
                        )}
                      </ul>

                      {/* STYLISH SVGs ART ACCENT EMBEDDED TO MATCH REFS */}
                      <div className="hidden sm:block shrink-0 self-center self-end opacity-20 hover:opacity-40 transition pointer-events-none p-2 bg-[#f0f4ff]/40 rounded-xl">
                        <svg className="w-32 h-20 text-blue-600" viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="1.5">
                          {/* Books drawing */}
                          <rect x="10" y="35" width="25" height="15" rx="1" fill="#bfdbfe" />
                          <line x1="10" y1="40" x2="35" y2="40" />
                          <rect x="15" y="15" width="15" height="20" rx="1" rotate="10" />
                          {/* Desk lamp drawing */}
                          <path d="M50 50 L70 50" strokeWidth="2" />
                          <path d="M60 50 Q60 25 75 25" />
                          <circle cx="75" cy="25" r="4" fill="currentColor" />
                          <path d="M70 27 L80 32" strokeWidth="2" />
                          {/* Lights emission dots */}
                          <line x1="72" y1="35" x2="68" y2="42" strokeDasharray="2 2" />
                          <line x1="78" y1="35" x2="78" y2="42" strokeDasharray="2 2" />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT COLLATERAL CARDS (Questions, Revision, Notes) */}
                <div className="space-y-6">

                  {/* 1. QUESTION SOURCES */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                    <div className="bg-slate-105 border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-xs flex items-center gap-2 uppercase text-slate-700">
                      <Folder className="w-4 h-4 text-blue-600" />
                      <span>Question Sources Block</span>
                    </div>

                    <div className="p-4 space-y-2.5">
                      {/* Module Qs */}
                      <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                          <span>Module Questions</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold font-mono text-[11px] rounded-lg border border-blue-100">
                          {currentData.questionSources.moduleQuestions} Qs
                        </span>
                      </div>

                      {/* DPP Qs */}
                      <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                          <span>DPP (Daily Practice Problems)</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold font-mono text-[11px] rounded-lg border border-blue-100">
                          {currentData.questionSources.dppQuestions} Qs
                        </span>
                      </div>

                      {/* PYQ Qs */}
                      <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                          <span>PYQ (Previous Year Questions)</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold font-mono text-[11px] rounded-lg border border-blue-100">
                          {currentData.questionSources.pyqQuestions} Qs
                        </span>
                      </div>

                      {/* Coaching Sheet */}
                      <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                          <span>Coaching Sheet</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold font-mono text-[11px] rounded-lg border border-blue-100">
                          {currentData.questionSources.coachingSheetQuestions} Qs
                        </span>
                      </div>

                      {/* Test Papers */}
                      <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                          <span>Test Paper Questions</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold font-mono text-[11px] rounded-lg border border-blue-100">
                          {currentData.questionSources.testPaperQuestions} Qs
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 px-4 py-2 text-right border-t border-slate-100">
                      <button className="text-blue-600 hover:text-blue-500 font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1">
                        <span>View All Sources</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 2. REVISION COMPLETED */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                    <div className="bg-slate-105 border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-xs flex items-center gap-2 uppercase text-slate-700">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin-slow" />
                      <span>Revision Completed</span>
                    </div>

                    <div className="p-4 flex flex-wrap gap-2.5">
                      {currentData.revisionCompleted.length === 0 ? (
                        <p className="text-slate-400 italic text-xs">No revision modules logged.</p>
                      ) : (
                        currentData.revisionCompleted.map((topic, i) => (
                          <div
                            key={i}
                            className="bg-blue-50/60 hover:bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition"
                          >
                            <span className="w-3.5 h-3.5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[9px]">
                              ✓
                            </span>
                            <span>{topic}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3. IMPORTANT NOTES */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-slate-800 relative">
                    <div className="bg-slate-105 border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-xs flex items-center gap-2 uppercase text-slate-700">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      <span>Important notes</span>
                    </div>

                    <div className="p-4 flex flex-col md:flex-row gap-4 items-start relative min-h-[140px]">
                      
                      {/* Notes bullet points with golden star icons */}
                      <ul className="space-y-3 flex-1 w-full z-10">
                        {currentData.importantNotes.length === 0 ? (
                          <li className="text-slate-400 italic text-xs">No notes or practice advice.</li>
                        ) : (
                          currentData.importantNotes.map((note, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700 leading-relaxed">
                              <span className="text-amber-500 shrink-0 text-sm">★</span>
                              <span>{note}</span>
                            </li>
                          ))
                        )}
                      </ul>

                      {/* STICKY STYLED PINNED ALERT NOTE overlay */}
                      <div className="w-36 shrink-0 relative rotate-2 bg-[#fef08a] border border-yellow-300 p-3 rounded-md shadow-lg hidden sm:block animate-pulse">
                        {/* Red pushpin drawing */}
                        <div className="absolute -top-3 left-1/2 -ml-2 w-4 h-4 z-20">
                          <div className="w-3.5 h-3.5 bg-rose-600 rounded-full mx-auto relative shadow-md">
                            <div className="w-1 h-3 bg-neutral-400 absolute left-1/2 -ml-[1.5px] top-2"></div>
                          </div>
                        </div>
                        <p className="text-[9px] font-mono font-bold text-amber-800 uppercase tracking-wider mb-1.5 border-b border-amber-200 pb-0.5 text-center">
                          CRITICAL TIP
                        </p>
                        <p className="text-[10px] text-amber-950 font-bold italic leading-tight">
                          Solve at least 25 PYQs every day for optics practice!
                        </p>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

              </div> {/* Ends mosta-dashboard-capture-area capture frame */}

            </div>
          )}

        </section>

      </main>

      {/* BOTTOM PROGRESS AND STREAK STATUS BAR */}
      <footer className="bg-[#0f172a] text-white border-t border-slate-700/40 px-4 py-4 lg:px-8 mt-auto shadow-inner" id="mosta-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Productivity Streak section */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-500">
              <Flame className="w-6 h-6 fill-amber-500 animate-bounce" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                PRODUCTIVITY STREAK
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-450 font-sans tracking-tight">
                  {streak} Days
                </span>
                <span className="text-[10px] text-slate-450 font-mono">Consolidated</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-3">
              <button
                onClick={() => setStreak((prev) => prev + 1)}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700/80 rounded-lg text-[9px] font-bold hover:bg-slate-700 active:scale-95 text-slate-200 transition"
              >
                +1 Day
              </button>
              <button
                onClick={() => setStreak((prev) => Math.max(0, prev - 1))}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700/80 rounded-lg text-[9px] font-bold hover:bg-slate-700 active:scale-95 text-slate-200 transition"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-700/50"></div>

          {/* Goal Completion section */}
          <div className="flex-1 max-w-lg w-full">
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-[#10b981]" />
                <span>GOAL COMPLETION PROGRESS</span>
              </p>
              <span className="text-sm font-black text-[#10b981] font-mono">{goalCompletion}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full border border-slate-700/40 overflow-hidden p-[2px]">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-[#10b981] rounded-full transition-all duration-500"
                style={{ width: `${goalCompletion}%` }}
              ></div>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-700/50"></div>

          {/* Academic disclaimer info credits */}
          <div className="text-center md:text-right text-[10px] text-slate-405 font-mono">
            <p>MOSTA Tracker Engine v1.2</p>
            <p className="text-slate-400 mt-0.5">Optimized for JEE Advanced 2027</p>
          </div>

        </div>
      </footer>
    </div>
  );
}

