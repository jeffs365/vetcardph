import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, type OwnerSessionUser } from "@/lib/api";

type RequestCodeResponse = {
  success: boolean;
  expiresInSeconds: number;
  devCode?: string;
};

type VerifyCodeResponse = {
  token?: string;
  user: OwnerSessionUser;
};

type OwnerAuthContextValue = {
  token: string | null;
  user: OwnerSessionUser | null;
  isLoading: boolean;
  requestCode: (phone: string) => Promise<RequestCodeResponse>;
  registerOwner: (input: { fullName: string; phone: string }) => Promise<RequestCodeResponse>;
  verifyCode: (input: { phone: string; code: string }) => Promise<void>;
  signOut: () => void;
  updateUser: (user: OwnerSessionUser) => void;
};

const tokenStorageKey = "vetcard.owner.auth.token";
const cookieSessionToken = "cookie-session";
const OwnerAuthContext = createContext<OwnerAuthContextValue | undefined>(undefined);

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<OwnerSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((nextUser: OwnerSessionUser) => {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(cookieSessionToken);
    setUser(nextUser);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(() => {
    void apiRequest("/owner-auth/logout", { method: "POST", retryOnUnauthorized: false });
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const updateUser = useCallback((nextUser: OwnerSessionUser) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.localStorage.removeItem(tokenStorageKey);

    apiRequest<{ user: OwnerSessionUser }>("/owner-auth/me")
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

  const requestCode = useCallback(async (phone: string) => {
    return apiRequest<RequestCodeResponse>("/owner-auth/request-code", {
      method: "POST",
      body: { phone },
    });
  }, []);

  const registerOwner = useCallback(async (input: { fullName: string; phone: string }) => {
    return apiRequest<RequestCodeResponse>("/owner-auth/register", {
      method: "POST",
      body: input,
    });
  }, []);

  const verifyCode = useCallback(
    async (input: { phone: string; code: string }) => {
      const response = await apiRequest<VerifyCodeResponse>("/owner-auth/verify-code", {
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
      requestCode,
      registerOwner,
      verifyCode,
      signOut,
      updateUser,
    }),
    [isLoading, registerOwner, requestCode, signOut, token, updateUser, user, verifyCode],
  );

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerSession() {
  const context = useContext(OwnerAuthContext);

  if (!context) {
    throw new Error("useOwnerSession must be used within OwnerAuthProvider.");
  }

  return context;
}
