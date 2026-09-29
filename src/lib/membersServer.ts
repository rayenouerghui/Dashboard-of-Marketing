// This file is server-side only. Do not import in client components.
//
// Member management for per-member identity
// Loads members from a "Members" tab in the Google Sheet with a JSON fallback for development

import "server-only";
import { getGoogleApis } from "./googleSheetsServer";
import bcrypt from "bcryptjs";
import { env } from "./env";

const MEMBERS_SPREADSHEET_ID = env.GOOGLE_SHEET_ID;
const MEMBERS_TAB = "Members";

export interface Member {
  memberId: string;
  name: string;
  accessCodeHash: string;
  expaId?: string;
  active: boolean;
}

// Development-only fallback members
const DEV_MEMBERS: Member[] = [
  {
    memberId: "dev-member-1",
    name: "Dev Member",
    accessCodeHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYxG5X5X5X6", // bcrypt hash of "dev123"
    expaId: "123456",
    active: true,
  },
];

async function getSheetsClient() {
  const google = await getGoogleApis();
  const { auth } = getAuthClient(google);
  return google.sheets({ version: "v4", auth });
}

function getAuthClient(google: Awaited<ReturnType<typeof getGoogleApis>>) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID is not set");
  }
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  if (!clientEmail) {
    throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL is not set");
  }
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("GOOGLE_SHEETS_PRIVATE_KEY is not set");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { auth };
}

/**
 * Load members from the Google Sheet "Members" tab
 * Falls back to DEV_MEMBERS in development if the sheet is unavailable
 */
export async function loadMembersFromSheet(): Promise<Member[]> {
  // In development, use fallback if Google Sheets credentials are not set
  if (process.env.NODE_ENV !== "production" && 
      (!env.GOOGLE_SHEETS_CLIENT_EMAIL || !env.GOOGLE_SHEETS_PRIVATE_KEY)) {
    console.warn("[membersServer] Using development member fallback");
    return DEV_MEMBERS;
  }

  try {
    const sheets = await getSheetsClient();

    // Ensure the Members tab exists
    await ensureMembersTab(sheets);

    // Fetch members from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MEMBERS_SPREADSHEET_ID,
      range: `'${MEMBERS_TAB}'!A:E`,
    });

    const rows: string[][] = response.data.values ?? [];
    const members: Member[] = [];

    // Skip header row (row 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue; // Skip incomplete rows

      const [memberId, name, accessCodeHash, expaId, activeStr] = row;

      if (!memberId || !name || !accessCodeHash) continue;

      members.push({
        memberId: memberId.trim(),
        name: name.trim(),
        accessCodeHash: accessCodeHash.trim(),
        expaId: expaId?.trim(),
        active: activeStr?.toLowerCase() === "true" || activeStr === "1" || activeStr === "yes",
      });
    }

    return members;
  } catch (error) {
    console.error("[membersServer] Failed to load members from sheet:", error);
    
    // In development, fall back to DEV_MEMBERS on error
    if (process.env.NODE_ENV !== "production") {
      console.warn("[membersServer] Falling back to development members");
      return DEV_MEMBERS;
    }
    
    throw error;
  }
}

/**
 * Ensure the Members tab exists in the spreadsheet
 */
async function ensureMembersTab(sheets: any) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: MEMBERS_SPREADSHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      (sheet: any) => sheet.properties?.title === MEMBERS_TAB
    );

    if (!sheetExists) {
      console.log(`[membersServer] Creating ${MEMBERS_TAB} tab`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: MEMBERS_SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: MEMBERS_TAB,
                },
              },
            },
          ],
        },
      });

      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: MEMBERS_SPREADSHEET_ID,
        range: `'${MEMBERS_TAB}'!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["memberId", "name", "accessCodeHash", "expaId", "active"]],
        },
      });
    }
  } catch (error) {
    console.error("[membersServer] Failed to ensure Members tab:", error);
    throw error;
  }
}

/**
 * Verify a member's access code
 */
export async function verifyMemberAccessCode(
  identifier: string, // memberId or name
  accessCode: string
): Promise<Member | null> {
  const members = await loadMembersFromSheet();
  
  // Find member by memberId or name (case-insensitive)
  const member = members.find(
    m => 
      m.memberId.toLowerCase() === identifier.toLowerCase() ||
      m.name.toLowerCase() === identifier.toLowerCase()
  );

  if (!member) {
    return null;
  }

  // Check if member is active
  if (!member.active) {
    return null;
  }

  // Verify access code against bcrypt hash
  const isValid = await bcrypt.compare(accessCode, member.accessCodeHash);
  if (!isValid) {
    return null;
  }

  return member;
}
