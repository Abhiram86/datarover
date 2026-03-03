import { useState, useEffect, useRef } from "react";
import { useInsightsStore, type Insight } from "@/store/insights";
import {
  Brain,
  Edit,
  Trash2,
  X,
  Lightbulb,
  Info,
  Target,
  ChevronDown,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface InsightsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  important: {
    label: "Important",
    icon: Lightbulb,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  general: {
    label: "General",
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  user_goals: {
    label: "User Goals",
    icon: Target,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
};

export default function InsightsViewer({
  isOpen,
  onClose,
}: InsightsViewerProps) {
  const insights = useInsightsStore((s) => s.insights);
  const updateInsight = useInsightsStore((s) => s.updateInsight);
  const deleteInsight = useInsightsStore((s) => s.deleteInsight);
  const moveInsight = useInsightsStore((s) => s.moveInsight);
  const modalRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<
    "important" | "general" | "user_goals"
  >("general");
  const [editingInsight, setEditingInsight] = useState<{
    id: number;
    type: "important" | "general" | "user_goals";
  } | null>(null);

  const activeInsights = insights[activeTab].sort((a, b) => a.id - b.id);
  const totalCount =
    insights.important.length +
    insights.general.length +
    insights.user_goals.length;

  const ActiveIcon = typeConfig[activeTab].icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEdit = (insight: Insight) => {
    setEditingInsight({
      id: insight.id,
      type: insight.type as "important" | "general" | "user_goals",
    });
  };

  const handleCancelEdit = () => {
    setEditingInsight(null);
  };

  const handleSave = (
    type: "important" | "general" | "user_goals",
    id: number,
    context: string,
    source?: string,
    newType?: "important" | "general" | "user_goals",
  ) => {
    if (!context.trim()) {
      toast.error("Insight context cannot be empty");
      return;
    }

    const updates: Partial<Insight> = { context };
    if (source !== undefined) {
      updates.source = source || undefined;
    }

    updateInsight(type, id, updates);

    if (newType && newType !== type) {
      moveInsight(type, newType, id);
      if (activeTab === type) {
        const nextTab = insights[newType].length > 0 ? newType : activeTab;
        setActiveTab(nextTab);
      }
    }

    setEditingInsight(null);
    toast.success("Insight updated");
  };

  const handleDelete = (
    type: "important" | "general" | "user_goals",
    id: number,
    context: string,
  ) => {
    toast.custom(
      (t) => (
        <div
          className={`
          flex flex-col gap-3 min-w-[320px] p-4 rounded-xl border shadow-2xl
          bg-primary border-neutral-strong/20 shadow-neutral-strong/10
          transition-all duration-300 ease-out
          ${t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"}
        `}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-neutral-strong/10 rounded-lg">
              <Trash2 size={16} className="text-neutral-strong" />
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-strong/60 leading-none block mb-1">
                Confirm Delete
              </span>
              <div className="text-xs font-bold text-neutral-strong leading-tight">
                Delete this insight?
              </div>
              <div className="text-[10px] text-neutral-strong/50 mt-1 truncate max-w-[200px]">
                {context}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-[10px] font-bold text-neutral-strong/40 hover:text-neutral-strong uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                deleteInsight(type, id);
                toast.success("Insight deleted");
              }}
              className="px-3 py-1.5 bg-neutral-strong text-primary rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition-all shadow-neutral-strong/10"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
  };

  return (
    <div className="fixed inset-0 bg-neutral-strong/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
      <div
        ref={modalRef}
        className="bg-primary border border-neutral-strong/20 rounded-2xl shadow-2xl shadow-neutral-strong/20 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-strong/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-strong/10 rounded-lg">
              <Brain size={18} className="text-neutral-strong" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-neutral-strong leading-none">
                Insights
              </h2>
              <span className="text-[9px] font-bold text-neutral-strong/40 uppercase tracking-widest mt-0.5">
                {totalCount} total
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-strong/40 hover:text-neutral-strong hover:bg-neutral-strong/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-strong/10">
          {(["important", "general", "user_goals"] as const).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            const count = insights[type].length;
            const isActive = activeTab === type;

            return (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type);
                  setEditingInsight(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-all ${
                  isActive
                    ? `border-neutral-strong ${config.color}`
                    : "border-transparent text-neutral-strong/40 hover:text-neutral-strong"
                }`}
              >
                <Icon size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {config.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${isActive ? config.bgColor + " " + config.color : "bg-neutral-strong/10 text-neutral-strong/60"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar p-4">
          {activeInsights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-strong/30">
              <ActiveIcon size={40} className="mb-3 opacity-50" />
              <p className="text-sm font-bold">No insights yet</p>
              <p className="text-xs mt-1">
                Interact with the AI to generate insights
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeInsights.map((insight) => (
                <InsightItem
                  key={`${insight.type}-${insight.id}`}
                  insight={insight}
                  isEditing={editingInsight?.id === insight.id}
                  onEdit={() => handleEdit(insight)}
                  onCancel={handleCancelEdit}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface InsightItemProps {
  insight: Insight;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (
    type: "important" | "general" | "user_goals",
    id: number,
    context: string,
    source?: string,
    newType?: "important" | "general" | "user_goals",
  ) => void;
  onDelete: (
    type: "important" | "general" | "user_goals",
    id: number,
    context: string,
  ) => void;
}

function InsightItem({
  insight,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: InsightItemProps) {
  const [context, setContext] = useState(insight.context);
  const [source, setSource] = useState(insight.source || "");
  const [selectedType, setSelectedType] = useState<
    "important" | "general" | "user_goals"
  >(insight.type as "important" | "general" | "user_goals");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = typeConfig[selectedType];
  const Icon = config.icon;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div
        className={`bg-neutral-strong/5 border-2 ${config.borderColor} rounded-lg p-3 transition-all relative`}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="text-[10px] font-black text-neutral-strong/50">
            #
          </span>
          <span className="text-[10px] font-black text-neutral-strong">
            {insight.id}
          </span>
          <Icon size={14} className={config.color} />
        </div>

        <textarea
          ref={textareaRef}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Insight context..."
          className="w-full bg-transparent border-none outline-none text-xs text-neutral-strong resize-none min-h-[60px] mb-2 placeholder:text-neutral-strong/30"
          rows={3}
        />

        <div className="mb-2">
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (optional)..."
            className="w-full bg-neutral-strong/5 border border-neutral-strong/10 rounded px-2 py-1 text-[9px] text-neutral-strong placeholder:text-neutral-strong/30 focus:outline-none focus:border-neutral-strong/30"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const typeMenu = document.getElementById(`type-menu-${insight.id}`);
                typeMenu?.classList.toggle("hidden");
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-neutral-strong/10 border border-neutral-strong/20 rounded text-[9px] font-bold text-neutral-strong hover:bg-neutral-strong/20 hover:border-neutral-strong/30 transition-all cursor-pointer min-w-[100px] justify-between"
            >
              <span className="flex items-center gap-1">
                {selectedType === "important" && "🔴 "}
                {selectedType === "general" && "🔵 "}
                {selectedType === "user_goals" && "🟢 "}
                {typeConfig[selectedType].label}
              </span>
              <ChevronDown size={10} className="text-neutral-strong/50" />
            </button>

            <div
              id={`type-menu-${insight.id}`}
              className="absolute z-10 hidden bg-primary border border-neutral-strong/10 rounded-lg shadow-xl shadow-neutral-strong/5 p-1 min-w-[120px] top-full left-0 mt-1"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedType("important");
                  document.getElementById(`type-menu-${insight.id}`)?.classList.add("hidden");
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold text-neutral-strong hover:bg-neutral-strong/5 rounded transition-colors"
              >
                🔴 Important
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("general");
                  document.getElementById(`type-menu-${insight.id}`)?.classList.add("hidden");
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold text-neutral-strong hover:bg-neutral-strong/5 rounded transition-colors"
              >
                🔵 General
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("user_goals");
                  document.getElementById(`type-menu-${insight.id}`)?.classList.add("hidden");
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold text-neutral-strong hover:bg-neutral-strong/5 rounded transition-colors"
              >
                🟢 User Goals
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-neutral-strong/50 hover:text-neutral-strong hover:bg-neutral-strong/10 rounded transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                onSave(
                  insight.type as any,
                  insight.id,
                  context,
                  source || undefined,
                  selectedType,
                )
              }
              className="flex items-center gap-1 px-2 py-1 bg-neutral-strong text-primary rounded text-[9px] font-black uppercase tracking-wider hover:shadow-xl transition-all shadow-neutral-strong/10"
            >
              <Check size={12} />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-strong/5 border border-neutral-strong/10 rounded-lg p-3 hover:bg-neutral-strong/10 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-neutral-strong/40">
              #
            </span>
            <span className="text-[10px] font-black text-neutral-strong/40">
              {insight.id}
            </span>
            <Icon size={12} className={config.color} />
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-black ${config.bgColor} ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <p className="text-xs text-neutral-strong/80 leading-relaxed whitespace-pre-wrap break-words">
            {insight.context}
          </p>
          {insight.source && (
            <div className="text-[9px] text-neutral-strong/30 mt-1">
              Source: {insight.source}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-neutral-strong/40 hover:text-neutral-strong hover:bg-neutral-strong/10 transition-colors"
            title="Edit insight"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() =>
              onDelete(insight.type as any, insight.id, insight.context)
            }
            className="p-1.5 rounded text-neutral-strong/40 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete insight"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
