import { UnifiedLayout } from "@/components/layout/UnifiedLayout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <UnifiedLayout>
      {children}
    </UnifiedLayout>
  );
}