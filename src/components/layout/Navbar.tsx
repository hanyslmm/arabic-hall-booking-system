import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavbarProps {
  userRole?: 'owner' | 'manager' | 'space_manager' | 'read_only' | 'teacher';
  userName?: string;
  isAdmin?: boolean;
}

export const Navbar = ({ userRole, userName }: NavbarProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setIsLoading(false);
    try {
      window.location.replace('/login');
    } catch (e) {
      window.location.href = '/login';
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="destructive" className="text-xs">مالك</Badge>;
      case 'manager':
        return <Badge variant="secondary" className="text-xs">مدير</Badge>;
      case 'space_manager':
        return <Badge variant="outline" className="text-xs">مدير قاعات</Badge>;
      case 'teacher':
        return <Badge variant="secondary" className="text-xs">معلم</Badge>;
      case 'read_only':
        return <Badge variant="outline" className="text-xs">قراءة فقط</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">مستخدم</Badge>;
    }
  };

  return (
    <nav className="border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-primary">Science Club</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
            disabled={isLoading}
            className="h-8 px-3"
          >
            <LogOut className="h-4 w-4 mr-1" />
            خروج
          </Button>
        </div>
      </div>
    </nav>
  );
};