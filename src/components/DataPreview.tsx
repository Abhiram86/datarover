import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { useFileStore } from "@/store/file";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspacePreview } from "@/utils/workspaces.functions";
import { useQuery } from "@tanstack/react-query";

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataPreviewProps {
  workspaceId: string;
}

export default function DataPreview({ workspaceId }: DataPreviewProps) {
  const { preview, setPreview } = useFileStore();

  const getWorkspacePreviewFn = useServerFn(getWorkspacePreview);

  const { data: previewData, isLoading: queryLoading } = useQuery({
    queryKey: ["workspace-preview", workspaceId],
    queryFn: () => getWorkspacePreviewFn({ data: workspaceId }),
    enabled: workspaceId !== "new" && !preview,
  });

  useEffect(() => {
    if (previewData?.success && previewData.data) {
      setPreview(previewData.data);
    }
  }, [previewData, setPreview]);

  const rows = preview?.rows ?? [];
  const columns = preview?.columns ?? [];

  const columnDefs = useMemo<ColDef[]>(() => {
    // Prefer columns from server
    if (columns.length > 0) {
      return columns.map((key) => ({
        field: key,
        headerName: key.toUpperCase(),
        filter: true,
        sortable: true,
        resizable: true,
      }));
    }

    // Fallback: infer from first row
    if (rows.length === 0) return [];

    return Object.keys(rows[0]).map((key) => ({
      field: key,
      headerName: key.toUpperCase(),
      filter: true,
      sortable: true,
      resizable: true,
    }));
  }, [columns, rows]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 120,
    }),
    [],
  );

  const isLoading =
    workspaceId !== "new" &&
    !preview &&
    (queryLoading || previewData === undefined);

  return (
    <div className="h-full w-full flex flex-col bg-slate-800 p-4">
      {workspaceId === "new" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-white/40">Upload a file to preview data</p>
        </div>
      )}

      {workspaceId !== "new" && isLoading && <DataPreviewSkeleton />}

      {workspaceId !== "new" && !isLoading && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">
              Data Explorer
            </h4>

            <span className="text-[10px] font-mono text-primary bg-blue-400/5 px-2 py-1 rounded border border-blue-400/10">
              {rows.length} ROWS
            </span>
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
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const DataPreviewSkeleton = () => (
  <div className="h-full w-full flex flex-col bg-slate-800 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-32 bg-slate-700/30 rounded animate-pulse" />
      <div className="h-5 bg-blue-400/5 px-2 py-1 rounded border border-blue-400/10 w-16 animate-pulse" />
    </div>
    <div className="flex-1 overflow-hidden rounded-lg border border-white/10 p-2">
      <div className="h-full w-full space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 bg-slate-700/20 rounded animate-pulse"
            />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="h-8 bg-slate-700/10 rounded border border-slate-600/20"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);
