const BASE_URL = process.env.NEXT_PUBLIC_EXECUTOR_URL!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

type FilePayload = {
  name: string;
  language: string;
  code: string;
};

export async function getLanguages() {
  const res = await fetch(`${BASE_URL}/languages`);

  if (!res.ok) {
    throw new Error("Failed to fetch languages");
  }

  return res.json();
}

export async function submitCode(payload: {
  language: string;
  code: string;
  inputs?: string[];
}) {
  const res = await fetch(`${BASE_URL}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Submit failed");

  return res.json();
}

export async function getResult(jobId: string) {
  const res = await fetch(`${BASE_URL}/result/${jobId}`, {
    headers: {
      "X-API-Key": API_KEY,
    },
  });

  if (!res.ok) throw new Error("Result fetch failed");

  return res.json();
}

export async function getUserFiles() {
  const res = await fetch("/api/files", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load files");
  }

  return res.json();
}

export async function createUserFile(payload: FilePayload) {
  const res = await fetch("/api/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to create file");
  }

  return res.json();
}

export async function updateUserFile(fileId: string, payload: FilePayload) {
  const res = await fetch(`/api/files/${fileId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to update file");
  }

  return res.json();
}

export async function deleteUserFile(fileId: string) {
  const res = await fetch(`/api/files/${fileId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete file");
  }

  return res.json();
}
