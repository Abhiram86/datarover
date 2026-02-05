import * as XLSX from "xlsx";
import { db } from "./db.server";
import { workspacesTable } from "@/db/schema";
import { supabase } from "./supabase.server";
import type { UploadPermission, ParsedPreview } from "@/types/file";
import parquetjs from "@dsnp/parquetjs";
import { unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const storage = supabase.storage.from("datafiles");

export async function parseCSVPreview(file: File, limit: number = 2000) {
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

  // Use -1 to indicate no limit (full file)
  const previewRows = limit === -1 ? jsonRows : jsonRows.slice(0, limit);
  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  return {
    fileName: file.name,
    fileType: "csv" as const,
    columns,
    rows: previewRows,
    totalPreviewRows: previewRows.length,
  };
}

export async function parseExcelPreview(file: File, limit: number = 2000) {
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

  // Use -1 to indicate no limit (full file)
  const previewRows = limit === -1 ? jsonRows : jsonRows.slice(0, limit);
  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  return {
    fileName: file.name,
    fileType: "excel" as const,
    columns,
    rows: previewRows,
    totalPreviewRows: previewRows.length,
  };
}

function detectDate(value: any): boolean {
  if (typeof value !== "string" || !value) return false;
  
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/, // ISO datetime
    /^\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}/, // MM/DD/YYYY HH:MM
  ];
  
  if (!datePatterns.some((pattern) => pattern.test(value))) return false;
  
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function isInteger(value: number): boolean {
  return Number.isInteger(value) && 
    value >= Number.MIN_SAFE_INTEGER && 
    value <= Number.MAX_SAFE_INTEGER;
}

export async function toParquet(rows: Record<string, any>[]): Promise<Buffer> {
  if (rows.length === 0) {
    throw new Error("Cannot convert empty dataset to Parquet");
  }

  const schemaDef: any = {};
  const columnTypes: Map<string, string> = new Map();

  // Infer schema from data - make all fields optional to handle missing values
  for (const key of Object.keys(rows[0])) {
    const sampleValue = rows.find((row) => row[key] !== null && row[key] !== undefined && row[key] !== "")?.[key];
    
    if (sampleValue === undefined || sampleValue === null || sampleValue === "") {
      // Default to UTF8 for empty columns
      schemaDef[key] = { type: "UTF8", optional: true };
      columnTypes.set(key, "UTF8");
    } else if (typeof sampleValue === "boolean") {
      schemaDef[key] = { type: "BOOLEAN", optional: true };
      columnTypes.set(key, "BOOLEAN");
    } else if (typeof sampleValue === "number") {
      if (isInteger(sampleValue)) {
        schemaDef[key] = { type: "INT64", optional: true };
        columnTypes.set(key, "INT64");
      } else {
        schemaDef[key] = { type: "DOUBLE", optional: true };
        columnTypes.set(key, "DOUBLE");
      }
    } else if (detectDate(sampleValue)) {
      // Store dates as INT64 (timestamp in milliseconds)
      schemaDef[key] = { type: "INT64", originalType: "TIMESTAMP_MILLIS", optional: true };
      columnTypes.set(key, "TIMESTAMP");
    } else {
      schemaDef[key] = { type: "UTF8", optional: true };
      columnTypes.set(key, "UTF8");
    }
  }

  const schema = new parquetjs.ParquetSchema(schemaDef);
  
  // Create a temporary file path
  const tempFilePath = join(tmpdir(), `parquet-${Date.now()}-${Math.random().toString(36).substring(7)}.parquet`);
  
  // Write to temporary file
  const writer = await parquetjs.ParquetWriter.openFile(schema, tempFilePath);

  // Write rows
  for (const row of rows) {
    const processedRow: Record<string, any> = {};
    
    // Iterate over all schema keys to ensure all fields are present
    for (const key of Object.keys(rows[0])) {
      const value = row[key];
      const colType = columnTypes.get(key);
      
      if (value === null || value === undefined || value === "") {
        processedRow[key] = null;
      } else if (colType === "TIMESTAMP") {
        // Convert date string to timestamp
        const date = new Date(value);
        processedRow[key] = isNaN(date.getTime()) ? null : date.getTime();
      } else if (colType === "INT64") {
        processedRow[key] = BigInt(Math.floor(Number(value)));
      } else if (colType === "DOUBLE") {
        processedRow[key] = Number(value);
      } else if (colType === "BOOLEAN") {
        processedRow[key] = Boolean(value);
      } else {
        processedRow[key] = String(value);
      }
    }
    
    await writer.appendRow(processedRow);
  }

  await writer.close();
  
  // Read the file back as a buffer
  try {
    const { readFile } = await import("fs/promises");
    const buffer = await readFile(tempFilePath);
    
    // Clean up the temporary file
    await unlink(tempFilePath);
    
    return buffer;
  } catch (error) {
    // Try to clean up even if read failed
    try {
      await unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

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

interface ConvertAndUploadResult {
  success: boolean;
  workspaceId?: string;
  fileName?: string;
  preview?: ParsedPreview;
  error?: string;
}

export async function convertAndUploadToSupabase(
  file: File,
  userId: string
): Promise<ConvertAndUploadResult> {
  try {
    const fileName = file.name.toLowerCase();
    const isCSV = file.type === "text/csv" || fileName.endsWith(".csv");
    const isExcel =
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    let rows: Record<string, any>[] = [];
    let parsedPreview: ParsedPreview;

    // Parse full file (limit = -1 means parse all rows)
    if (isCSV) {
      parsedPreview = await parseCSVPreview(file, -1);
      rows = parsedPreview.rows;
    } else if (isExcel) {
      parsedPreview = await parseExcelPreview(file, -1);
      rows = parsedPreview.rows;
    } else {
      return {
        success: false,
        error: "Unsupported file format. Only CSV and Excel files are supported.",
      };
    }

    if (rows.length === 0) {
      return {
        success: false,
        error: "File is empty or could not be parsed",
      };
    }

    // Convert to Parquet
    const parquetBuffer = await toParquet(rows);

    // Create workspace entry
    const parquetFileName = file.name.replace(/\.[^/.]+$/, "") + ".parquet";
    const newW = await db
      .insert(workspacesTable)
      .values({
        file_type: "application/octet-stream",
        name: parquetFileName,
        user_id: userId,
      })
      .returning({ id: workspacesTable.id });

    const workspaceId = newW[0].id;

    // Upload to Supabase
    const { error: uploadError } = await storage.upload(
      `data/${workspaceId}`,
      parquetBuffer,
      {
        contentType: "application/octet-stream",
        upsert: false,
      }
    );

    if (uploadError) {
      return {
        success: false,
        error: `Failed to upload to storage: ${uploadError.message}`,
      };
    }

    return {
      success: true,
      workspaceId,
      fileName: parquetFileName,
      preview: {
        ...parsedPreview,
        fileName: parquetFileName,
        fileType: "csv", // Keep as csv for preview compatibility
      },
    };
  } catch (error) {
    console.error("Convert and upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
