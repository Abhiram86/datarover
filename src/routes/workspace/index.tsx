import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { deleteWorkspace, getWorkspaces } from "@/utils/workspaces.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/workspace/")({
  loader: async () => {
    const data = await getWorkspaces();
    return {
      data,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();
  if (!loaderData.data.success) {
    return <div>Error: {loaderData.data.error.message}</div>;
  }

  const workspaces = loaderData.data.data;

  return (
    <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
      <WorkspaceListHeader />
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-2xl font-black text-neutral-strong tracking-tight">
              Workspaces
            </h1>
            <p className="text-xs font-medium text-neutral-strong/40 uppercase tracking-[0.2em] mt-1">
              Select a project to resume analysis
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

        {/* Grid Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Prompt/Empty State Card */}
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

          {workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} {...ws} />
          ))}
        </div>
      </main>
    </div>
  );
}

export const WorkspaceCard = ({
  id,
  name,
  lastModified,
}: {
  id: string;
  name: string | null;
  lastModified: string | null;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteWorkspaceFn = useServerFn(deleteWorkspace);

  const handleDelete = async (id: string) => {
    const result = await deleteWorkspaceFn({ data: id });
    if (result.success) {
      alert("Deleted workspace");
    } else {
      console.error("Failed to delete workspace");
    }
  };

  // Close menu when clicking outside
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

          {/* Menu Trigger */}
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
          <span className="text-[10px] font-medium text-neutral-strong/40">
            Edited {lastModified}
          </span>
        </div>
      </Link>

      {/* Popup Modal / Dropdown */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-12 w-48 bg-primary border border-neutral-strong/10 rounded-xl shadow-xl shadow-neutral-strong/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-1.5 space-y-0.5">
            <MenuButton icon={<Edit2 size={14} />} label="Rename" />
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

// Sub-component for Menu Items
const MenuButton = ({
  icon,
  label,
  variant = "default",
  onclick,
}: {
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger";
  onclick?: () => void;
}) => (
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

export const WorkspaceListHeader = () => {
  return (
    <div className="h-16 w-full bg-primary border-b border-neutral-strong/5 flex items-center justify-between px-8 select-none">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center w-full max-w-md bg-neutral-strong/5 border border-neutral-strong/5 rounded-full px-4 py-1.5 focus-within:border-neutral-strong/20 transition-all">
        <Search size={14} className="text-neutral-strong/30" />
        <input
          type="text"
          placeholder="Search projects..."
          className="bg-transparent border-none outline-none focus:ring-0 text-xs w-full ml-2 placeholder:text-neutral-strong/20"
        />
      </div>

      {/* Right: User Settings */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-neutral-strong/30 hover:text-neutral-strong transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2 text-neutral-strong/30 hover:text-neutral-strong transition-colors">
          <Settings size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-neutral-strong/10 border border-neutral-strong/10 flex items-center justify-center text-[10px] font-black">
          JD
        </div>
      </div>
    </div>
  );
};
