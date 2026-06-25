import React from "react";

/**
 * Deterministically generates a realistic code block from a message text.
 * Keeps keywords of the original message inside comments or string values.
 */
export function obfuscateToCode(text: string, id: string, senderName: string): string {
  // Extract words for naming variables/classes
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 2);

  const varName =
    words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("") || "MessagePayload";

  // Deterministic seed based on message ID hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const templateIdx = Math.abs(hash) % 4;

  const senderCamel = senderName.replace(/\s+/g, "");
  const timeStr = new Date().toISOString().split("T")[1].slice(0, 5);

  const cleanText = text.replace(/"/g, '\\"').replace(/\n/g, " ");

  switch (templateIdx) {
    case 0:
      return `// TODO: Resolve incoming buffer from ${senderName}
export async function sync${varName}() {
  const endpoint = "/api/v1/sync/chat/${id.slice(0, 6)}";
  const payload = {
    sender: "${senderName}",
    rawText: "${cleanText.slice(0, 45)}${cleanText.length > 45 ? "..." : ""}",
    timestamp: "${timeStr}"
  };
  
  return await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}`;

    case 1:
      return `// Definition for ${senderName}'s request event
interface I${varName} {
  uuid: string;
  author: string;
  hasQuery: boolean;
  contentRef: string;
}

const active${varName}: I${varName} = {
  uuid: "${id.slice(0, 8)}",
  author: "${senderCamel}",
  hasQuery: ${text.includes("?")},
  contentRef: "${cleanText.slice(0, 40)}"
};`;

    case 2:
      return `// React Render Module for ${senderName}
import { useState, useEffect } from "react";

export default function Render${varName}() {
  const [data, setData] = useState<string>("${cleanText.slice(0, 30)}${cleanText.length > 30 ? "..." : ""}");
  const [status, setStatus] = useState<"idle" | "busy">("idle");

  useEffect(() => {
    setStatus("busy");
    console.log("Loading stream from ${senderName}...");
    setStatus("idle");
  }, []);

  return (
    <div className="flex gap-2 p-3 font-mono">
      <span className="text-sky-400">${senderCamel}</span>
      <p className="text-zinc-300 font-normal">{data}</p>
    </div>
  );
}`;

    default:
      return `-- Database Query: Fetch content snippet for ${senderName}
SELECT msg_id, sender_name, message_body, created_at
FROM db_schema.message_store
WHERE conversation_id = '${id.slice(0, 8)}'
  AND sender_name = '${senderName}'
  AND search_vector @@ to_tsquery('${words[0] || "chat"}')
LIMIT 1;`;
  }
}

/**
 * Takes a code string, runs a secure regex-based token replacement,
 * and returns React elements containing formatted syntax highlights.
 */
export function highlightSyntax(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, lineIdx) => {
    // 1. Escape HTML entities for safety
    let html = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 2. Extract and handle comments (must be processed first so inner elements aren't highlighted)
    let hasComment = false;
    let commentPart = "";

    // JS/TS comment (//) or SQL comment (--)
    const commentMatch = html.match(/(\/\/.*|--.*)/);
    if (commentMatch) {
      hasComment = true;
      commentPart = commentMatch[1];
      html = html.substring(0, commentMatch.index);
    }

    // 3. Highlight Strings: double quotes, single quotes, backticks
    html = html.replace(
      /(["'`])(.*?)\1/g,
      '<span class="text-amber-400 font-normal">$1$2$1</span>',
    );

    // 4. Highlight TypeScript/JavaScript/SQL Keywords
    const keywords =
      /\b(const|let|var|function|async|await|interface|export|return|import|from|SELECT|FROM|WHERE|AND|LIMIT|class|extends|new|default|as|const|boolean)\b/g;
    html = html.replace(keywords, '<span class="text-pink-500 font-semibold">$1</span>');

    // 5. Highlight Types & Standard Identifiers
    const types =
      /\b(string|number|boolean|any|void|Promise|Record|I[A-Z]\w+|useState|useEffect|fetch|JSON|stringify|to_tsquery|search_vector|msg_id|sender_name|message_body|created_at|message_store|db_schema)\b/g;
    html = html.replace(types, '<span class="text-cyan-400 font-normal">$1</span>');

    // 6. Highlight function invocations (words followed by parenthesis)
    html = html.replace(/\b(\w+)(?=\()/g, '<span class="text-sky-300 font-normal">$1</span>');

    // 7. Highlight numeric values
    html = html.replace(/\b(\d+)\b/g, '<span class="text-indigo-400 font-normal">$1</span>');

    // 8. Re-append comments with proper italic/green formatting
    if (hasComment) {
      html += `<span class="text-emerald-500 italic font-mono">${commentPart}</span>`;
    }

    return React.createElement(
      "div",
      { key: lineIdx, className: "font-mono text-[11px] leading-relaxed flex select-text" },
      React.createElement(
        "span",
        {
          className:
            "text-[10px] text-muted-foreground/35 select-none w-5 pr-1.5 text-right shrink-0 border-r border-border/20",
        },
        lineIdx + 1,
      ),
      React.createElement("span", {
        className: "flex-1 whitespace-pre-wrap pl-2.5 break-all text-zinc-300",
        dangerouslySetInnerHTML: { __html: html || " " },
      }),
    );
  });
}
