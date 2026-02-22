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

  async function handleRun() {
    if (!language) return;

    const currentCode = editorRef.current?.getValue() ?? code;
    if (currentCode.length > 100000) {
      setOutput("Code exceeds 100KB limit.");
      return;
    }

    setLoading(true);
    setOutput("Submitting...");

    try {
      const submit = await submitCode({
        language,
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
        await new Promise((r) => setTimeout(r, 1000));
        result = await getResult(jobId);
        status = result?.data?.status;
      }

      if (!result?.data) {
        setOutput("Failed to retrieve result.");
      } else {
        const finalStatus = result.data.status;

        if (result.data.results?.length > 0) {
          const first = result.data.results[0];

          if (first.stdout) {
            setOutput(first.stdout);
          } else if (first.stderr) {
            setOutput(first.stderr);
          } else {
            setOutput(
              `Execution finished with status: ${finalStatus}`
            );
          }
        } else {
          setOutput(
            `Execution finished with status: ${finalStatus}`
          );
        }
      }
    } catch (e: any) {
      setOutput(`Execution error. ${e?.message || ""}`);
    }

    setLoading(false);
  }

  if (languages.length === 0) {
    return <div style={{ padding: 20 }}>Loading languages...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Online Compiler</h1>

      <select
        value={language}
        onChange={(e) => {
          const newLangId = e.target.value;
          const selected = languages.find(
            (l) => l.id === newLangId
          );

          setLanguage(newLangId);
          setCode(selected?.example || "");

          // Clear execution state
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

      <div style={{ border: "1px solid #333", marginTop: 10 }}>
        <Editor
          height="400px"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(value) => setCode(value || "")}
          onMount={(editor, monacoInstance) => {
            editorRef.current = editor;
            editor.addCommand(
              monacoInstance.KeyMod.CtrlCmd |
                monacoInstance.KeyCode.Enter,
              () => handleRun()
            );
          }}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <h3>Program Input</h3>
        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 8,
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #333",
          }}
          placeholder="Enter input for your program..."
        />
      </div>

      <button
        onClick={handleRun}
        disabled={loading}
        style={{ marginTop: 10 }}
      >
        {loading ? "Running..." : "Run"}
      </button>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 10,
          marginTop: 10,
          minHeight: 120,
        }}
      >
        {output}
      </pre>
    </div>
  );
}