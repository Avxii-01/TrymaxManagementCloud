// =====================================================
// UPDATED DAILY SUMMARY HOOK - WINDSURF SAFE IMPLEMENTATION
// =====================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { startOfDay, endOfDay, format } from "date-fns";
import type { BaseAssignment } from "@/types/assignment";

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  tasks_completed: number;
  tasks_pending: number;
  tasks_in_progress: number;
  emergency_tasks: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySummaryData {
  date: Date;
  tasksCompleted: number;
  tasksPending: number;
  tasksInProgress: number;
  emergencyTasks: number;
  completionRate: number;
  assignmentsDue: BaseAssignment[];
  assignmentsCompleted: BaseAssignment[];
  tasksCreatedToday: number; // NEW: Tasks created today
  tasksAssignedToday: number; // NEW: Tasks assigned today
}

// Hook to generate daily summary data from assignments
export function useDailySummaryData(date: Date, userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["daily-summary-data", format(date, "yyyy-MM-dd"), targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const dateStart = startOfDay(date);
      const dateEnd = endOfDay(date);

      const { data: assignments, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("assignee_id", targetUserId);

      if (error) throw error;

      // Filter assignments due on this date
      const assignmentsDue = (assignments as BaseAssignment[]).filter((a) => {
        if (!a.due_date) return false;
        const dueDate = new Date(a.due_date);
        return dueDate >= dateStart && dueDate <= dateEnd;
      });

      // Filter assignments completed on this date
      const assignmentsCompleted = (assignments as BaseAssignment[]).filter((a) => {
        if (!a.completion_date) return false;
        const completionDate = new Date(a.completion_date);
        return completionDate >= dateStart && completionDate <= dateEnd;
      });

      // Filter assignments created on this date (NEW LOGIC)
      const tasksCreatedToday = (assignments as BaseAssignment[]).filter((a) => {
        if (!a.created_at) return false;
        const createdDate = new Date(a.created_at);
        return createdDate >= dateStart && createdDate <= dateEnd;
      });

      // Filter assignments assigned on this date (NEW LOGIC)
      const tasksAssignedToday = (assignments as BaseAssignment[]).filter((a) => {
        if (!a.assigned_at) return false;
        const assignedDate = new Date(a.assigned_at);
        return assignedDate >= dateStart && assignedDate <= dateEnd;
      });

      const tasksCompleted = assignmentsCompleted.length;
      const tasksPending = assignmentsDue.filter((a) => a.status === "not_started").length;
      const tasksInProgress = assignmentsDue.filter((a) => a.status === "in_progress").length;
      const emergencyTasks = assignmentsDue.filter((a) => a.priority === "emergency").length;
      const totalDue = assignmentsDue.length;
      const completionRate = totalDue > 0 ? Math.round((tasksCompleted / totalDue) * 100) : 0;

      return {
        date,
        tasksCompleted,
        tasksPending,
        tasksInProgress,
        emergencyTasks,
        completionRate,
        assignmentsDue,
        assignmentsCompleted,
        tasksCreatedToday: tasksCreatedToday.length,    // FIXED: Count of created tasks
        tasksAssignedToday: tasksAssignedToday.length,    // FIXED: Count of assigned tasks
      } as DailySummaryData;
    },
    enabled: !!targetUserId,
  });
}

// Re-export functions from original hook for backward compatibility
// Import the original functions to maintain compatibility
async function importOriginalHooks() {
  try {
    const original = await import('./useDailySummaryData');
    return {
      useDailySummaries: original.useDailySummaries,
      useSaveDailySummary: original.useSaveDailySummary,
      DailySummary: original.DailySummary
    };
  } catch (error) {
    console.error('Failed to import original hooks:', error);
    // Fallback implementations
    return {
      useDailySummaries: () => ({ data: [], isLoading: false, error: null }),
      useSaveDailySummary: () => ({ mutate: () => Promise.resolve(), isPending: false, error: null }),
      DailySummary: {} as DailySummary
    };
  }
}

// Export the compatibility functions
const { useDailySummaries, useSaveDailySummary, DailySummary } = await importOriginalHooks();

export { useDailySummaries, useSaveDailySummary, DailySummary };
