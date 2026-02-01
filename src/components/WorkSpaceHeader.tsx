import { useFileStore } from "@/store/file";
import { uploadFile, writeFileToDB } from "@/utils/files.functions";
import type { WorkspaceHeaderProps } from "@/types/server";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function WorkspaceHeader({ supabase }: WorkspaceHeaderProps) {
  const uploadFileFn = useServerFn(uploadFile);
  const navigate = useNavigate();
  const writeFileToDBFn = useServerFn(writeFileToDB);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: {
      id: string | null;
      name: string;
      user_id: string;
      file_type: string;
    }) => writeFileToDBFn({ data }),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      }
    },
  });
  const storage = supabase.storage.from("datafiles");
  const { preview, setPreview, setError, setUploading, isUploading } =
    useFileStore();
  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // 1. Initialize the loading toast
      const toastId = toast.loading("Initializing secure upload...");

      const formData = new FormData();
      formData.append("file", file);

      try {
        setUploading(true);

        // Stage 1: Get Permissions
        const resp = await uploadFileFn({ data: formData });

        if (resp.success && resp.data.perms.permission) {
          // Update toast for the next stage
          toast.loading("Transferring file to storage...", { id: toastId });

          // Stage 2: Storage Upload
          await storage.uploadToSignedUrl(
            resp.data.perms.data?.path!,
            resp.data.perms.data?.token!,
            file,
          );

          // Stage 3: Sync with Database
          toast.loading("Finalizing workspace...", { id: toastId });
          mutation.mutate(
            {
              id: resp.data.perms.workspaceId,
              name: file.name,
              user_id: "7ceb974a-e22d-4923-8398-aac2c0c10ec6", // Consider pulling from auth context
              file_type: file.type || "text/csv",
            },
            {
              onSettled: () => {
                toast.success(`${file.name} ready for analysis`, {
                  id: toastId,
                });
                setPreview(resp.data.preview);
                navigate({
                  to: "/workspace/$slug",
                  params: { slug: resp.data.perms.workspaceId! },
                  replace: true,
                });
              },
            },
          );
        } else {
          toast.error(resp.error?.message || "Upload permission denied", {
            id: toastId,
          });
          setError("Failed to upload file");
        }
      } catch (error) {
        console.error(error);
        toast.error("Process interrupted. Please try again.", { id: toastId });
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  return (
    <div className="h-12 w-full bg-primary border-b border-neutral-strong/5 flex items-center justify-between px-4 select-none">
      {/* Left: App Logo + Unified File Cluster */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-neutral-strong rounded flex items-center justify-center">
            <div className="w-3 h-3 border border-primary rotate-45" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-strong">
            Assistant
          </span>
        </div>

        <div className="h-4 w-px bg-neutral-strong/10" />

        {/* Integrated File Group */}
        <div
          onClick={!isUploading ? handleFileUpload : undefined}
          className={`flex items-center gap-1.5 p-1 px-2 rounded-lg transition-colors cursor-pointer group ${isUploading ? "" : "hover:bg-neutral-strong/5"}`}
        >
          {isUploading ? (
            <svg
              className="w-3.5 h-3.5 text-neutral-strong/60 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5 text-neutral-strong/40 group-hover:text-neutral-strong"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          )}
          <span className="text-xs font-bold text-neutral-strong/80">
            {isUploading
              ? "Uploading..."
              : (preview?.fileName ?? "Untitled_Dataset.csv")}
          </span>
          {!isUploading && (
            <div className="px-1.5 py-0.5 rounded bg-neutral-strong/5 border border-neutral-strong/5 text-[9px] font-black text-neutral-strong/40">
              CSV
            </div>
          )}
        </div>
      </div>

      {/* Center: Subtle Telemetry (Cleaner Memory UI) */}
      <div className="hidden md:flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/30 animate-ping absolute" />
          </div>
          <span className="text-[9px] font-black text-neutral-strong/30 uppercase tracking-[0.15em]">
            System Live
          </span>
        </div>

        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[8px] font-bold text-neutral-strong/30 uppercase tracking-tighter leading-none">
            Tracking
          </span>
          <span className="text-[10px] font-black text-neutral-strong leading-none">
            14 Mutations
          </span>
        </div>
      </div>

      {/* Right: User/Session Actions (No more Execute) */}
      <div className="flex items-center gap-4">
        <button className="text-[10px] font-bold text-neutral-strong/40 hover:text-neutral-strong transition-colors uppercase tracking-widest">
          Export
        </button>
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-neutral-strong/20 to-neutral-strong/5 border border-neutral-strong/10 flex items-center justify-center text-[10px] font-bold">
          JD
        </div>
      </div>
    </div>
  );
}
