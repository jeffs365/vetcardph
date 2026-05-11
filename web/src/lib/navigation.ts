type ReturnState = {
  from?: string;
} | null;

const nestedFlowPatterns = [
  /^\/pets\/new$/,
  /^\/pets\/link$/,
  /^\/pets\/[^/]+\/edit$/,
  /^\/appointments\/new$/,
  /^\/appointments\/[^/]+\/edit$/,
  /^\/pets\/[^/]+\/visits\/new$/,
  /^\/pets\/[^/]+\/visits\/[^/]+\/edit$/,
  /^\/pets\/[^/]+\/preventive\/new$/,
];

export function getCurrentPath(pathname: string, search = "") {
  return `${pathname}${search}`;
}

export function readReturnTo(state: unknown) {
  return typeof state === "object" && state && "from" in state && typeof (state as ReturnState).from === "string"
    ? (state as ReturnState).from ?? null
    : null;
}

export function getNavigationSource(location: { pathname: string; search: string; state: unknown }) {
  const currentPath = getCurrentPath(location.pathname, location.search);
  const returnTo = readReturnTo(location.state);

  if (returnTo && nestedFlowPatterns.some((pattern) => pattern.test(location.pathname))) {
    return returnTo;
  }

  return currentPath;
}
