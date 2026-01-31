import { AllCommunityModule, ColDef, ModuleRegistry } from "ag-grid-community";
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { useFileStore } from "@/store/file";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataPreview() {
  const preview = useFileStore((s) => s.preview);

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

  if (!preview) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-800 p-4">
        <p className="text-xs text-white/40">Upload a file to preview data</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">
          Data Explorer
        </h4>

        <span className="text-[10px] font-mono text-primary bg-blue-400/5 px-2 py-1 rounded border border-blue-400/10">
          {rows.length} ROWS
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-white/5">
        <div className="ag-theme-quartz-dark h-full w-full hybrid-grid">
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            suppressCellFocus={true}
          />
        </div>
      </div>
    </div>
  );
}
