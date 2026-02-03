import * as XLSX from "xlsx";
import { db } from "./db.server";
import { workspacesTable } from "@/db/schema";
import { supabase } from "./supabase.server";
import type { UploadPermission } from "@/types/file";

const storage = supabase.storage.from("datafiles");

export async function parseCSVPreview(file: File) {
  const text = await file.text();

  // Use SheetJS to parse CSV properly (handles quoted commas, newlines in fields, etc.)
  const workbook = XLSX.read(text, { type: "string" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      fileName: file.name,
      fileType: "csv" as const,
      columns: [],
      rows: [],
      totalPreviewRows: 0,
    };
  }

  const sheet = workbook.Sheets[firstSheetName];

  // Convert to JSON objects (first row becomes keys automatically)
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
  });

  const previewRows = jsonRows.slice(0, 2000);
  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  return {
    fileName: file.name,
    fileType: "csv" as const,
    columns,
    rows: previewRows,
    totalPreviewRows: previewRows.length,
  };
}

export async function parseExcelPreview(file: File) {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      fileName: file.name,
      fileType: "excel" as const,
      columns: [],
      rows: [],
      totalPreviewRows: 0,
    };
  }

  const sheet = workbook.Sheets[firstSheetName];

  // Convert sheet to JSON rows (objects)
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "", // keep empty cells
  });

  const previewRows = jsonRows.slice(0, 2000);
  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  return {
    fileName: file.name,
    fileType: "excel" as const,
    columns,
    rows: previewRows,
    totalPreviewRows: previewRows.length,
  };
}

import type { ParsedPreview } from "@/types/file";

export async function parseDataFromFile(file: File): Promise<ParsedPreview> {
  const fileName = file.name.toLowerCase();

  // Decide type
  const isCSV = file.type === "text/csv" || fileName.endsWith(".csv");

  const isExcel =
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";

  if (isCSV) {
    return parseCSVPreview(file);
  }

  if (isExcel) {
    return parseExcelPreview(file);
  }

  return {
    fileName: file.name,
    fileType: "unknown",
    columns: [],
    rows: [],
    totalPreviewRows: 0,
  };
}

interface UploadToSupabaseParams {
  fileName: string;
  fileType: string;
  userId: string;
}

export async function uploadToSupabase({
  fileName,
  fileType,
  userId,
}: UploadToSupabaseParams): Promise<UploadPermission> {
  try {
    const newW = await db
      .insert(workspacesTable)
      .values({
        file_type: fileType,
        name: fileName,
        user_id: userId,
      })
      .returning({ id: workspacesTable.id });
    const { data, error } = await storage.createSignedUploadUrl(
      `data/${newW[0].id}`,
    );
    console.error("supabase upload", error);
    if (error) {
      return {
        workspaceId: newW[0].id,
        permission: false,
        data: null,
        error: error.message,
      };
    }
    return { workspaceId: newW[0].id, permission: true, data, error: null };
  } catch (error) {
    console.error(error);
    return { workspaceId: null, permission: false, data: null, error: null };
  }
}
