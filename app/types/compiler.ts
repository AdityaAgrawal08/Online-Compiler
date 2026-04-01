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
