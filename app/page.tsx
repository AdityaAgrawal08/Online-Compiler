"use client";

import { CompilerWorkspace } from "@/app/components/compiler-workspace";
import { useCompiler } from "@/app/hooks/useCompiler";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const {
    languages,
    language,
    code,
    stdin,
    output,
    loading,
    languageLoading,
    setStdin,
    setCode,
    selectLanguage,
    runCode,
  } = useCompiler();
  const { data: session, status } = useSession();

  return (
    <CompilerWorkspace
      authStatus={status}
      sessionEmail={session?.user?.email}
      languages={languages}
      selectedLanguage={language}
      code={code}
      stdin={stdin}
      output={output}
      loading={loading}
      languageLoading={languageLoading}
      onSignIn={() => signIn("google")}
      onSignOut={() => signOut()}
      onLanguageChange={selectLanguage}
      onCodeChange={setCode}
      onStdinChange={setStdin}
      onRun={runCode}
    />
  );
}