"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createUserFile,
  deleteUserFile,
  getLanguages,
  getResult,
  getUserFiles,
  submitCode,
  updateUserFile,
} from "@/lib/api";
import type { EditorFile, Language, PersistedCodeFile } from "@/app/types/compiler";

type UseCompilerState = {
  languages: Language[];
  files: EditorFile[];
  activeFileId: string;
  language: string;
  code: string;
  stdin: string;
  output: string;
  loading: boolean;
  languageLoading: boolean;
  filesLoading: boolean;
  saving: boolean;
  setStdin: (value: string) => void;
  setCode: (value: string) => void;
  selectLanguage: (languageId: string) => void;
  selectFile: (fileId: string) => void;
  createFile: () => void;
  renameFile: (fileId: string, nextName: string) => void;
  deleteFile: (fileId: string) => Promise<void>;
  runCode: () => Promise<void>;
};

type UseCompilerParams = {
  isAuthenticated: boolean;
  authLoading: boolean;
  userEmail?: string;
};

const CODE_LIMIT = 100_000;
const POLL_INTERVAL_MS = 800;
const AUTOSAVE_DEBOUNCE_MS = 2500;

const EXTENSION_LANGUAGE_HINTS: Record<string, string[]> = {
  py: ["python"],
  js: ["javascript", "node"],
  ts: ["typescript"],
  jsx: ["javascript", "react"],
  tsx: ["typescript", "react"],
  java: ["java"],
  c: ["c"],
  h: ["c"],
  cpp: ["c++", "cpp"],
  cc: ["c++", "cpp"],
  cxx: ["c++", "cpp"],
  go: ["go", "golang"],
  rs: ["rust"],
  php: ["php"],
  rb: ["ruby"],
  cs: ["c#", "csharp", "dotnet"],
  kt: ["kotlin"],
  swift: ["swift"],
};

function createLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `tmp-${Date.now()}`;
}

function hasCodeContent(code: string) {
  return code.trim().length > 0;
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  if (parts.length < 2) {
    return "";
  }

  return parts[parts.length - 1];
}

function inferLanguageFromFileName(fileName: string, languages: Language[]) {
  const extension = getFileExtension(fileName);
  if (!extension) {
    return "";
  }

  const hints = EXTENSION_LANGUAGE_HINTS[extension];
  if (!hints || hints.length === 0) {
    return "";
  }

  const normalized = languages.map((language) => ({
    id: language.id,
    value: `${language.id} ${language.name}`.toLowerCase(),
  }));

  for (const hint of hints) {
    const match = normalized.find((language) => language.value.includes(hint));
    if (match) {
      return match.id;
    }
  }

  return "";
}

function inferDefaultExtension(languageId: string, languages: Language[]) {
  const target = languages.find((language) => language.id === languageId);
  const value = `${languageId} ${target?.name || ""}`.toLowerCase();

  const matchingEntry = Object.entries(EXTENSION_LANGUAGE_HINTS).find(([, hints]) =>
    hints.some((hint) => value.includes(hint))
  );

  return matchingEntry?.[0] || "txt";
}

function createFileName(languageId: string, index: number, languages: Language[]) {
  const ext = inferDefaultExtension(languageId, languages);
  return `untitled-${index}.${ext}`;
}

function createDefaultFile(languageId: string, languages: Language[], index = 1): EditorFile {
  return {
    id: createLocalId(),
    name: createFileName(languageId, index, languages),
    language: languageId,
    code: "",
    isDirty: false,
  };
}

