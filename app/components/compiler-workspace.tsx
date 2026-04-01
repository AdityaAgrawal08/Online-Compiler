"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { EditorFile, Language } from "@/app/types/compiler";
import { FileDrawer } from "@/app/components/file-drawer";
import { registerMonacoCompletionProviders } from "@/app/lib/monaco-suggestions";
import { useState } from "react";

let completionProvidersRegistered = false;

type CompilerWorkspaceProps = {
  authStatus: "loading" | "authenticated" | "unauthenticated";
  sessionEmail?: string | null;
  languages: Language[];
  files: EditorFile[];
  activeFileId: string;
  selectedLanguage: string;
  code: string;
  stdin: string;
  output: string;
  loading: boolean;
  languageLoading: boolean;
  filesLoading: boolean;
  saving: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onLanguageChange: (languageId: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateFile: () => void;
  onRenameFile: (fileId: string, nextName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onCodeChange: (value: string) => void;
  onStdinChange: (value: string) => void;
  onRun: () => void;
};

export function CompilerWorkspace({
  authStatus,
  sessionEmail,
  languages,
  files,
  activeFileId,
  selectedLanguage,
  code,
  stdin,
  output,
  loading,
  languageLoading,
  filesLoading,
  saving,
  onSignIn,
  onSignOut,
  onLanguageChange,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onCodeChange,
  onStdinChange,
  onRun,
}: CompilerWorkspaceProps) {
  const runActionRef = useRef(onRun);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    runActionRef.current = onRun;
  }, [onRun]);

  return (
    <div className="app-shell">
      <FileDrawer
        open={drawerOpen}
        files={files}
        activeFileId={activeFileId}
        onClose={() => setDrawerOpen(false)}
        onSelect={(fileId) => {
          onSelectFile(fileId);
          setDrawerOpen(false);
        }}
        onCreate={() => {
          onCreateFile();
          setDrawerOpen(false);
        }}
        onRename={onRenameFile}
        onDelete={onDeleteFile}
      />

      <header className="top-bar">
        <div className="top-left-group">
          <button
            type="button"
            className="icon-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open files menu"
          >
            <span className="icon-lines" />
          </button>

          <div className="brand-block">
            <h1>Online Compiler</h1>
            <p>
              {saving
                ? "Autosaving..."
                : authStatus === "loading"
                ? "Checking session..."
                : sessionEmail
                  ? `Signed in as ${sessionEmail}`
                  : "Guest mode"}
            </p>
          </div>
        </div>

        <div className="bar-controls">
          <select
            disabled={languageLoading || filesLoading || languages.length === 0}
            value={selectedLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name} ({lang.version})
              </option>
            ))}
          </select>

          <button
            type="button"
            className="primary-button"
            disabled={loading || languageLoading || !selectedLanguage}
            onClick={onRun}
          >
            {loading ? "Running..." : "Run"}
          </button>

          {sessionEmail ? (
            <button type="button" className="ghost-button" onClick={onSignOut}>
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className="ghost-button"
              onClick={onSignIn}
              disabled={authStatus === "loading"}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel editor-panel">
          <div className="panel-label">Editor</div>
          <div className="editor-wrap">
            <Editor
              height="100%"
              language={selectedLanguage}
              value={code}
              theme="gruvbox-dark"
              onChange={(value) => onCodeChange(value ?? "")}
              onMount={(editor, monacoInstance) => {
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

                if (!completionProvidersRegistered) {
                  registerMonacoCompletionProviders(monacoInstance);
                  completionProvidersRegistered = true;
                }

                editor.addCommand(
                  monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
                  () => {
                    runActionRef.current();
                  }
                );
              }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                insertSpaces: true,
                autoIndent: "advanced",
                detectIndentation: false,
              }}
            />
          </div>

          <div className="panel-label">Program Input</div>
          <textarea
            rows={4}
            value={stdin}
            onChange={(event) => onStdinChange(event.target.value)}
            placeholder="Enter input"
          />
        </section>

        <section className="panel output-panel">
          <div className="panel-label">Output</div>
          <pre className="output-block">
            {output || (languageLoading || filesLoading ? "Loading workspace..." : "Ready.")}
          </pre>
        </section>
      </main>
    </div>
  );
}
