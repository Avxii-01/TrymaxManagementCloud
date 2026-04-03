import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  FolderKanban,
  MessageSquare,
  Tag,
  Trash2,
  Edit2,
  Save,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { CategoryBadge } from "@/components/ui/category-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUpdateAssignment } from "@/hooks/useAssignments";
import { useUpdateAssignmentFull } from "@/hooks/useUpdateAssignmentFull";
import { useDirectDeleteAssignment } from "@/hooks/useDirectDeleteAssignment";
import { useActiveProjects } from "@/hooks/useProjects";
import { useProfiles } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { type AssignmentWithRelations } from "@/types/assignment-relations";
import type { Assignment } from "@/types/assignment";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES, type TaskCategory } from "@/lib/constants";
import type { AssignmentPriority, AssignmentStatus } from "@/types";

// Form validation schema
const editAssignmentSchema = {
  title: { required: true, message: "Title is required" },
  description: { required: false, maxLength: 2000, message: "Description too long" },
  due_date: { required: true, message: "Due date is required" },
  assignee_id: { required: true, message: "Assignee is required" },
  priority: { required: true, message: "Priority is required" },
  category: { required: true, message: "Category is required" },
};

interface AssignmentDetailModalProps {
  assignment: AssignmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentDetailModal({
  assignment,
  open,
  onOpenChange,
}: AssignmentDetailModalProps) {
  const { isDirector } = useUserRole();
  const { user } = useAuth();
  const updateAssignment = useUpdateAssignment();
  const updateAssignmentFull = useUpdateAssignmentFull();
  const deleteAssignment = useDirectDeleteAssignment();
  const { data: projects } = useActiveProjects();
  const { data: profiles } = useProfiles();
  
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [newRemark, setNewRemark] = useState(assignment?.remark || "");
  const [localAssignment, setLocalAssignment] = useState<AssignmentWithRelations | null>(assignment);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: assignment?.title || "",
    description: assignment?.description || "",
    due_date: assignment?.due_date || "",
    assignee_id: assignment?.assignee_id || "unassigned",
    project_id: assignment?.project_id || "no-project",
    priority: assignment?.priority || "normal" as AssignmentPriority,
    category: assignment?.category || TASK_CATEGORIES[0].value,
    remark: assignment?.remark || "",
  });
  
  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync states when assignment changes
  useEffect(() => {
    setLocalAssignment(assignment);
    setNewRemark(assignment?.remark || "");
    if (assignment) {
      setEditForm({
        title: assignment.title,
        description: assignment.description || "",
        due_date: assignment.due_date || "",
        assignee_id: assignment.assignee_id || "unassigned",
        project_id: assignment.project_id || "no-project",
        priority: assignment.priority,
        category: assignment.category,
        remark: assignment.remark || "",
      });
    }
    setErrors({});
    setHasUnsavedChanges(false);
    setIsEditing(false);
  }, [assignment]);

  // Check if user can edit/delete this assignment
  const canEdit = isDirector || 
    (user && (assignment?.creator_id === user.id || assignment?.assignee_id === user.id));
  const canDelete = isDirector || 
    (user && (assignment?.creator_id === user.id || assignment?.assignee_id === user.id));

  if (!localAssignment) return null;

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!editForm.title.trim()) {
      newErrors.title = editAssignmentSchema.title.message;
    }
    if (!editForm.due_date) {
      newErrors.due_date = editAssignmentSchema.due_date.message;
    }
    if (!editForm.assignee_id || editForm.assignee_id === "unassigned") {
      newErrors.assignee_id = editAssignmentSchema.assignee_id.message;
    }
    if (editForm.description && editForm.description.length > 2000) {
      newErrors.description = editAssignmentSchema.description.message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Enter edit mode
  const handleEdit = () => {
    setIsEditing(true);
    setHasUnsavedChanges(false);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        setIsEditing(false);
        setHasUnsavedChanges(false);
        // Reset form to original values
        if (assignment) {
          setEditForm({
            title: assignment.title,
            description: assignment.description || "",
            due_date: assignment.due_date || "",
            assignee_id: assignment.assignee_id || "unassigned",
            project_id: assignment.project_id || "no-project",
            priority: assignment.priority,
            category: assignment.category,
            remark: assignment.remark || "",
          });
        }
        setErrors({});
      }
    } else {
      setIsEditing(false);
    }
  };

  // Save edited assignment
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateAssignmentFull.mutateAsync({
        id: localAssignment.id,
        title: editForm.title,
        description: editForm.description,
        due_date: editForm.due_date,
        assignee_id: editForm.assignee_id === "unassigned" ? null : editForm.assignee_id,
        project_id: editForm.project_id === "no-project" ? null : editForm.project_id,
        priority: editForm.priority,
        category: editForm.category as TaskCategory,
        remark: editForm.remark,
      });
      
      // Update local state optimistically
      setLocalAssignment(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setErrors({});
      
      // Show success message
      if (typeof window !== 'undefined') {
        // You can add toast here if you have a toast system
        console.log("Assignment updated successfully");
      }
    } catch (error) {
      console.error("Failed to update assignment:", error);
      // Show error message
      setErrors({ submit: "Failed to update assignment. Please try again." });
    }
  };

  // Handle status change (existing functionality)
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateAssignment.mutateAsync({
        id: localAssignment.id,
        status: newStatus as Assignment["status"],
        remark: newRemark || undefined,
      });
      setNewRemark("");
      setLocalAssignment(prev => prev ? { 
        ...prev, 
        status: newStatus as Assignment["status"],
        completion_date: newStatus === "completed" ? new Date().toISOString() : prev.completion_date
      } : null);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      deleteAssignment.mutate(localAssignment.id);
      onOpenChange(false);
    }
  };

  // Warn before closing with unsaved changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && hasUnsavedChanges && isEditing) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(isOpen);
    }
  };

  const isLoading = updateAssignment.isPending || deleteAssignment.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Assignment Details</span>
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={isLoading}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit assignment details and save changes." : "View assignment details and update status."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            // EDIT MODE
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  className={cn(errors.title && "border-red-500")}
                  placeholder="Assignment title"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  className={cn(errors.description && "border-red-500")}
                  placeholder="Assignment description"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              {/* Assignee and Project */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignee">Assignee *</Label>
                  <Select 
                    value={editForm.assignee_id} 
                    onValueChange={(value) => handleFormChange("assignee_id", value)}
                  >
                    <SelectTrigger className={cn(errors.assignee_id && "border-red-500")}>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {profiles?.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assignee_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.assignee_id}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select 
                    value={editForm.project_id} 
                    onValueChange={(value) => handleFormChange("project_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-project">No project</SelectItem>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={editForm.due_date ? new Date(editForm.due_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => handleFormChange("due_date", e.target.value)}
                  className={cn(errors.due_date && "border-red-500")}
                />
                {errors.due_date && (
                  <p className="text-sm text-red-600 mt-1">{errors.due_date}</p>
                )}
              </div>

              {/* Priority and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={editForm.priority} 
                    onValueChange={(value) => handleFormChange("priority", value as AssignmentPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={editForm.category} 
                    onValueChange={(value) => handleFormChange("category", value as TaskCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <div className="flex items-center gap-2">
                            <CategoryBadge category={category.value} />
                            {category.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <Label htmlFor="remark">Remarks</Label>
                <Textarea
                  id="remark"
                  value={editForm.remark}
                  onChange={(e) => handleFormChange("remark", e.target.value)}
                  placeholder="Additional remarks or notes"
                  rows={2}
                />
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
                  {errors.submit}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-3">
                <div className="flex gap-3">
                  {canDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <LoadingSpinner className="h-4 w-4 mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // VIEW MODE (existing functionality)
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="mt-1 text-sm">{localAssignment.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={localAssignment.status as any} />
                  </div>
                </div>
              </div>

              {localAssignment.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{localAssignment.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Assignee</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-muted">
                        {localAssignment.assignee?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "NA"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{localAssignment.assignee?.name || "Unassigned"}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="mt-1">
                    <PriorityBadge priority={localAssignment.priority as any} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="mt-1 text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {localAssignment.due_date ? format(new Date(localAssignment.due_date), "MMM dd, yyyy HH:mm") : "No due date"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <div className="mt-1">
                    <CategoryBadge category={localAssignment.category} />
                  </div>
                </div>
              </div>

              {localAssignment.project && (
                <div>
                  <Label className="text-sm font-medium">Project</Label>
                  <p className="mt-1 text-sm flex items-center gap-1">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {localAssignment.project.name}
                  </p>
                </div>
              )}

              {/* Status Update (existing functionality) */}
              <div>
                <Label className="text-sm font-medium">Update Status</Label>
                <Select onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remarks */}
              <div>
                <Label className="text-sm font-medium">Remarks</Label>
                <Textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="Add remarks..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Close
                </Button>
                
                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
