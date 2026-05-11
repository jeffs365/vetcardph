import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth";
import { getCurrentPath } from "@/lib/navigation";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="app-canvas justify-center">
          <div className="px-6 py-12 text-center text-muted-foreground">
            Restoring your clinic session...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/clinic/login" replace state={{ from: getCurrentPath(location.pathname, location.search) }} />;
  }

  return <>{children}</>;
}
