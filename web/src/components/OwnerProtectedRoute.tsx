import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOwnerSession } from "@/lib/owner-auth";
import { getCurrentPath } from "@/lib/navigation";

export function OwnerProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useOwnerSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="app-canvas justify-center">
          <div className="px-6 py-12 text-center text-muted-foreground">
            Restoring your VetCard owner session...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/owner/login" replace state={{ from: getCurrentPath(location.pathname, location.search) }} />;
  }

  return <>{children}</>;
}
