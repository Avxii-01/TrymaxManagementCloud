import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Ban, Unlock, UserCheck } from "lucide-react";
import { useUsersWithAccessStatus, useAccessAuditLog, useIsSuperDirector, useBlockUser, useUnblockUser } from "@/hooks/useUserAccessControl";
import { UserProfile } from "@/hooks/useUserAccessControl";

export function UserAccessControl() {
  const { data: users, isLoading: usersLoading, error: usersError } = useUsersWithAccessStatus();
  const { data: auditLog, isLoading: auditLoading, error: auditError } = useAccessAuditLog();
  const { data: isSuperDirector, isLoading: superDirectorLoading } = useIsSuperDirector();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  
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

  const handleBlockUser = (userId: string) => {
    console.log("🔍 Block button clicked for user:", userId);
    blockUser.mutate({
      userId,
      reason: "Blocked by administrator"
    });
  };

  const handleUnblockUser = (userId: string) => {
    console.log("🔍 Unblock button clicked for user:", userId);
    unblockUser.mutate({
      userId,
      reason: "Unblocked by administrator"
    });
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
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            User Access Control
          </CardTitle>
          <CardDescription>
            This feature is only available to Super Directors.
          </CardDescription>
        </CardHeader>
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
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
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
                            onClick={() => handleUnblockUser(user.id)}
                            disabled={unblockUser.isPending}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlockUser(user.id)}
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

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <div className="text-center py-8">Loading audit log...</div>
          ) : auditError ? (
            <div className="text-center py-8 text-red-600">
              Error loading audit log: {auditError.message}
            </div>
          ) : !auditLog || auditLog.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit log entries found
            </div>
          ) : (
            <div className="space-y-4">
              {auditLog?.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{entry.action_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.user_id} - {entry.created_at}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {entry.action_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
