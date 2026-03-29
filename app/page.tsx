"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { submitCode, getResult, getLanguages } from "@/lib/api";
import { useSession, signIn, signOut } from "next-auth/react";

type Language = {
  id: string;
  name: string;
  version: string;
  description: string;
  example: string;
};

const matrixTokens = [
  "0",
  "1",
  "<",
  ">",
  "[",
  "]",
  "{",
  "}",
  "(",
  ")",
  "|",
  "/",
  "\\",
  "💻",
  "🐍",
  "☕",
  "🐘",
  "🧠",
  "🚀",
  "✨",
  "🧪",
  "⚡",
  "🛠",
  "🌐",
  "📦",
];

const createMatrixStream = () =>
  Array.from({ length: 36 }, () =>
    matrixTokens[Math.floor(Math.random() * matrixTokens.length)]
  ).join("\n");

const matrixStreams = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  left: `${index * 5}%`,
  delay: `${-(Math.random() * 4 + 0.5).toFixed(2)}s`,
  duration: `${8 + Math.random() * 7}s`,
  opacity: `${0.18 + Math.random() * 0.28}`,
  text: createMatrixStream(),
}));

const progressLines = [
  "Activating cinematic bridge...",
  "Rendering briefing frames...",
  "Calibrating scene lighting...",
  "Aligning runtime story beats...",
  "Finalizing transition sequence...",
];

