import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TaskCategory } from "@/lib/constants";

interface UpdateAssignmentInput {
  id: string;
  title?: string;
  description?: string;
  due_date?: string;
  assignee_id?: string;
  project_id?: string;
  priority?: "normal" | "high" | "emergency";
  category?: TaskCategory;
  remark?: string;
  status?: string;
}

export function useUpdateAssignmentFull() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAssignmentInput) => {
      const updateData: Record<string, unknown> = {};

      // Only include fields that are provided
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.due_date !== undefined) updateData.due_date = input.due_date;
      if (input.assignee_id !== undefined) updateData.assignee_id = input.assignee_id;
      if (input.project_id !== undefined) updateData.project_id = input.project_id;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.remark !== undefined) updateData.remark = input.remark;
      if (input.status !== undefined) {
        updateData.status = input.status;
        // Set completion date when marked as completed
        if (input.status === "completed") {
          updateData.completion_date = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("assignments")
        .update(updateData)
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all assignment-related queries
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignments-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-assignments-with-profiles"] });
      
      toast({ title: "Assignment updated successfully" });
    },
    onError: (error) => {
      console.error("Failed to update assignment:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to update assignment. Please try again." 
      });
    },
  });
}
