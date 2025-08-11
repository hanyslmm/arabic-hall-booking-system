import { useMemo } from "react";
import { UserProfile, AuthPermissions } from "@/types";
import { USER_ROLES } from "@/lib/constants";

export const usePermissions = (profile: UserProfile | null): AuthPermissions => {
  return useMemo(() => {
    if (!profile) {
      return {
        isOwner: false,
        isAdmin: false,
        isManager: false,
        canManageBookings: false,
        canManageData: false,
        canManageUsers: false
      };
    }

    const userRole = profile.user_role;
    const appRole = (profile as any).role as string | undefined;

    const isOwner = userRole === USER_ROLES.OWNER || appRole === 'ADMIN';
    const isManager = userRole === USER_ROLES.MANAGER;
    const isAdmin = isOwner || isManager; // Admin is derived from owner or manager, or legacy ADMIN role

    return {
      isOwner,
      isAdmin,
      isManager: isManager || isOwner, // Manager includes owner
      canManageBookings: isAdmin,
      canManageData: isAdmin,
      canManageUsers: isAdmin
    };
  }, [profile]);
};