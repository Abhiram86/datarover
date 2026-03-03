import { create } from "zustand";

export interface Insight {
  id: number;
  type: string;
  context: string;
  source?: string;
}

export interface InsightsData {
  important: Insight[];
  general: Insight[];
  user_goals: Insight[];
}

interface InsightsStoreState {
  workspaceId: string | null;
  insights: InsightsData;
  isLoaded: boolean;

  // Actions
  loadInsights: (workspaceId: string) => void;
  saveInsights: () => void;
  setWorkspaceId: (workspaceId: string) => void;
  setInsightsFromDB: (workspaceId: string, data: {
    insights: {
      important: Array<{ id: number; context: string; source?: string }>;
      general: Array<{ id: number; context: string; source?: string }>;
      user_goals: Array<{ id: number; context: string; source?: string }>;
    };
  }) => void;

  // CRUD operations
  getInsights: (
    type?: "important" | "general" | "user_goals",
    limit?: number,
    id?: number,
  ) => { insights: Insight[]; counts: Record<string, number> };
  addInsight: (
    type: "important" | "general" | "user_goals",
    context: string,
    source?: string,
  ) => number;
  updateInsight: (
    type: "important" | "general" | "user_goals",
    id: number,
    updates: Partial<Omit<Insight, "id">>,
  ) => boolean;
  deleteInsight: (
    type: "important" | "general" | "user_goals",
    id: number,
  ) => boolean;
  moveInsight: (
    fromType: "important" | "general" | "user_goals",
    toType: "important" | "general" | "user_goals",
    id: number,
  ) => boolean;

  reset: () => void;
}

const STORAGE_KEY_PREFIX = "insights_";

const getStorageKey = (workspaceId: string) =>
  `${STORAGE_KEY_PREFIX}${workspaceId}`;

const defaultInsights: InsightsData = {
  important: [],
  general: [],
  user_goals: [],
};

// Maximum number of insights per type (25 as requested)
const MAX_INSIGHTS_PER_TYPE = 25;

