import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))]">
      <AppHeader />
      {children}
    </div>
  );
}
