import { create } from "zustand";
import { persist } from "zustand/middleware";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface ModifiedBadgeState {
  /** Map of activityId → ISO timestamp when the update event was received */
  modifiedActivities: Record<number, string>;
  /** Record an activity as recently modified */
  markModified: (activityId: number) => void;
  /** Dismiss badge for a specific activity (user viewed it) */
  dismiss: (activityId: number) => void;
  /** Remove all expired entries (older than 24h) */
  cleanupExpired: () => void;
  /** Check if an activity has an active (non-expired) badge */
  isModified: (activityId: number) => boolean;
}

export const useModifiedBadgeStore = create<ModifiedBadgeState>()(
  persist(
    (set, get) => ({
      modifiedActivities: {},

      markModified: (activityId: number) =>
        set((state) => ({
          modifiedActivities: {
            ...state.modifiedActivities,
            [activityId]: new Date().toISOString(),
          },
        })),

      dismiss: (activityId: number) =>
        set((state) => {
          const { [activityId]: _, ...rest } = state.modifiedActivities;
          return { modifiedActivities: rest };
        }),

      cleanupExpired: () =>
        set((state) => {
          const now = Date.now();
          const cleaned: Record<number, string> = {};
          for (const [id, timestamp] of Object.entries(
            state.modifiedActivities,
          )) {
            if (now - new Date(timestamp).getTime() < TWENTY_FOUR_HOURS_MS) {
              cleaned[Number(id)] = timestamp;
            }
          }
          return { modifiedActivities: cleaned };
        }),

      isModified: (activityId: number) => {
        const timestamp = get().modifiedActivities[activityId];
        if (!timestamp) return false;
        return (
          Date.now() - new Date(timestamp).getTime() < TWENTY_FOUR_HOURS_MS
        );
      },
    }),
    {
      name: "sdac-modified-badges",
      partialize: (state) => ({
        modifiedActivities: state.modifiedActivities,
      }),
    },
  ),
);