function LoadingScreen({
  title,
  subtitle,
  actionLabel,
  actionHandler,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHandler?: () => void;
}) {
  return (
    <div className="loading-screen">
      <div className="loading-shell">
        <div className="cutscene-header">
          <span className="cutscene-tag">CUTSCENE</span>
          <span className="cutscene-divider" />
          <span className="cutscene-note">Briefing sequence engaged</span>
        </div>
        <div className="loader-title">{title}</div>
        <div className="loader-subtitle">{subtitle}</div>
        <div className="loader-steps">
          {progressLines.map((line, index) => (
            <div key={line} className="loader-step" style={{ animationDelay: `${index * 0.2}s` }}>
              <span className="loader-bullet">›</span>
              {line}
            </div>
          ))}
        </div>
        <div className="loader-bar">
          <span className="loader-progress" />
        </div>
        {actionLabel && actionHandler ? (
          <button className="loader-action" onClick={actionHandler}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const editorRef = useRef<any>(null);
  const languageRef = useRef<string>("");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [stdin, setStdin] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { data: session, status } = useSession();

  // Load languages from backend
  useEffect(() => {
    async function loadLanguages() {
      try {
        const res = await getLanguages();
        const backendLanguages: Language[] =
          res?.data?.languages || [];

        if (backendLanguages.length > 0) {
          setLanguages(backendLanguages);

          const first = backendLanguages[0];
          setLanguage(first.id);
          setCode(first.example || "");
        }
      } catch {
        setOutput("Failed to load languages.");
      }
    }

    loadLanguages();
  }, []);
  
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  async function handleRun() {
    const activeLanguage = languageRef.current;
    if (!activeLanguage) return;

    const currentCode = editorRef.current?.getValue();
    if (!currentCode) return;

    if (currentCode.length > 100000) {
      setOutput("Code exceeds 100KB limit.");
      return;
    }

    setLoading(true);
    setOutput("Submitting...");

    try {
      const submit = await submitCode({
        language: activeLanguage,
        code: currentCode,
        inputs: [stdin],
      });

      const jobId = submit?.data?.job_id;
      if (!jobId) {
        setOutput("Invalid response from server.");
        setLoading(false);
        return;
      }

      let status = "QUEUED";
      let result: any;

      while (status === "QUEUED" || status === "RUNNING") {
        await new Promise((r) => setTimeout(r, 800));
        result = await getResult(jobId);
        status = result?.data?.status;
      }

      const first = result?.data?.results?.[0];

      if (first?.stdout) setOutput(first.stdout);
      else if (first?.stderr) setOutput(first.stderr);
      else setOutput(`Execution finished with status: ${status}`);
    } catch (e: any) {
      setOutput(`Execution error. ${e?.message || ""}`);
    }

    setLoading(false);
  }

  if (status === "loading") {
    return (
      <LoadingScreen
        title="Verifying secure session"
        subtitle="Authenticating your identity with a mission-briefing cutscene..."
      />
    );
  }

  if (!session) {
    return (
      <div className="signin-page">
        <div className="matrix-background" aria-hidden="true">
          {matrixStreams.map((stream) => (
            <div
              key={stream.id}
              className="matrix-column"
              style={
                {
                  left: stream.left,
                  opacity: stream.opacity,
                  ["--matrix-duration" as any]: stream.duration,
                  ["--matrix-delay" as any]: stream.delay,
                } as React.CSSProperties
              }
            >
              <pre>{stream.text}</pre>
            </div>
          ))}
        </div>

        <div className="signin-panel">
          <div className="signin-card">
            <div className="signin-badge">Secure Access</div>
            <h1>Welcome to the Code Vault</h1>
            <p className="signin-lead">Sign in with Google to unlock your editor, deploy the compiler matrix, and start building.</p>
            <div className="language-chip-row">
              {['💻', '🐍', '☕', '⚛️', '🟨', '📦', '🚀'].map((emoji) => (
                <span key={emoji} className="lang-chip">{emoji}</span>
              ))}
            </div>
            <button className="signin-button" onClick={() => signIn("google")}>Sign in with Google</button>
          </div>
        </div>
      </div>
    );
  }

  if (languages.length === 0) {
    return (
      <LoadingScreen
        title="Cutscene engaged"
        subtitle="A short briefing is masking the load while the compiler world comes online."
        actionLabel="Abort sequence"
        actionHandler={() => signOut()}
      />
    );
  }

  return (
  <div className="container">
    <div className="header">
      <div className="title">Online Compiler</div>
      <div className="auth-info">
        <span>Signed in as {session.user?.email}</span>
        <button onClick={() => signOut()} className="signout-button">
          Sign out
        </button>
      </div>

      <div className="controls">
        <select
          value={language}
          onChange={(e) => {
            const newLangId = e.target.value;
            const selected = languages.find(
              (l) => l.id === newLangId
            );

            setLanguage(newLangId);
            if (editorRef.current) {
              editorRef.current.setValue(selected?.example || "");
            }
            setStdin("");
            setOutput("");
          }}
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name} ({lang.version})
            </option>
          ))}
        </select>

        <button
          onClick={handleRun}
          disabled={loading}
          className="run-button"
        >
          {loading ? "Running..." : "Run"}
        </button>
      </div>
    </div>

    <div className="main">
      <div className="panel editor-panel">
        <div className="section-header">Editor</div>

        <div className="editor-container">
          <Editor
            height="100%"
            language={language}
            defaultValue={code}
            theme="gruvbox-dark"
            onMount={(editor, monacoInstance) => {
              editorRef.current = editor;

              monacoInstance.editor.defineTheme("gruvbox-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [
                  { token: "", foreground: "ebdbb2" },
                  { token: "comment", foreground: "928374", fontStyle: "italic" },
                  { token: "keyword", foreground: "fb4934" },
                  { token: "number", foreground: "d3869b" },
                  { token: "string", foreground: "b8bb26" },
                  { token: "type", foreground: "fabd2f" },
                  { token: "function", foreground: "83a598" },
                  { token: "variable", foreground: "ebdbb2" },
                  { token: "constant", foreground: "fe8019" },
                  { token: "operator", foreground: "fe8019" },
                ],
                colors: {
                  "editor.background": "#282828",
                  "editor.foreground": "#ebdbb2",
                  "editorCursor.foreground": "#fabd2f",
                  "editor.lineHighlightBackground": "#3c3836",
                  "editorLineNumber.foreground": "#7c6f64",
                  "editorLineNumber.activeForeground": "#fabd2f",
                  "editor.selectionBackground": "#504945",
                  "editor.inactiveSelectionBackground": "#3c3836",
                  "editorIndentGuide.background": "#3c3836",
                  "editorIndentGuide.activeBackground": "#fabd2f",
                },
              });

              monacoInstance.editor.setTheme("gruvbox-dark");

              editor.addCommand(
                monacoInstance.KeyMod.CtrlCmd |
                  monacoInstance.KeyCode.Enter,
                () => {
                  handleRun()
                }
              );
            }}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              insertSpaces: true,
              autoIndent: "advanced",
              detectIndentation: false
            }}
          />
        </div>

        <div className="input-area">
          <div className="section-header">Program Input</div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            placeholder="Enter input..."
          />
        </div>
      </div>

      <div className="panel output-panel">
        <div className="section-header">Output</div>
        <div className="output-content">{output}</div>
      </div>
    </div>
  </div>
);
}