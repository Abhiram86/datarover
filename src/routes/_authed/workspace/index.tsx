import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { logoutFn } from "@/utils/auth.functions";
import { useUserStore } from "@/store/user";
import {
  MoreVertical,
  Layout,
  Search,
  Bell,
  Settings,
  Plus,
  Edit2,
  Copy,
  Share2,
  Trash2,
  LogOut,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deleteWorkspace, getWorkspaces, renameWorkspace } from "@/utils/workspaces.functions";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/formatDates";
import { WorkspaceGridSkeleton } from "@/components/skeletons/WorkspaceGridSkeleton";

const workspaceQuery = queryOptions({
  queryKey: ["workspaces"],
  queryFn: getWorkspaces,
});

export const Route = createFileRoute("/_authed/workspace/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const queryData = await context.queryClient.ensureQueryData(workspaceQuery);
    return queryData;
  },
  errorComponent: ({ error }) => {
    const { user } = Route.useRouteContext();
    return (
      <div className="h-screen w-full flex flex-col bg-primary p-8 max-w-7xl mx-auto">
        <WorkspaceListHeader user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-neutral-strong/60 text-sm">
            Failed to load workspaces: {error.message}
          </div>
        </div>
      </div>
    );
  },
  pendingComponent: WorkspaceGridSkeleton,
});

