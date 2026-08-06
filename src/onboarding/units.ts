const LBS_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

// Accepts "70", "70kg", "70 kg", "154lbs", "154 lb" — bare numbers assume kg.
export function parseWeightKg(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  const lbsMatch = text.match(/^(\d+(?:\.\d+)?)\s*(lbs?|pounds?)$/);
  if (lbsMatch) {
    return Number(lbsMatch[1]) / LBS_PER_KG;
  }
  const kgMatch = text.match(/^(\d+(?:\.\d+)?)\s*(kgs?|kilograms?)?$/);
  if (kgMatch) {
    return Number(kgMatch[1]);
  }
  return null;
}

// Accepts "175", "175cm", "5'9", "5'9\"", "69in", "69 inches", "1.75m".
export function parseHeightCm(raw: string): number | null {
  const text = raw.trim().toLowerCase();

  const feetInchesMatch = text.match(/^(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?$/);
  if (feetInchesMatch) {
    const totalInches = Number(feetInchesMatch[1]) * 12 + Number(feetInchesMatch[2]);
    return totalInches * CM_PER_INCH;
  }

  const inchesMatch = text.match(/^(\d+(?:\.\d+)?)\s*(in|inches|")$/);
  if (inchesMatch) {
    return Number(inchesMatch[1]) * CM_PER_INCH;
  }

  const metersMatch = text.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (metersMatch) {
    return Number(metersMatch[1]) * 100;
  }

  const cmMatch = text.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cmMatch) {
    return Number(cmMatch[1]);
  }

  // Bare number: cm if plausible human height, otherwise reject rather than guess.
  const bareMatch = text.match(/^(\d+(?:\.\d+)?)$/);
  if (bareMatch) {
    const value = Number(bareMatch[1]);
    if (value >= 100 && value <= 250) {
      return value;
    }
  }

  return null;
}
