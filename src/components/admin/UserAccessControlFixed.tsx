// =====================================================
// USER ACCESS CONTROL - FIXED IDENTIFICATION
// =====================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Ban, Unlock, UserCheck, AlertTriangle } from "lucide-react";
import { useUsersWithAccessStatus, useAccessAuditLog, useIsSuperDirector, useBlockUser, useUnblockUser } from "@/hooks/useUserAccessControl";
import { UserProfile } from "@/hooks/useUserAccessControl";

export function UserAccessControl() {
  const { data: users, isLoading: usersLoading, error: usersError } = useUsersWithAccessStatus();
  const { data: auditLog, isLoading: auditLoading, error: auditError } = useAccessAuditLog();
  const { data: isSuperDirector, isLoading: superDirectorLoading } = useIsSuperDirector();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Only show to Super Directors
  if (isSuperDirector === false) {
    return null;
  }

  if (superDirectorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading...</div>
      </div>
    );
  }

  const handleBlockUser = (userId: string, userName: string, userEmail: string) => {
    // Enhanced logging for debugging
    console.log("🔍 BLOCKING USER:", {
      userId,
      userName,
      userEmail,
      selectedUserName: selectedUser?.name,
      selectedUserEmail: selectedUser?.email
    });

    // Confirmation dialog
    const confirmMessage = `Are you sure you want to block this user?\n\nName: ${userName}\nEmail: ${userEmail}\n\nThis action will prevent this user from logging in.`;
    
    if (window.confirm(confirmMessage)) {
      blockUser.mutate({
        userId,
        reason: `Blocked by administrator - User: ${userName}, Email: ${userEmail}`
      });
    }
  };

  const handleUnblockUser = (userId: string, userName: string, userEmail: string) => {
    console.log("🔍 UNBLOCKING USER:", {
      userId,
      userName,
      userEmail,
      selectedUserName: selectedUser?.name,
      selectedUserEmail: selectedUser?.email
    });

    const confirmMessage = `Are you sure you want to unblock this user?\n\nName: ${userName}\nEmail: ${userEmail}`;
    
    if (window.confirm(confirmMessage)) {
      unblockUser.mutate({
        userId,
        reason: `Unblocked by administrator - User: ${userName}, Email: ${userEmail}`
      });
    }
  };

  const getStatusBadge = (user: UserProfile) => {
    if (user.is_blocked) {
      return <Badge variant="destructive" className="gap-1">
        <Ban className="h-3 w-3" />
        Blocked
      </Badge>;
    }
    return <Badge variant="secondary" className="gap-1">
      <UserCheck className="h-3 w-3" />
      Active
    </Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p><strong>Selected User:</strong> {selectedUser?.name || 'None'}</p>
            <p><strong>User ID:</strong> {selectedUser?.id || 'None'}</p>
            <p><strong>Email:</strong> {selectedUser?.email || 'None'}</p>
            <p className="text-muted-foreground">
              <em>Click on a user in the list below to select them before blocking/unblocking.</em>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users Status</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : usersError ? (
            <div className="text-center py-8 text-red-600">
              Error loading users: {usersError.message}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users?.map((user) => (
                <div 
                  key={user.id} 
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-gray-500">ID: {user.id}</p>
                      {user.user_roles?.is_super_director && (
                        <Badge variant="outline" className="ml-2">
                          Super Director
                        </Badge>
                      )}
                    </div>
                    {getStatusBadge(user)}
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Don't show block/unblock buttons for Super Directors */}
                    {!user.user_roles?.is_super_director && (
                      <>
                        {user.is_blocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockUser(user.id, user.name, user.email)}
                            disabled={unblockUser.isPending}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlockUser(user.id, user.name, user.email)}
                            disabled={blockUser.isPending}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Block
                          </Button>
                        )}
                      </>
                    )}
                    
                    {user.user_roles?.is_super_director && (
                      <Badge variant="secondary" className="ml-2">
                        Protected
                      </Badge>
                    )}
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