export function useCompiler({
  isAuthenticated,
  authLoading,
  userEmail,
}: UseCompilerParams): UseCompilerState {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [files, setFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadedUserRef = useRef<string>("");  const sessionFetchedRef = useRef(false);
  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId),
    [activeFileId, files]
  );

  const activeLanguage = activeFile?.language || "";
  const activeCode = activeFile?.code || "";

  const ensureActiveFile = useCallback((nextFiles: EditorFile[]) => {
    if (nextFiles.length === 0) {
      setActiveFileId("");
      return;
    }

    setActiveFileId((previousId) => {
      if (nextFiles.some((file) => file.id === previousId)) {
        return previousId;
      }

      return nextFiles[0].id;
    });
  }, []);

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    if (!activeFileId || !files.some((file) => file.id === activeFileId)) {
      setActiveFileId(files[0].id);
    }
  }, [activeFileId, files]);

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
          setFiles((previous) => {
            if (previous.length > 0) {
              return previous;
            }

            return [createDefaultFile(first.id, backendLanguages)];
          });
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

  useEffect(() => {
    if (languageLoading || authLoading || languages.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadUserFiles() {
      if (!isAuthenticated || !userEmail) {
        loadedUserRef.current = "";
        sessionFetchedRef.current = false;
        setFiles((previous) => {
          if (previous.length > 0) {
            return previous;
          }

          return [createDefaultFile(languages[0].id, languages)];
        });
        return;
      }

      // Only fetch once per session for the current user
      if (sessionFetchedRef.current && loadedUserRef.current === userEmail) {
        return;
      }

      try {
        setFilesLoading(true);
        const response = await getUserFiles();
        const remoteFiles: PersistedCodeFile[] = response?.files || [];

        if (cancelled) {
          return;
        }

        if (remoteFiles.length === 0) {
          const initial = [createDefaultFile(languages[0].id, languages)];
          setFiles(initial);
          ensureActiveFile(initial);
        } else {
          const mapped: EditorFile[] = remoteFiles.map((file) => ({
            id: file.id,
            dbId: file.id,
            name: file.name,
            language: file.language,
            code: file.code,
            isDirty: false,
          }));

          setFiles(mapped);
          ensureActiveFile(mapped);
        }

        loadedUserRef.current = userEmail;
        sessionFetchedRef.current = true;
      } catch {
        if (!cancelled) {
          setOutput("Failed to load saved files.");
        }
      } finally {
        if (!cancelled) {
          setFilesLoading(false);
        }
      }
    }

    void loadUserFiles();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    ensureActiveFile,
    isAuthenticated,
    languageLoading,
    languages,
    userEmail,
  ]);

  const setCode = useCallback((value: string) => {
    setFiles((previous) =>
      previous.map((file) =>
        file.id === activeFileId
          ? {
              ...file,
              code: value,
              isDirty: true,
            }
          : file
      )
    );
  }, [activeFileId]);

  const selectLanguage = useCallback((languageId: string) => {
    setFiles((previous) => {
      const active = previous.find((file) => file.id === activeFileId);
      if (!active) {
        return previous;
      }

      if (active.language === languageId) {
        return previous;
      }

      if (hasCodeContent(active.code)) {
        const created: EditorFile = {
          id: createLocalId(),
          name: createFileName(languageId, previous.length + 1, languages),
          language: languageId,
          code: "",
          isDirty: false,
        };

        setActiveFileId(created.id);
        setOutput("Created a new file for the selected language to protect existing code.");
        return [created, ...previous];
      }

      return previous.map((file) =>
        file.id === activeFileId
          ? {
              ...file,
              language: languageId,
              name: hasCodeContent(file.code)
                ? file.name
                : createFileName(languageId, 1, languages),
              isDirty: true,
            }
          : file
      );
    });
  }, [activeFileId, languages]);

  const selectFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setOutput("");
  }, []);

  const createFile = useCallback(() => {
    const defaultLanguage = activeLanguage || languages[0]?.id || "";

    if (!defaultLanguage) {
      return;
    }

    setFiles((previous) => {
      const created = createDefaultFile(defaultLanguage, languages, previous.length + 1);
      const nextFiles = [created, ...previous];
      setActiveFileId(created.id);
      return nextFiles;
    });
  }, [activeLanguage, languages]);

  const renameFile = useCallback((fileId: string, nextName: string) => {
    const sanitized = nextName.trim().slice(0, 80);
    if (!sanitized) {
      return;
    }

    setFiles((previous) =>
      previous.map((file) =>
        file.id === fileId
          ? {
              ...file,
              name: sanitized,
              language: inferLanguageFromFileName(sanitized, languages) || file.language,
              isDirty: true,
            }
          : file
      )
    );
  }, [languages]);

  const deleteFile = useCallback(async (fileId: string) => {
    const current = files.find((file) => file.id === fileId);
    if (!current) {
      return;
    }

    if (isAuthenticated && current.dbId) {
      try {
        await deleteUserFile(current.dbId);
      } catch {
        setOutput("Failed to delete file.");
        return;
      }
    }

    setFiles((previous) => {
      const remaining = previous.filter((file) => file.id !== fileId);
      if (remaining.length > 0) {
        return remaining;
      }

      const fallbackLanguage = activeLanguage || languages[0]?.id || "";
      if (!fallbackLanguage) {
        return [];
      }

      return [createDefaultFile(fallbackLanguage, languages, 1)];
    });
  }, [activeLanguage, files, isAuthenticated, languages]);

  useEffect(() => {
    if (!isAuthenticated || saving) {
      return;
    }

    const dirtyFile = files.find((file) => file.isDirty);
    if (!dirtyFile) {
      return;
    }

    const snapshot = {
      id: dirtyFile.id,
      dbId: dirtyFile.dbId,
      name: dirtyFile.name,
      language: dirtyFile.language,
      code: dirtyFile.code,
    };

    const timer = setTimeout(async () => {
      const payload = {
        name: snapshot.name,
        language: snapshot.language,
        code: snapshot.code,
      };

      try {
        setSaving(true);
        const response = snapshot.dbId
          ? await updateUserFile(snapshot.dbId, payload)
          : await createUserFile(payload);

        const saved = response?.file as PersistedCodeFile | undefined;
        if (!saved) {
          setOutput("Autosave failed.");
          return;
        }

        setFiles((previous) =>
          previous.map((file) =>
            file.id === snapshot.id
              ? {
                  ...file,
                  id: file.dbId ? file.id : saved.id,
                  dbId: saved.id,
                  // Keep the local file content authoritative while typing.
                  isDirty:
                    file.name !== snapshot.name ||
                    file.language !== snapshot.language ||
                    file.code !== snapshot.code,
                }
              : file
          )
        );

        setActiveFileId((previousId) =>
          previousId === snapshot.id && !snapshot.dbId ? saved.id : previousId
        );
      } catch {
        setOutput("Autosave failed.");
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [files, isAuthenticated, saving]);

  const runCode = useCallback(async () => {
    if (!activeLanguage) {
      return;
    }

    if (!activeCode) {
      return;
    }

    if (activeCode.length > CODE_LIMIT) {
      setOutput("Code exceeds 100KB limit.");
      return;
    }

    setLoading(true);
    setOutput("Submitting...");

    try {
      const submit = await submitCode({
        language: activeLanguage,
        code: activeCode,
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
  }, [activeCode, activeLanguage, stdin]);

  return {
    languages,
    files,
    activeFileId,
    language: activeLanguage,
    code: activeCode,
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
  };
}