export const useInsightsStore = create<InsightsStoreState>((set, get) => ({
  workspaceId: null,
  insights: { ...defaultInsights },
  isLoaded: false,

  loadInsights: (workspaceId: string) => {
    try {
      const storageKey = getStorageKey(workspaceId);
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored) as InsightsData;
        set({
          workspaceId,
          insights: parsed,
          isLoaded: true,
        });
      } else {
        set({
          workspaceId,
          insights: { ...defaultInsights },
          isLoaded: true,
        });
      }
    } catch (error) {
      console.error("[Insights] Failed to load insights:", error);
      set({
        workspaceId,
        insights: { ...defaultInsights },
        isLoaded: true,
      });
    }
  },

  saveInsights: () => {
    const { workspaceId, insights } = get();
    if (!workspaceId) return;

    try {
      const storageKey = getStorageKey(workspaceId);
      localStorage.setItem(storageKey, JSON.stringify(insights));
    } catch (error) {
      console.error("[Insights] Failed to save insights:", error);
    }
  },

  setWorkspaceId: (workspaceId: string) => {
    set({ workspaceId });
  },

  setInsightsFromDB: (workspaceId: string, data: {
    insights: {
      important: Array<{ id: number; context: string; source?: string }>;
      general: Array<{ id: number; context: string; source?: string }>;
      user_goals: Array<{ id: number; context: string; source?: string }>;
    };
  }) => {
    const loadedInsights: InsightsData = {
      important: data.insights.important.map(i => ({
        id: i.id,
        type: "important",
        context: i.context,
        ...(i.source && { source: i.source }),
      })),
      general: data.insights.general.map(i => ({
        id: i.id,
        type: "general",
        context: i.context,
        ...(i.source && { source: i.source }),
      })),
      user_goals: data.insights.user_goals.map(i => ({
        id: i.id,
        type: "user_goals",
        context: i.context,
        ...(i.source && { source: i.source }),
      })),
    };
    
    set({
      workspaceId,
      insights: loadedInsights,
      isLoaded: true,
    });
  },

  getInsights: (type, limit, id) => {
    const { insights } = get();

    // Calculate counts for all types
    const counts = {
      important: insights.important.length,
      general: insights.general.length,
      user_goals: insights.user_goals.length,
    };

    // If specific ID requested, find it
    if (id !== undefined) {
      const searchTypes = type
        ? [type]
        : (["important", "general", "user_goals"] as const);

      for (const t of searchTypes) {
        const found = insights[t].find((i) => i.id === id);
        if (found) {
          return { insights: [found], counts };
        }
      }
      return { insights: [], counts };
    }

    // If type specified, return filtered results
    if (type) {
      let results = [...insights[type]];
      if (limit && limit > 0) {
        results = results.slice(0, limit);
      }
      return { insights: results, counts };
    }

    // Return all insights
    let allInsights: Insight[] = [
      ...insights.important,
      ...insights.general,
      ...insights.user_goals,
    ];

    if (limit && limit > 0) {
      allInsights = allInsights.slice(0, limit);
    }

    return { insights: allInsights, counts };
  },

  addInsight: (type, context, source) => {
    const { insights, saveInsights } = get();

    // Check if we've hit the limit
    if (insights[type].length >= MAX_INSIGHTS_PER_TYPE) {
      console.warn(
        `[Insights] Cannot add more ${type} insights. Maximum (${MAX_INSIGHTS_PER_TYPE}) reached.`,
      );
      return -1;
    }

    // Generate new ID (max + 1)
    const maxId = insights[type].reduce((max, i) => Math.max(max, i.id), 0);
    const newId = maxId + 1;

    const newInsight: Insight = {
      id: newId,
      type,
      context,
      ...(source && { source }),
    };

    set((state) => ({
      insights: {
        ...state.insights,
        [type]: [...state.insights[type], newInsight],
      },
    }));

    saveInsights();
    return newId;
  },

  updateInsight: (type, id, updates) => {
    const { insights, saveInsights } = get();

    const index = insights[type].findIndex((i) => i.id === id);
    if (index === -1) return false;

    set((state) => ({
      insights: {
        ...state.insights,
        [type]: state.insights[type].map((i) =>
          i.id === id ? { ...i, ...updates } : i,
        ),
      },
    }));

    saveInsights();
    return true;
  },

  deleteInsight: (type, id) => {
    const { insights, saveInsights } = get();

    const index = insights[type].findIndex((i) => i.id === id);
    if (index === -1) return false;

    set((state) => ({
      insights: {
        ...state.insights,
        [type]: state.insights[type].filter((i) => i.id !== id),
      },
    }));

    saveInsights();
    return true;
  },

  moveInsight: (
    fromType: "important" | "general" | "user_goals",
    toType: "important" | "general" | "user_goals",
    id: number,
  ) => {
    const { insights, saveInsights } = get();

    const index = insights[fromType].findIndex((i) => i.id === id);
    if (index === -1) return false;

    const movedInsight = insights[fromType][index];
    const updatedInsight = { ...movedInsight, type: toType };

    set((state) => ({
      insights: {
        ...state.insights,
        [fromType]: state.insights[fromType].filter((i) => i.id !== id),
        [toType]: [...state.insights[toType], updatedInsight],
      },
    }));

    saveInsights();
    return true;
  },

  reset: () => {
    set({
      workspaceId: null,
      insights: { ...defaultInsights },
      isLoaded: false,
    });
  },
}));

// Helper hook to initialize insights for a workspace
export const useInitializeInsights = (workspaceId: string | null) => {
  const loadInsights = useInsightsStore((s) => s.loadInsights);
  const isLoaded = useInsightsStore((s) => s.isLoaded);

  if (workspaceId && !isLoaded) {
    loadInsights(workspaceId);
  }
};
