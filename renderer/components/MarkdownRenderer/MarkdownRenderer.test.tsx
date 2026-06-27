import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders raw HTML as text instead of HTML nodes", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer>{'<img src=x onerror="alert(1)">'}</MarkdownRenderer>,
    );

    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("renders GitHub attachment image tags as markdown images", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer>
        {
          '<img width="619" height="505" alt="Aura arc" src="https://github.com/user-attachments/assets/5ad495f8-f30a-4402-9cd1-01e709631f0d" />'
        }
      </MarkdownRenderer>,
    );

    expect(html).toContain("<img");
    expect(html).toContain('alt="Aura arc"');
    expect(html).toContain(
      'src="https://github.com/user-attachments/assets/5ad495f8-f30a-4402-9cd1-01e709631f0d"',
    );
    expect(html).not.toContain("&lt;img");
  });

  it("keeps untrusted image tags escaped", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer>
        {'<img alt="tracker" src="https://example.test/tracker.png" />'}
      </MarkdownRenderer>,
    );

    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });
});
