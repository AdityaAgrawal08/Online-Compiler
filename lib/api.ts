const BASE_URL = process.env.NEXT_PUBLIC_EXECUTOR_URL!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

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
