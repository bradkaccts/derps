/**
 * In-message safety classifiers (CH-304, REG-903).
 *
 * Both are *non-blocking interstitials*. The user may always proceed; the
 * event is logged. Blocking outright teaches people to move the conversation
 * off-platform immediately, which is the outcome both controls exist to avoid.
 */

export interface TextFlag {
  kind: "contact_share" | "transfer_intent";
  title: string;
  body: string;
  /** Matched fragments, used only for the T&S record — never rendered back. */
  matches: string[];
}

const PHONE = /(?:\+?\d[\s.-]?){7,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/gi;
const HANDLE = /(?:^|\s)@[a-z0-9._]{3,}/gi;
const EXTERNAL_APP =
  /\b(whatsapp|telegram|signal|instagram|snapchat|facebook|messenger|venmo|cash\s?app)\b/gi;
const STREET_ADDRESS = /\b\d{1,5}\s+[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)*\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way|place|pl)\b/gi;

/**
 * REG-903 / §4.2 — apparent rehoming or sale intent. This is a compliance
 * control, not a UX nicety: the moment a pet can change hands through a chat
 * thread, the entire compliance surface of the adoption product attaches to
 * this one, retroactively and without any of the required disclosures.
 */
const TRANSFER_INTENT = [
  /\b(rehom(e|ing)|give (him|her|them|the dog|the pup) (to you|away)|take (him|her|them) permanently)\b/gi,
  /\b(sell|selling|buy|buying|purchase|price|deposit)\b.{0,30}\b(dog|puppy|pup|him|her)\b/gi,
  /\b(keep (him|her|them) for good|adopt (him|her|them) from me|sign (him|her|them) over)\b/gi,
  /\b(stud|breed(ing)?|litter|mate (him|her))\b/gi,
];

function collect(text: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  patterns.forEach((pattern) => {
    const matches = text.match(new RegExp(pattern.source, pattern.flags));
    if (matches) found.push(...matches.map((m) => m.trim()));
  });
  return [...new Set(found)];
}

export function detectContactSharing(text: string): TextFlag | null {
  const matches = collect(text, [PHONE, EMAIL, HANDLE, EXTERNAL_APP, STREET_ADDRESS]);
  if (matches.length === 0) return null;
  return {
    kind: "contact_share",
    title: "Heads up before you send that",
    body:
      "Derps keeps chat relayed so you never have to hand over a phone number, address, or handle to back out of a plan. You can send this anyway — just know the protection ends there.",
    matches,
  };
}

export function detectTransferIntent(text: string): TextFlag | null {
  const matches = collect(text, TRANSFER_INTENT);
  if (matches.length === 0) return null;
  return {
    kind: "transfer_intent",
    title: "Transferring a pet?",
    body:
      "Derps requires adoptions to go through the Adoption flow for your legal protection — it handles the disclosures, the agreement, and the escrow. Playdates never changes who owns a pet.",
    matches,
  };
}

export function scanMessage(text: string): TextFlag[] {
  return [detectTransferIntent(text), detectContactSharing(text)].filter(
    (flag): flag is TextFlag => flag !== null,
  );
}
