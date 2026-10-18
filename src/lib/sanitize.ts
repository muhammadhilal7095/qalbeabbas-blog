import "server-only";
import sanitizeHtml from "sanitize-html";

const EMBED_HOSTS = ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"];

/** Whitelist-sanitize editor HTML before it is stored or rendered. */
export function sanitizePostHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
      "ul", "ol", "li", "a", "img", "hr", "div", "iframe", "figure", "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "allow"],
      div: ["data-youtube-video"],
      "*": ["style"],
      pre: ["class"],
      code: ["class"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    allowedIframeHostnames: EMBED_HOSTS,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.target === "_blank" ? { rel: "noopener noreferrer nofollow" } : {}) },
      }),
    },
  });
}

/** Plain text only (comments, excerpts). */
export function sanitizeText(text: string) {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
}
