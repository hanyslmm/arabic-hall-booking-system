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

    const isOwner = profile.user_role === USER_ROLES.OWNER;
    const isManager = profile.user_role === USER_ROLES.MANAGER;
    const isAdmin = isOwner || isManager; // Admin is now derived from user_role (owner or manager)

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