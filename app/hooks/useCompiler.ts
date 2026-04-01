"use client";

import { useCallback, useEffect, useState } from "react";
import { getLanguages, getResult, submitCode } from "@/lib/api";
import type { Language } from "@/app/types/compiler";

type UseCompilerState = {
  languages: Language[];
  language: string;
  code: string;
  stdin: string;
  output: string;
  loading: boolean;
  languageLoading: boolean;
  setStdin: (value: string) => void;
  setCode: (value: string) => void;
  selectLanguage: (languageId: string) => void;
  runCode: () => Promise<void>;
};

const CODE_LIMIT = 100_000;
const POLL_INTERVAL_MS = 800;

export function useCompiler(): UseCompilerState {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState("");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLanguages() {
      try {
        const res = await getLanguages();
        const backendLanguages: Language[] = res?.data?.languages || [];

        if (cancelled) {
          return;
        }

        setLanguages(backendLanguages);

        if (backendLanguages.length > 0) {
          const first = backendLanguages[0];
          setLanguage(first.id);
          setCode(first.example || "");
        } else {
          setOutput("No languages available.");
        }
      } catch {
        if (!cancelled) {
          setOutput("Failed to load languages.");
        }
      } finally {
        if (!cancelled) {
          setLanguageLoading(false);
        }
      }
    }

    void loadLanguages();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectLanguage = useCallback(
    (languageId: string) => {
      const selected = languages.find((lang) => lang.id === languageId);
      setLanguage(languageId);
      setCode(selected?.example || "");
      setStdin("");
      setOutput("");
    },
    [languages]
  );

  const runCode = useCallback(async () => {
    if (!language) {
      return;
    }

    if (!code) {
      return;
    }

    if (code.length > CODE_LIMIT) {
      setOutput("Code exceeds 100KB limit.");
      return;
    }

    setLoading(true);
    setOutput("Submitting...");

    try {
      const submit = await submitCode({
        language,
        code,
        inputs: [stdin],
      });

      const jobId = submit?.data?.job_id;
      if (!jobId) {
        setOutput("Invalid response from server.");
        return;
      }

      let status = "QUEUED";
      let result: unknown;

      while (status === "QUEUED" || status === "RUNNING") {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        result = await getResult(jobId);
        status = (result as { data?: { status?: string } })?.data?.status || "FAILED";
      }

      const first = (result as { data?: { results?: Array<{ stdout?: string; stderr?: string }> } })?.data
        ?.results?.[0];

      if (first?.stdout) {
        setOutput(first.stdout);
      } else if (first?.stderr) {
        setOutput(first.stderr);
      } else {
        setOutput(`Execution finished with status: ${status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setOutput(`Execution error. ${message}`.trim());
    } finally {
      setLoading(false);
    }
  }, [code, language, stdin]);

  return {
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
  };
}
