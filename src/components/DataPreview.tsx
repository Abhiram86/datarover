import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  GridApi,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { themeAlpine } from "ag-grid-community";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { useDuckDBStore } from "@/store/duckdb";
import { DataPreviewSkeleton } from "@/components/skeletons/DataPreviewSkeleton";
import { getWorkspace } from "@/utils/workspaces.functions";
import { useFileStore } from "@/store/file";

ModuleRegistry.registerModules([AllCommunityModule]);

const DB_NAME = "DataRoverCache";
const DB_VERSION = 1;
const STORE_NAME = "parquetFiles";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function getCachedFile(key: string): Promise<Uint8Array | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const data = request.result;
      db.close();
      resolve(data?.buffer instanceof Uint8Array ? data.buffer : null);
    };
  });
}

export async function setCachedFile(key: string, buffer: Uint8Array): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ buffer }, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

export async function deleteCachedFile(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

interface DataPreviewProps {
  workspaceId: string;
  signedUrl: string;
}

export default function DataPreview({
  workspaceId,
  signedUrl,
}: DataPreviewProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const gridApiRef = useRef<GridApi | null>(null);

  const {
    initialize,
    close,
    loadParquet,
    getPreviewRows,
    columnNames,
    rowCount,
    isLoading: dbLoading,
    isInitialized,
    setMutationCallback,
    refreshSchema,
  } = useDuckDBStore();

  useEffect(() => {
    const loadCachedData = async () => {
      if (workspaceId === "new") {
        setIsLoadingCache(false);
        return;
      }

      try {
        const cached = await getCachedFile(workspaceId);
        if (cached && isInitialized) {
          await loadParquet(new Uint8Array(cached));
          setBuffer(cached);
          const previewRows = await getPreviewRows(2000);
          setRows(previewRows);
          if (gridApiRef.current) {
            gridApiRef.current.setGridOption("rowData", previewRows);
          }
        }
      } catch (e) {
        console.error("Failed to load cached data:", e);
      } finally {
        setIsLoadingCache(false);
      }
    };

    loadCachedData();
  }, [workspaceId, isInitialized]);

  useEffect(() => {
    initialize();
    return () => {
      close();
    };
  }, [initialize]);

  const [workspaceQuery, fileQuery] = useQueries({
    queries: [
      {
        queryKey: ["workspace-preview", workspaceId],
        queryFn: () => getWorkspace({ data: workspaceId }),
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["download-file", workspaceId, signedUrl],
        enabled: !!signedUrl && !buffer && !isLoadingCache,
        queryFn: async () => {
          const res = await fetch(signedUrl);
          if (!res.ok) throw new Error("Failed to download file");

          const blob = await res.blob();
          const arr = new Uint8Array(await blob.arrayBuffer());
          await setCachedFile(workspaceId, arr);
          return arr;
        },
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
    ],
  });

  useEffect(() => {
    if (!fileQuery.data) return;
    if (buffer) return;
    if (!isInitialized) return;

    useFileStore.getState().setPreview({
      fileName: workspaceQuery.data?.data?.workspace.name ?? "",
      fileType: workspaceQuery.data?.data?.workspace.fileType ?? "",
      columns: columnNames,
      rows: rows,
      totalPreviewRows: rowCount,
    });

    (async () => {
      await loadParquet(fileQuery.data);
      setBuffer(fileQuery.data);
      const previewRows = await getPreviewRows(2000);
      setRows(previewRows);
      if (gridApiRef.current) {
        gridApiRef.current.setGridOption("rowData", previewRows);
      }
    })();
  }, [fileQuery.data, buffer, isInitialized]);

  useEffect(() => {
    if (!isInitialized || workspaceId === "new") return;

    const refreshPreview = async () => {
      try {
        await refreshSchema();

        const previewRows = await getPreviewRows(2000);
        const updatedColumnNames = useDuckDBStore.getState().columnNames;

        setRows(previewRows);
        if (gridApiRef.current) {
          gridApiRef.current.setGridOption("rowData", previewRows);
          gridApiRef.current.setGridOption(
            "columnDefs",
            updatedColumnNames.map((key) => ({
              field: key,
              headerName: key.toUpperCase(),
              filter: true,
              sortable: true,
              resizable: true,
            })),
          );
        }

        const exportToParquet = useDuckDBStore.getState().exportToParquet;
        const buffer = await exportToParquet("data");
        await setCachedFile(workspaceId, buffer);
      } catch (e) {
        console.error("Failed to refresh preview:", e);
      }
    };

    setMutationCallback(refreshPreview);

    return () => {
      setMutationCallback(null);
    };
  }, [
    isInitialized,
    workspaceId,
    getPreviewRows,
    setMutationCallback,
    refreshSchema,
  ]);

  const columnDefs = useMemo<ColDef[]>(() => {
    if (columnNames.length === 0) return [];

    return columnNames.map((key) => ({
      field: key,
      headerName: key.toUpperCase(),
      filter: true,
      sortable: true,
      resizable: true,
    }));
  }, [columnNames]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 120,
    }),
    [],
  );

  const showLoading =
    dbLoading ||
    isLoadingCache ||
    workspaceQuery.isLoading ||
    fileQuery.isLoading;

  const showError = workspaceQuery.isError || fileQuery.isError;

  const showEmpty = workspaceId === "new";
  const showGrid = !showLoading && !showEmpty && !showError && buffer !== null;

  return (
    <div className="h-full w-full flex flex-col bg-slate-800 p-4">
      {showEmpty && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-white/40">Upload a file to preview data</p>
        </div>
      )}

      {showLoading && <DataPreviewSkeleton />}

      {showError && (
        <div className="flex-1 flex items-center justify-center text-red-400">
          <p className="text-xs">
            Error:{" "}
            {workspaceQuery.error
              ? workspaceQuery.error.message
              : fileQuery.error
                ? fileQuery.error.message
                : "Unknown error"}
          </p>
        </div>
      )}

      {showGrid && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">
              Data Explorer
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/60">
                Total: {rowCount.toLocaleString()} rows
              </span>
              <span className="text-[10px] font-mono text-primary bg-blue-400/5 px-2 py-1 rounded border border-blue-400/10">
                Showing: {rows.length} rows
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-lg border border-white/5">
            <div className="h-full w-full hybrid-grid">
              <AgGridReact
                theme={themeAlpine.withParams({
                  spacing: 4,
                  rowHeight: 32,
                  headerHeight: 36,
                })}
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowSelection="multiple"
                suppressCellFocus={true}
                pagination={rows.length > 1000}
                paginationPageSize={100}
                onGridReady={(params) => {
                  gridApiRef.current = params.api;
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
