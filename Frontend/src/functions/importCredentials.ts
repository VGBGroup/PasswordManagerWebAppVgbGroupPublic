// lib/importCredentials.ts
import Papa from "papaparse";
import type { DecryptedOutCredential } from "@/interfaces/decryptedCredential";

export interface ParsedOwnExportRow {
  ciphertext: string;
  iv: string;
  favourite: boolean;
  hideUsername: boolean;
}

function estimatePasswordStrength(password: string): string {
  if (!password) return "weak";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

export function parseChromeCSV(
  fileContent: string,
  categoryRecordId: number,
): Omit<DecryptedOutCredential, "updatedAt">[] {
  // Strip 'sep=,' directive if present in unencrypted exports
  const cleaned = fileContent.replace(/^sep=,\r?\n/, "");

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  return result.data.map((row) => {
    // Read values across potential column name variations
    const nameVal = row["Name"] || row["name"] || row["Title"] || row["title"];
    const urlVal =
      row["URL"] || row["url"] || row["Website"] || row["website"] || "";
    const username = row["Username"] || row["username"] || "";
    const password = row["Password"] || row["password"] || "";
    const notes =
      row["Notes"] || row["notes"] || row["Note"] || row["note"] || "";

    const resolvedTitle = nameVal || urlVal || "Imported credential";

    return {
      title: resolvedTitle,
      name: resolvedTitle,
      username,
      password,
      cardNumber: "",
      cardExpiry: "",
      type: "login",
      url: urlVal,
      website: urlVal,
      notes,
      tags: [],
      categoryRecordId,
      favourite: row["Favourite"]?.toLowerCase() === "true",
      strength: estimatePasswordStrength(password),
      color: "#22c55e",
      hideUsername: false,

      phoneNumber: "null",
      address: "null"
    };
  });
}

// Your own encrypted export format
export function parseOwnExportCSV(fileContent: string): ParsedOwnExportRow[] {
  // Strip the Excel "sep=," directive line if present — it's not real CSV data
  const cleaned = fileContent.replace(/^sep=,\r?\n/, "");

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  return result.data
    .filter((row) => row["Ciphertext"] && row["IV"])
    .map((row) => ({
      ciphertext: row["Ciphertext"],
      iv: row["IV"],
      favourite: row["Favourite"]?.toLowerCase() === "true",
      hideUsername: row["Hide Username"]?.toLowerCase() === "true",
    }));
}
