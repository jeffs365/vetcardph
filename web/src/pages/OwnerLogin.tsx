import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Phone, UserRound, X } from "lucide-react";
import { BrandLockup } from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import ownerHeroIllustration from "@/assets/owner-login-hero-v2.png";
import { getErrorMessage, formatPhoneForDisplay, normalizePhilippineMobileInput } from "@/lib/format";
import { useOwnerSession } from "@/lib/owner-auth";

const inputClassName =
  "h-12 w-full rounded-2xl border border-tertiary/40 bg-background px-4 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-tertiary focus:ring-2 focus:ring-tertiary/20";

export default function OwnerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, requestCode, registerOwner, verifyCode } = useOwnerSession();
  const [flow, setFlow] = useState<"signin" | "register">("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from ?? "/owner/home";

  if (user && !isLoading) {
    return <Navigate to={destination} replace />;
  }

  async function handleRequestCode() {
    setSubmitError(null);
    setBusy(true);

    try {
      const result = await requestCode(phone);
      setDevCode(result.devCode);
      setStep("verify");
      setCode("");
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterOwner() {
    setSubmitError(null);
    setBusy(true);

    try {
      const result = await registerOwner({ fullName, phone });
      setDevCode(result.devCode);
      setStep("verify");
      setCode("");
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode() {
    setSubmitError(null);
    setBusy(true);

    try {
      await verifyCode({ phone, code });
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="app-canvas">
        <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-7">
          <div className="flex justify-center">
            <BrandLockup compact />
          </div>

          <div className="mt-10 flex justify-center">
            <img
              src={ownerHeroIllustration}
              alt="Pets with a secure health record"
              className="h-48 w-60 object-contain mix-blend-multiply sm:h-56 sm:w-72"
            />
          </div>

          <section className="mt-3 rounded-[1.75rem] bg-card px-5 py-6 shadow-[0_18px_46px_-30px_hsl(var(--primary)_/_0.45)]">
            <h1 className="mx-auto max-w-[300px] text-center font-display text-[1.55rem] font-extrabold leading-tight text-primary">
              {step === "verify"
                ? "Enter Your One-Time Code"
                : flow === "register"
                  ? "Create Your Pet Owner Account"
                  : "Access Your Pet’s Secure Health Record"}
            </h1>
            <p className="mx-auto mt-3 max-w-[310px] text-center text-[15px] leading-6 text-foreground/80">
              {step === "verify"
                ? `We sent a 6-digit code for ${formatPhoneForDisplay(normalizePhilippineMobileInput(phone))}.`
                : flow === "register"
                  ? "Start with your phone number, then add your pet or link records from your clinic."
                  : "Use your registered phone number for secure, passwordless login with a one-time code."}
            </p>

            <div className="mt-6 space-y-4">
              {step === "phone" ? (
                <>
                  {flow === "register" ? (
                    <label className="block">
                      <span className="label-eyebrow text-primary">Full name</span>
                      <div className="relative mt-2">
                        <UserRound className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          autoComplete="name"
                          autoCapitalize="words"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className={`pl-12 pr-4 ${inputClassName}`}
                          placeholder="Your name"
                        />
                      </div>
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="label-eyebrow text-primary">
                      {flow === "register" ? "Phone number" : "Registered phone"}
                    </span>
                    <div className="relative mt-2">
                      {phone ? (
                        <button
                          type="button"
                          aria-label="Clear phone number"
                          onClick={() => setPhone("")}
                          className="absolute left-4 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      ) : (
                        <Phone className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                      )}
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className={`pl-12 pr-4 ${inputClassName}`}
                        placeholder="0917 123 4567"
                      />
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="label-eyebrow text-primary">One-time code</span>
                    <div className="relative mt-2">
                      <KeyRound className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        className={`pl-12 pr-4 text-center font-semibold tracking-[0.28em] ${inputClassName}`}
                        placeholder="123456"
                      />
                    </div>
                  </label>

                  {devCode ? (
                    <div className="rounded-2xl border border-tertiary/15 bg-tertiary-soft px-4 py-3 text-center text-sm text-primary">
                      Local dev code <span className="font-bold tracking-[0.25em] text-tertiary">{devCode}</span>
                    </div>
                  ) : null}
                </>
              )}

              {submitError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}

              {step === "phone" ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full rounded-2xl bg-tertiary text-base font-bold text-tertiary-foreground shadow-[0_14px_26px_-16px_hsl(var(--tertiary)_/_0.8)] hover:bg-tertiary/90"
                  onClick={flow === "register" ? handleRegisterOwner : handleRequestCode}
                  disabled={busy}
                >
                  <Phone className="size-5" /> {busy ? "Sending..." : flow === "register" ? "Create & Send Code" : "Get One-Time Code"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full rounded-2xl bg-tertiary text-base font-bold text-tertiary-foreground shadow-[0_14px_26px_-16px_hsl(var(--tertiary)_/_0.8)] hover:bg-tertiary/90"
                    onClick={handleVerifyCode}
                    disabled={busy}
                  >
                    <KeyRound className="size-5" /> {busy ? "Checking..." : "Open My VetCard"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-2xl border-primary text-primary hover:bg-primary/5 hover:text-primary"
                    onClick={() => setStep("phone")}
                    disabled={busy}
                  >
                    {flow === "register" ? "Edit account details" : "Use a different phone number"}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">
            {flow === "register" ? "Already have a VetCard record? " : "Need to register? "}
            <button
              type="button"
              className="font-bold text-tertiary underline-offset-4 hover:underline"
              onClick={() => {
                setFlow(flow === "register" ? "signin" : "register");
                setStep("phone");
                setSubmitError(null);
                setCode("");
                setDevCode(null);
              }}
            >
              {flow === "register" ? "Sign in instead" : "Create owner account"}
            </button>
          </p>

          <div className="mt-auto pt-9 text-center text-sm text-foreground">
            Looking for the clinic workspace?{" "}
            <Link to="/clinic/login" className="font-bold text-primary">
              Clinic Staff Sign In
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
