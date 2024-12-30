import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { codeToHtml } from "shiki";

export const DOTMARK_TOKEN = "DOTMARK_DIV";

/* ************************************************************************
 * PUBLIC API
 * ***********************************************************************/
export const parseDotmark = async (
  markdown: string,
  useSyntaxHighlighting = false,
  useGitHubStyleIds = false,
  lightTheme = "one-light",
  darkTheme = "one-dark-pro"
): Promise<string> => {
  // EMBED TOKENS
  let parsedMarkdown = markdown
    .split("\n")
    .map((line) => {
      const trimmedLine = line.trim();
      if (isMacroStart(trimmedLine)) {
        const { id, classes } = parseMacro(trimmedLine);
        return createDotmarkDiv(id, classes);
      } else if (isMacroEnd(trimmedLine)) {
        return `<!--${DOTMARK_TOKEN}</div>${DOTMARK_TOKEN}-->`;
      }
      return line;
    })
    .join("\n");

  // PARSE MARKDOWN
  let marked = new Marked();
  const renderer = new marked.Renderer();

  // Add syntax highlighting if requested
  if (useSyntaxHighlighting) {
    const highlightExtension = markedHighlight({
      async: true,
      langPrefix: "shiki language-",
      highlight(code, lang) {
        // Fall back to 'text' if language isn't found
        return codeToHtml(code, {
          lang: lang || "text",
          themes: {
            light: lightTheme,
            dark: darkTheme,
          },
        });
      },
    });

    // Override the code block renderer to not add additional pre/code tags
    renderer.code = function ({ text, lang, escaped }) {
      return text; // Just return the already-highlighted code
    };

    marked.use(highlightExtension);
  }

  if (useGitHubStyleIds) {
    // Override the heading render method to include GitHub style IDs
    renderer.heading = function ({ text, depth }) {
      const escapedText = text
        .toLowerCase()
        .replace(/[^\w\s-]+/g, "") // Remove all special characters (keep spaces and hyphens)
        .replace(/ /g, "-"); // Convert spaces to hyphens

      return `<h${depth} id="${escapedText}">${text}</h${depth}>\n`;
    };
  }

  // Parse the markdown
  marked.setOptions({ renderer: renderer });
  markdown = await marked.parse(parsedMarkdown);

  // REMOVE TOKENS
  markdown = removeDotmarkTokens(markdown);

  return markdown;
};

/* ************************************************************************
 * PRIVATE FUNCTIONS - some exposed for testing
 * ***********************************************************************/

// Create a dotmark commented div with the id and classes that were passed in.
export const createDotmarkDiv = (
  id?: string,
  classes: string[] = []
): string => {
  const idAttr = id ? ` id="${id}"` : "";
  const classAttr = classes.length > 0 ? ` class="${classes.join(" ")}"` : "";
  return `<!--${DOTMARK_TOKEN}<div${idAttr}${classAttr}>${DOTMARK_TOKEN}-->`;
};

// Check if the line is the end of a dotmark macro.
const isMacroEnd = (line: string): boolean => {
  return line === "/~";
};

// Check if the line is the start of a dotmark macro.
const isMacroStart = (line: string): boolean => {
  // We expect the line to be trimmed.
  return line.startsWith("~") && (line[1] === "#" || line[1] === ".");
};

// Parse the start of a dotmark macro to get the id and classes.
export const parseMacro = (
  line: string
): { id?: string; classes: string[] } => {
  // Remove the leading ~
  const trimmed = line.slice(1);
  let id: string | undefined = undefined;
  const classes: string[] = [];

  // There may be zero to one id
  // Id must be at the beginning of the line if present
  const idMatch = trimmed.match(/^#([^#.]+)/);
  if (idMatch) {
    id = idMatch[1];
  }

  // There may be zero to many classes
  const classMatch = trimmed.match(/\.([^#.]+)/g);
  if (classMatch) {
    classes.push(...classMatch.map((c) => c.slice(1)));
  }

  return { id, classes };
};

// Remove comments from dotmark divs from the markdown.
const removeDotmarkTokens = (markdown: string): string => {
  return markdown
    .replace(new RegExp(`<!--${DOTMARK_TOKEN}`, "g"), "")
    .replace(new RegExp(`${DOTMARK_TOKEN}-->`, "g"), "");
};
