import { describe, expect, it } from "vitest";

import { normalizeGitHubImageTags } from "./MarkdownRenderer.utils";

describe("normalizeGitHubImageTags", () => {
  it("converts GitHub attachment image tags to markdown image syntax", () => {
    expect(
      normalizeGitHubImageTags(
        '<img width="619" height="505" alt="Aura arc" src="https://github.com/user-attachments/assets/5ad495f8-f30a-4402-9cd1-01e709631f0d" />',
      ),
    ).toBe(
      "![Aura arc](https://github.com/user-attachments/assets/5ad495f8-f30a-4402-9cd1-01e709631f0d)",
    );
  });

  it("keeps untrusted image tags untouched", () => {
    const markdown =
      '<img alt="tracker" src="https://example.test/tracker.png" />';

    expect(normalizeGitHubImageTags(markdown)).toBe(markdown);
  });

  it("escapes markdown-sensitive alt text and image URLs", () => {
    expect(
      normalizeGitHubImageTags(
        '<img alt="Aura [arc]" src="https://github.com/user-attachments/assets/image name).png" />',
      ),
    ).toBe(
      "![Aura \\[arc\\]](https://github.com/user-attachments/assets/image%20name%29.png)",
    );
  });
});
