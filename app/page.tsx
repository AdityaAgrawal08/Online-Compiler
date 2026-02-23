"use client";

import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { submitCode, getResult, getLanguages } from "@/lib/api";

type Language = {
  id: string;
  name: string;
  version: string;
  description: string;
  example: string;
};

export default function Home() {
  const editorRef = useRef<any>(null);
  const languageRef = useRef<string>("");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [stdin, setStdin] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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

  if (languages.length === 0) {
    return <div style={{ padding: 20 }}>Loading languages...</div>;
  }

  return (
  <div className="container">
    <div className="header">
      <div className="title">Online Compiler</div>

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