const WorkspaceApp = ({ user, workspacesData }: { user: any; workspacesData: any }) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!workspacesData?.success) {
    return (
      <div className="h-screen w-full flex flex-col bg-primary p-8 max-w-7xl mx-auto">
        <WorkspaceListHeader user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-neutral-strong/60 text-sm">
            {workspacesData?.error?.message || "Unknown error"}
          </div>
        </div>
      </div>
    );
  }

  const workspaces = workspacesData.data;
  const filteredWorkspaces = workspaces.filter((ws: any) =>
    ws.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
      <WorkspaceListHeader user={user} onSearch={setSearchQuery} />
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-2xl font-black text-neutral-strong tracking-tight">
              Workspaces
            </h1>
            <p className="text-xs font-medium text-neutral-strong/40 uppercase tracking-[0.2em] mt-1">
              {searchQuery
                ? `${filteredWorkspaces.length} workspace${filteredWorkspaces.length !== 1 ? "s" : ""} found`
                : "Select a project to resume analysis"}
            </p>
          </div>

          <Link
            to="/workspace/$slug"
            params={{
              slug: "new",
            }}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-strong text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-xl hover:shadow-neutral-strong/10 transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} strokeWidth={3} />
            New Workspace
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Link
            to="/workspace/$slug"
            params={{
              slug: "new",
            }}
            className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-strong/5 rounded-2xl p-5 hover:border-neutral-strong/20 hover:bg-neutral-strong/1 transition-all group min-h-45"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-strong/5 flex items-center justify-center mb-3 group-hover:bg-neutral-strong/10 transition-colors">
              <Plus size={18} className="text-neutral-strong/40" />
            </div>
            <span className="text-[10px] font-black text-neutral-strong/40 uppercase tracking-widest">
              Create Blank
            </span>
          </Link>

          {filteredWorkspaces.length === 0 && searchQuery ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-strong/40">
              <Search size={32} className="mb-3" />
              <p className="text-sm font-bold">No workspaces found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          ) : (
            filteredWorkspaces.map((ws: any) => (
              <WorkspaceCard key={ws.id} {...ws} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const workspacesData = Route.useLoaderData();

  return <WorkspaceApp user={user} workspacesData={workspacesData} />;
}

interface WorkspaceCardProps {
  id: string;
  name: string | null;
  lastModified: Date | null;
}

const WorkspaceCard = ({ id, name, lastModified }: WorkspaceCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteWorkspaceFn = useServerFn(deleteWorkspace);
  const renameWorkspaceFn = useServerFn(renameWorkspace);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkspaceFn({ data: id }),
    onSuccess: async (result) => {
      if (result.success) {
        toast.success("Workspace purged successfully");
        queryClient.removeQueries({
          queryKey: ["workspace", id],
          exact: true,
        });

        await queryClient.invalidateQueries({
          queryKey: ["workspaces"],
        });
      } else {
        toast.error("Failed to delete workspace");
      }
    },
    onError: () => {
      toast.error("Network error during deletion");
    },
  });

  const renameMutation = useMutation({
    mutationFn: (data: { id: string; name: string }) => renameWorkspaceFn({ data }),
    onSuccess: async (result) => {
      if (result.success) {
        toast.success("Workspace renamed successfully");
        await queryClient.invalidateQueries({
          queryKey: ["workspaces"],
        });
      } else {
        toast.error("Failed to rename workspace");
      }
    },
    onError: () => {
      toast.error("Network error during rename");
    },
  });

  const handleDelete = (id: string) => {
    toast.custom(
      (t) => (
        <div
          className={`
        flex flex-col gap-3 min-w-[320px] p-4 rounded-xl border shadow-2xl
        bg-primary border-red-500/20 shadow-neutral-strong/5
        transition-all duration-300 ease-out
        ${t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"}
      `}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 leading-none">
                Dangerous Action
              </span>
              <div className="text-xs font-bold text-neutral-strong/80 leading-tight">
                Permanently delete this workspace?
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              disabled={deleteMutation.isPending}
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-[10px] font-bold text-neutral-strong/40 hover:text-neutral-strong uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await executeDelete(id);
              }}
              className="px-3 py-1.5 bg-red-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
  };

  const handleRename = (id: string, currentName: string | null) => {
    const newName = currentName || "";
    toast.custom(
      (t) => (
        <div
          className={`
        flex flex-col gap-3 min-w-[320px] p-4 rounded-xl border shadow-2xl
        bg-primary border-neutral-strong/10 shadow-neutral-strong/5
        transition-all duration-300 ease-out
        ${t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"}
      `}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-neutral-strong/10 rounded-lg">
              <Edit2 size={16} className="text-neutral-strong" />
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-strong/60 leading-none">
                  Rename Workspace
                </span>
              </div>
              <input
                type="text"
                defaultValue={newName}
                id={`rename-input-${id}`}
                className="w-full px-3 py-2 bg-neutral-strong/5 border border-neutral-strong/10 rounded-lg text-xs font-bold text-neutral-strong focus:outline-none focus:border-neutral-strong/20"
                placeholder="Workspace name..."
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              disabled={renameMutation.isPending}
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-[10px] font-bold text-neutral-strong/40 hover:text-neutral-strong uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const input = document.getElementById(`rename-input-${id}`) as HTMLInputElement;
                const value = input?.value?.trim();
                if (!value) {
                  toast.error("Workspace name cannot be empty");
                  return;
                }
                toast.dismiss(t.id);
                await executeRename(id, value);
              }}
              disabled={renameMutation.isPending}
              className="px-3 py-1.5 bg-neutral-strong text-primary rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition-all shadow-neutral-strong/10 disabled:opacity-50"
            >
              Rename
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
  };

  const executeDelete = async (id: string) => {
    const loadingToast = toast.loading("Purging workspace data...");

    deleteMutation.mutate(id, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      },
    });
  };

  const executeRename = async (id: string, newName: string) => {
    const loadingToast = toast.loading("Renaming workspace...");

    renameMutation.mutate(
      { id, name: newName },
      {
        onSettled: () => {
          toast.dismiss(loadingToast);
        },
      },
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div className="relative">
      <Link
        to="/workspace/$slug"
        params={{
          slug: id,
        }}
        className="group flex flex-col bg-neutral-strong/2 border border-neutral-strong/10 rounded-2xl p-5 hover:bg-neutral-strong/4 hover:border-neutral-strong/20 transition-all cursor-pointer h-full"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary border border-neutral-strong/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Layout size={20} className="text-neutral-strong/60" />
          </div>

          <button
            onClick={handleMenuClick}
            className={`p-1 rounded-md transition-colors cursor-pointer ${showMenu ? "bg-neutral-strong/10 text-neutral-strong" : "text-neutral-strong/20 hover:text-neutral-strong"}`}
          >
            <MoreVertical size={18} />
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-neutral-strong mb-1 truncate pr-4">
            {name}
          </h3>
          <span
            suppressHydrationWarning
            className="text-[10px] font-medium text-neutral-strong/40"
          >
            Edited {formatDate(lastModified)}
          </span>
        </div>
      </Link>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-12 w-48 bg-primary border border-neutral-strong/10 rounded-xl shadow-xl shadow-neutral-strong/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-1.5 space-y-0.5">
            <MenuButton
              onclick={() => handleRename(id, name)}
              icon={<Edit2 size={14} />}
              label="Rename"
            />
            <MenuButton icon={<Copy size={14} />} label="Duplicate" />
            <MenuButton icon={<Share2 size={14} />} label="Share" />
            <div className="h-px bg-neutral-strong/5 my-1" />
            <MenuButton
              onclick={() => handleDelete(id)}
              icon={<Trash2 size={14} />}
              label="Delete"
              variant="danger"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger";
  onclick?: () => void;
}

const MenuButton = ({
  icon,
  label,
  variant = "default",
  onclick,
}: MenuButtonProps) => (
  <button
    onClick={onclick}
    className={`
    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors
    ${
      variant === "danger"
        ? "text-red-500 hover:bg-red-50"
        : "text-neutral-strong/70 hover:bg-neutral-strong/5 hover:text-neutral-strong"
    }
  `}
  >
    {icon}
    {label}
  </button>
);

interface WorkspaceListHeaderProps {
  user: {
    userId: string;
    email: string;
    name: string;
  };
  onSearch?: (query: string) => void;
}

const WorkspaceListHeader = ({ user, onSearch }: WorkspaceListHeaderProps) => {
  const logout = useServerFn(logoutFn);
  const storeLogout = useUserStore((s) => s.actions.logout);
  const [showLogout, setShowLogout] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const logoutRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    storeLogout();
    await logout();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        logoutRef.current &&
        !logoutRef.current.contains(event.target as Node)
      ) {
        setShowLogout(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-16 w-full bg-primary border-b border-neutral-strong/5 flex items-center justify-between px-8 select-none">
      <Link to="/" className="flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 bg-neutral-strong rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary rotate-45" />
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-neutral-strong leading-none">
            Assistant
          </span>
          <span className="text-[9px] font-bold text-neutral-strong/30 uppercase tracking-widest mt-1">
            Platform
          </span>
        </div>
      </Link>

      <div className="hidden md:flex items-center w-full max-w-md bg-neutral-strong/5 border border-neutral-strong/5 rounded-full px-4 py-1.5 focus-within:border-neutral-strong/20 transition-all">
        <Search size={14} className="text-neutral-strong/30" />
        <input
          type="text"
          placeholder="Search projects..."
          className="bg-transparent border-none outline-none focus:ring-0 text-xs w-full ml-2 placeholder:text-neutral-strong/20"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange("")}
            className="text-neutral-strong/30 hover:text-neutral-strong transition-colors ml-1"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-neutral-strong/30 hover:text-neutral-strong transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2 text-neutral-strong/30 hover:text-neutral-strong transition-colors">
          <Settings size={18} />
        </button>
        <div className="relative" ref={logoutRef}>
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="w-8 h-8 rounded-full bg-neutral-strong/10 border border-neutral-strong/10 flex items-center justify-center text-[10px] font-black hover:bg-neutral-strong/20 transition-colors cursor-pointer"
            title={user.name}
          >
            {userInitials}
          </button>
          {showLogout && (
            <div className="absolute right-0 top-10 w-40 bg-primary border border-neutral-strong/10 rounded-xl shadow-xl shadow-neutral-strong/5 z-50 overflow-hidden">
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
