"use client";

import { CompilerWorkspace } from "@/app/components/compiler-workspace";
import { useCompiler } from "@/app/hooks/useCompiler";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  const {
    languages,
    files,
    activeFileId,
    language,
    code,
    stdin,
    output,
    loading,
    languageLoading,
    filesLoading,
    saving,
    setStdin,
    setCode,
    selectLanguage,
    selectFile,
    createFile,
    renameFile,
    deleteFile,
    runCode,
  } = useCompiler({
    isAuthenticated: status === "authenticated",
    authLoading: status === "loading",
    userEmail: session?.user?.email || undefined,
  });

  return (
    <CompilerWorkspace
      authStatus={status}
      sessionEmail={session?.user?.email}
      languages={languages}
      files={files}
      activeFileId={activeFileId}
      selectedLanguage={language}
      code={code}
      stdin={stdin}
      output={output}
      loading={loading}
      languageLoading={languageLoading}
      filesLoading={filesLoading}
      saving={saving}
      onSignIn={() => signIn("google")}
      onSignOut={() => signOut()}
      onLanguageChange={selectLanguage}
      onSelectFile={selectFile}
      onCreateFile={createFile}
      onRenameFile={renameFile}
      onDeleteFile={deleteFile}
      onCodeChange={setCode}
      onStdinChange={setStdin}
      onRun={runCode}
    />
  );
}