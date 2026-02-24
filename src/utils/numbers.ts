export function numberToWordsFR(n: number): string {
  const ones = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  if (n === 0) return "zéro";
  if (n < 0) return "moins " + numberToWordsFR(-n);

  let result = "";

  if (n >= 1000000) {
    result += numberToWordsFR(Math.floor(n / 1000000)) + " million ";
    n %= 1000000;
  }
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    result += (thousands === 1 ? "" : numberToWordsFR(thousands) + " ") + "mille ";
    n %= 1000;
  }
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    result += (hundreds === 1 ? "cent" : numberToWordsFR(hundreds) + " cent") + " ";
    n %= 100;
  }
  if (n >= 20) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (t === 7 || t === 9) {
      result += tens[t - 1] + (o === 1 && t === 7 ? " et " : "-") + ones[10 + o] + " ";
    } else if (t === 8) {
      result += "quatre-vingt" + (o > 0 ? "-" + ones[o] : "s") + " ";
    } else {
      result += tens[t] + (o === 1 ? " et " : o > 0 ? "-" : "") + (o > 0 ? ones[o] : "") + " ";
    }
  } else if (n > 0) {
    result += ones[n] + " ";
  }

  return result.trim();
}

export function formatAmount(n: number): string {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function amountInWords(n: number): string {
  const intPart = Math.floor(n);
  const words = numberToWordsFR(intPart);
  return words.charAt(0).toUpperCase() + words.slice(1) + " dinar(s) algérien(s)";
}
