import { describe, test, expect } from "vitest";
import { parseDotmark } from "../src/dotmark";

// Sanity check for:
// - Basic markdown
// - Dotmark ids and classes

describe("Overall Dotmark Integration", () => {
  test("processes complete markdown document", async () => {
    const input = `
# Title

~#section1.class1
Some content with **bold** text
/~

~.class2

\`keyword\`

/~

## Nested Dotmark With Spaces

~.outer1

Outer stuff

~.inner1

Inner stuff

/~

/~

## Nested Dotmark All Crammed Together

~.outer2
Outer stuff
~.inner2
Inner stuff
/~
/~

\`\`\`typescript
const x = 1;
\`\`\``;

    const result = await parseDotmark(input);

    // Check basic markdown works
    expect(result).toContain('<h1 id="title">Title</h1>');
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<code>keyword</code>");

    // Check basic dotmark features work
    expect(result).toContain('<div id="section1" class="class1">');
    expect(result).toContain('<div class="class2">');

    // Check nested dotmark features work
    expect(result).toContain('<div class="outer1">');
    expect(result).toContain('<div class="inner1">');
    expect(result).toContain('<div class="outer2">');
    expect(result).toContain('<div class="inner2">');

    // Check code highlighting worked
    expect(result).toContain("</pre>");
    expect(result).toContain("one-light");
    expect(result).toContain("one-dark-pro");
  });
});
