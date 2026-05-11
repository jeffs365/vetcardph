import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="app-shell">
      <div className="app-canvas justify-center px-6">
        <div className="index-card text-center">
          <p className="label-eyebrow">404</p>
          <h1 className="font-display text-3xl font-bold mt-2">Page not found</h1>
          <p className="text-muted-foreground mt-3">
            That screen does not exist in this workspace.
          </p>
          <Link
            to="/"
            className="inline-flex mt-6 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Return to VetCard
          </Link>
        </div>
      </div>
    </div>
  );
}
