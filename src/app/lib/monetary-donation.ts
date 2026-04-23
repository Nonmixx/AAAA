/**
 * Shared cash / monetary donation detection (client + server).
 * Item (in-kind) flows use photos; pure cash flows do not.
 */

const MONETARY_IN_TEXT =
  /\brm\s*[\d,.]+|[\d,.]+\s*rm\b|\bmyr\b|ringgit|duitnow|\btng\b|fpx|e-?wallet|bank transfer|wire transfer|cash donation|donate (cash|money)|financial contribution|\$\s*[\d,.]+|\bcash\s+only\b|\bmoney\s+only\b|\bonly\s+cash\b|\bonly\s+money\b|\bgive\s+cash\b|\bgive\s+money\b|\bcash\s+pledge\b|\bmonetary\s+contribution\b|\bwant\s+to\s+donate\s+cash\b|\bwould\s+like\s+to\s+donate\s+cash\b|\bdonate\s+cash\b|\bcash\s+donation\b|\bmonetary\s+donation\b|\bpledge\s+cash\b/i;

const MONETARY_LABEL = /cash\s*\/\s*monetary|monetary donation|usd pledge/i;

/** True when the UI category label is already a cash/monetary path. */
export function categoryLabelIsMonetary(categoryLabel: string): boolean {
  return isMonetaryDonationContext('', categoryLabel);
}

/**
 * True when user text and/or detected category indicate cash / monetary / e-wallet
 * (not physical goods only).
 */
export function isMonetaryDonationContext(userLatest: string, detectedItem: string): boolean {
  const blob = `${userLatest} ${detectedItem}`.toLowerCase();
  if (MONETARY_LABEL.test(detectedItem)) return true;
  if (MONETARY_IN_TEXT.test(blob)) return true;
  if (
    /\b(donate|donation|giving|give)\b/i.test(blob) &&
    /\d/.test(userLatest) &&
    /\b(rm|myr|\$|ringgit)\b/i.test(blob)
  ) {
    return true;
  }
  return false;
}

/** User message alone suggests a monetary donation (for category resolution). */
export function textSuggestsMonetaryDonation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return isMonetaryDonationContext(t, '');
}
