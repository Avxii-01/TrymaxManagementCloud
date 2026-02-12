import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Plus, Edit, Trash2, Pin } from "lucide-react";
import { useBroadcasts, useCreateBroadcast, useUpdateBroadcast, useDeleteBroadcast, BroadcastMessage } from "@/hooks/useBroadcasts";
import { useIsSuperDirector } from "@/hooks/useUserAccessControl";
import { format } from "date-fns";

export function BroadcastManager() {
  const { data: broadcasts, isLoading } = useBroadcasts();
  const createBroadcast = useCreateBroadcast();
  const updateBroadcast = useUpdateBroadcast();
  const deleteBroadcast = useDeleteBroadcast();
  const { data: isSuperDirector } = useIsSuperDirector();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<BroadcastMessage | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "critical",
    is_pinned: false,
    publish_at: "",
    expires_at: ""
  });

  // Only show to Super Directors
  if (isSuperDirector === false) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading broadcasts...</div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      type: "info",
      is_pinned: false,
      publish_at: "",
      expires_at: ""
    });
    setEditingBroadcast(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBroadcast) {
      updateBroadcast.mutate({
        id: editingBroadcast.id,
        updates: formData
      });
    } else {
      createBroadcast.mutate(formData);
    }
    
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (broadcast: BroadcastMessage) => {
    setFormData({
      title: broadcast.title,
      message: broadcast.message,
      type: broadcast.type,
      is_pinned: broadcast.is_pinned,
      publish_at: broadcast.publish_at,
      expires_at: broadcast.expires_at || ""
    });
    setEditingBroadcast(broadcast);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this broadcast?")) {
      deleteBroadcast.mutate(id);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-amber-100 text-amber-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            Broadcast Manager
          </CardTitle>
          <CardDescription>
            Create and manage announcements for all users.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Create Button */}
      <Card>
        <CardHeader>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingBroadcast ? "Edit Broadcast" : "Create New Broadcast"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBroadcast 
                      ? "Update your announcement details."
                      : "Create a new announcement for all users."
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter broadcast title"
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter your message (max 500 characters)"
                      required
                      maxLength={500}
                      rows={4}
                    />
                    <div className="text-xs text-muted-foreground">
                      {formData.message.length}/500 characters
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: "info" | "warning" | "critical") => 
                        setFormData(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info (Blue)</SelectItem>
                        <SelectItem value="warning">Warning (Amber)</SelectItem>
                        <SelectItem value="critical">Critical (Red)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_pinned"
                      checked={formData.is_pinned}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
                    />
                    <Label htmlFor="is_pinned" className="flex items-center gap-2">
                      <Pin className="h-4 w-4" />
                      Pin to top
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish_at">Publish Time (Optional)</Label>
                    <Input
                      id="publish_at"
                      type="datetime-local"
                      value={formData.publish_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, publish_at: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expires At (Optional)</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createBroadcast.isPending || updateBroadcast.isPending}
                  >
                    {editingBroadcast ? "Update" : "Create"} Broadcast
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* Broadcasts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          {!broadcasts || broadcasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active broadcasts found.
            </div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{broadcast.title}</h3>
                      {broadcast.is_pinned && <Pin className="h-4 w-4" />}
                      <Badge className={getTypeColor(broadcast.type)}>
                        {broadcast.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {broadcast.message}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Created: {format(new Date(broadcast.created_at), "MMM d, yyyy 'at' h:mm a")}
                      {broadcast.expires_at && (
                        <span className="ml-4">
                          Expires: {format(new Date(broadcast.expires_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(broadcast)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(broadcast.id)}
                      disabled={deleteBroadcast.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
