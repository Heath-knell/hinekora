const htmlImagePattern = /<img\b[^>]*\/?>/gi;
const htmlAttributePattern =
  /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

function decodeMarkdownImageAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeMarkdownImageAlt(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function escapeMarkdownImageUrl(value: string): string {
  return value.replace(/\)/g, "%29").replace(/\s/g, "%20");
}

function parseHtmlAttributes(html: string): Map<string, string> {
  const attributes = new Map<string, string>();

  for (const match of html.matchAll(htmlAttributePattern)) {
    const [, rawName, doubleQuotedValue, singleQuotedValue, unquotedValue] =
      match;
    if (!rawName) {
      continue;
    }

    attributes.set(
      rawName.toLowerCase(),
      decodeMarkdownImageAttribute(
        doubleQuotedValue ?? singleQuotedValue ?? unquotedValue ?? "",
      ),
    );
  }

  return attributes;
}

function isTrustedMarkdownImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return (
      (hostname === "github.com" &&
        url.pathname.startsWith("/user-attachments/assets/")) ||
      hostname === "user-images.githubusercontent.com" ||
      hostname === "private-user-images.githubusercontent.com"
    );
  } catch {
    return false;
  }
}

function normalizeGitHubImageTags(markdown: string): string {
  return markdown.replace(htmlImagePattern, (html) => {
    const attributes = parseHtmlAttributes(html);
    const src = attributes.get("src");
    if (!src || !isTrustedMarkdownImageUrl(src)) {
      return html;
    }

    const alt = escapeMarkdownImageAlt(attributes.get("alt") || "image");
    const url = escapeMarkdownImageUrl(src);

    return `![${alt}](${url})`;
  });
}

export { normalizeGitHubImageTags };
