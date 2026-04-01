export type Language = {
  id: string;
  name: string;
  version: string;
  description: string;
  example: string;
};

export type RunCodePayload = {
  language: string;
  code: string;
  inputs?: string[];
};

export type PersistedCodeFile = {
  id: string;
  name: string;
  language: string;
  code: string;
  updatedAt?: string;
};

export type EditorFile = {
  id: string;
  dbId?: string;
  name: string;
  language: string;
  code: string;
  isDirty: boolean;
};
