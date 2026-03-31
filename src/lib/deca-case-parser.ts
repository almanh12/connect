const DECA_SECTION_HEADERS = [
  "CAREER CLUSTER",
  "INSTRUCTIONAL AREA",
  "EVENT NAME",
  "PARTICIPANT INSTRUCTIONS",
  "21st CENTURY SKILLS",
  "PERFORMANCE INDICATORS",
  "EVENT SITUATION",
] as const;

export type DecaCaseSections = Partial<
  Record<(typeof DECA_SECTION_HEADERS)[number], string>
>;

export function parseDecaCaseFormat(text: string): DecaCaseSections | null {
  const sections: DecaCaseSections = {};
  const normalized = text.replace(/\r\n/g, "\n");

  for (let i = 0; i < DECA_SECTION_HEADERS.length; i++) {
    const header = DECA_SECTION_HEADERS[i];
    const nextHeader = DECA_SECTION_HEADERS[i + 1];
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const headerPattern = new RegExp(`(?:^|\\n)${escaped}\\s*\\n`, "im");
    const match = normalized.match(headerPattern);
    if (!match) continue;

    const startIdx = (match.index ?? 0) + match[0].length;
    let endIdx = normalized.length;

    if (nextHeader) {
      const nextEscaped = nextHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nextPattern = new RegExp(`\\n\\s*${nextEscaped}\\s*\\n`, "im");
      const nextMatch = normalized.slice(startIdx).search(nextPattern);
      if (nextMatch >= 0) endIdx = startIdx + nextMatch;
    }

    const content = normalized.slice(startIdx, endIdx).trim();
    if (content) sections[header as keyof DecaCaseSections] = content;
  }
  return Object.keys(sections).length > 0 ? sections : null;
}

export function parseLegacyCaseFormat(text: string): Record<string, string> | null {
  const sections: Record<string, string> = {};
  const parts = text.split(/\*\*([^*]+):\*\*/);
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim();
    const content = parts[i + 1]?.trim();
    if (header && content) sections[header] = content;
  }
  return Object.keys(sections).length > 0 ? sections : null;
}
