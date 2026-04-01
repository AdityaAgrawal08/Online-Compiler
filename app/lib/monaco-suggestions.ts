import type * as Monaco from "monaco-editor";

type MonacoInstance = typeof Monaco;

type SuggestionTemplate = Omit<Monaco.languages.CompletionItem, "range">;

function createSuggestionRange(
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
) {
  const word = model.getWordUntilPosition(position);

  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

const pythonSuggestions: SuggestionTemplate[] = [
  {
    label: "if __name__ == '__main__'",
    kind: 15, // Snippet
    insertText: "if __name__ == '__main__':\n    ${1:main()}\n",
    insertTextRules: 4, // InsertAsSnippet
    detail: "Python entry point",
  },
  {
    label: "def function",
    kind: 15,
    insertText: "def ${1:name}(${2:args}):\n    ${3:pass}\n",
    insertTextRules: 4,
    detail: "Define a function",
  },
  {
    label: "for loop",
    kind: 15,
    insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}\n",
    insertTextRules: 4,
    detail: "Python for loop",
  },
  {
    label: "class",
    kind: 15,
    insertText: "class ${1:ClassName}:\n    def __init__(self, ${2:args}):\n        ${3:pass}\n",
    insertTextRules: 4,
    detail: "Python class",
  },
  {
    label: "print",
    kind: 1, // Function
    insertText: "print(${1:value})",
    insertTextRules: 4,
    detail: "Print output",
  },
];

const cSuggestions: SuggestionTemplate[] = [
  {
    label: "main",
    kind: 15,
    insertText: "#include <stdio.h>\n\nint main(void) {\n    ${1:// code}\n    return 0;\n}\n",
    insertTextRules: 4,
    detail: "C program entry",
  },
  {
    label: "printf",
    kind: 1,
    insertText: "printf(\"${1:format}\\n\"${2:, args});",
    insertTextRules: 4,
    detail: "Print formatted output",
  },
  {
    label: "scanf",
    kind: 1,
    insertText: "scanf(\"${1:%d}\", &${2:var});",
    insertTextRules: 4,
    detail: "Read input",
  },
  {
    label: "for loop",
    kind: 15,
    insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3:// code}\n}\n",
    insertTextRules: 4,
    detail: "C for loop",
  },
  {
    label: "if else",
    kind: 15,
    insertText: "if (${1:condition}) {\n    ${2:// true}\n} else {\n    ${3:// false}\n}\n",
    insertTextRules: 4,
    detail: "C if/else",
  },
];

export function registerMonacoCompletionProviders(monacoInstance: MonacoInstance) {
  monacoInstance.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", "_"],
    provideCompletionItems: (model, position) => ({
      suggestions: pythonSuggestions.map((suggestion) => ({
        ...suggestion,
        range: createSuggestionRange(model, position),
      })),
    }),
  });

  monacoInstance.languages.registerCompletionItemProvider("c", {
    triggerCharacters: ["#", ".", "_"],
    provideCompletionItems: (model, position) => ({
      suggestions: cSuggestions.map((suggestion) => ({
        ...suggestion,
        range: createSuggestionRange(model, position),
      })),
    }),
  });
}