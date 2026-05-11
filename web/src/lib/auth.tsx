import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, type SessionUser } from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  user: SessionUser | null;
  isLoading: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  registerClinic: (input: {
    clinicName: string;
    clinicPhone: string;
    clinicAddress: string;
    ownerName: string;
    ownerPhone: string;
    email: string;
    password: string;
  }) => Promise<void>;
  updateSessionUser: (nextUser: SessionUser) => void;
  signOut: () => void;
};

type AuthResponse = {
  token?: string;
  user: SessionUser;
};

const tokenStorageKey = "vetcard.auth.token";
const cookieSessionToken = "cookie-session";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((nextUser: SessionUser) => {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(cookieSessionToken);
    setUser(nextUser);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(() => {
    void apiRequest("/auth/logout", { method: "POST", retryOnUnauthorized: false });
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const updateSessionUser = useCallback((nextUser: SessionUser) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.localStorage.removeItem(tokenStorageKey);

    apiRequest<{ user: SessionUser }>("/auth/me")
      .then((result) => {
        if (!cancelled) {
          setToken(cookieSessionToken);
          setUser(result.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          signOut();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [signOut]);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: input,
      });

      persistSession(response.user);
    },
    [persistSession],
  );

  const registerClinic = useCallback(
    async (input: {
      clinicName: string;
      clinicPhone: string;
      clinicAddress: string;
      ownerName: string;
      ownerPhone: string;
      email: string;
      password: string;
    }) => {
      const response = await apiRequest<AuthResponse>("/auth/register-clinic", {
        method: "POST",
        body: input,
      });

      persistSession(response.user);
    },
    [persistSession],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      signIn,
      registerClinic,
      updateSessionUser,
      signOut,
    }),
    [isLoading, registerClinic, signIn, signOut, token, updateSessionUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useSession must be used within AuthProvider.");
  }

  return context;
}
