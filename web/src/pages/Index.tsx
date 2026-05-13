import { Link, Navigate } from "react-router-dom";
import { LockKeyhole, PawPrint, ShieldCheck, Stethoscope } from "lucide-react";
import landingClinicHero from "@/assets/landing-clinic-hero.png";
import { BrandMark } from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { useOwnerSession } from "@/lib/owner-auth";

const ownerBenefits = ["Keep pet profiles on your phone", "Track vaccines and care history", "Share emergency QR details fast"];
const clinicBenefits = ["Open shared records before visits", "Manage appointments and follow-up", "Link owners to local pet profiles"];

export default function Index() {
  const clinicSession = useSession();
  const ownerSession = useOwnerSession();

  if (clinicSession.user && !clinicSession.isLoading) {
    return <Navigate to="/home" replace />;
  }

  if (ownerSession.user && !ownerSession.isLoading) {
    return <Navigate to="/owner/pets" replace />;
  }

  return (
    <div className="app-shell">
      <div className="app-canvas max-w-[390px] overflow-y-auto bg-[#f8fcfd]">
        <main className="flex min-h-dvh flex-col">
          <header className="flex h-[78px] items-center justify-center bg-[#f8fcfd] px-5">
            <Link to="/" className="flex items-center gap-2" aria-label="VetCard home">
              <BrandMark className="size-9 shadow-none" />
              <div className="font-display text-[2rem] font-extrabold leading-none tracking-normal">
                <span className="text-[#075863]">Vet</span>
                <span className="text-[#d08a3a]">Card</span>
              </div>
            </Link>
          </header>

          <section className="relative h-[220px] overflow-hidden bg-primary-soft">
            <img
              src={landingClinicHero}
              alt="Veterinarian and pet owner smiling with a dog in a clinic"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f8fcfd] via-[#f8fcfd]/80 to-transparent" />
          </section>

          <section className="-mt-4 flex-1 px-5 pb-3">
            <div className="relative z-10">
              <h1 className="font-display text-[1.78rem] font-extrabold leading-[1.05] tracking-normal text-[#075863]">
                Find any pet record in seconds, not minutes.
              </h1>
              <p className="mt-1 max-w-[18.5rem] text-[1.05rem] leading-6 text-[#2d3b3f]">
                Replace paper index cards with a fast, searchable system your team can use immediately.
              </p>
            </div>

            <div className="mt-4 grid gap-4">
              <AccessCard
                tone="clinic"
                icon={Stethoscope}
                title="I am Clinic Staff"
                benefits={clinicBenefits}
                buttonLabel="Clinic Staff Login"
                href="/clinic/login"
                secondaryHref="/clinic/register"
                secondaryLabel="Register a new clinic"
              />
              <AccessCard
                tone="owner"
                icon={PawPrint}
                title="I am a Pet Owner"
                benefits={ownerBenefits}
                buttonLabel="Sign In with Phone"
                href="/owner/login"
              />
            </div>

          </section>

          <footer className="mx-5 border-t border-[#dfe7e8] px-0 py-3">
            <div className="grid grid-cols-3 items-center gap-2 text-[10px] text-[#333f43]">
              <span className="whitespace-nowrap text-left">© 2024 VetCard Inc.</span>
              <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                <LockKeyhole className="size-3.5" />
                Secure & Private
              </span>
              <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-right">
                <ShieldCheck className="size-3.5" />
                Clinic-Linked
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function AccessCard({
  tone,
  icon: Icon,
  title,
  benefits,
  buttonLabel,
  href,
  secondaryHref,
  secondaryLabel,
}: {
  tone: "owner" | "clinic";
  icon: typeof PawPrint;
  title: string;
  benefits: string[];
  buttonLabel: string;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const isOwner = tone === "owner";

  return (
    <article
      className={
        isOwner
          ? "relative overflow-hidden rounded-[14px] border border-[#dfe5e4] bg-white px-5 py-4 pl-6 shadow-[0_8px_24px_rgb(15_23_42_/_0.10)]"
          : "relative overflow-hidden rounded-[14px] border border-[#075f69] bg-[#e6f8f7] px-5 py-4 pl-6 shadow-[0_8px_18px_rgb(7_95_105_/_0.12)]"
      }
    >
      <div
        className={
          isOwner
            ? "absolute inset-y-0 left-0 w-2 bg-[#f47a18]"
            : "absolute inset-y-0 left-0 w-2 bg-[#075f69]"
        }
      />

      <div className="flex items-start gap-3">
        <span
          className={
            isOwner
              ? "flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0e4] text-[#f47a18]"
              : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#caefed] text-[#075f69]"
          }
        >
          <Icon className={isOwner ? "size-6 fill-current stroke-current" : "size-6"} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={
              isOwner
                ? "mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#fff0e4] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[#a44a07]"
                : "mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#d8f2f1] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[#075f69]"
            }
          >
            {isOwner ? "For pet parents" : "For clinics"}
          </div>
          <h2 className="font-display text-[1.18rem] font-bold leading-6 tracking-normal text-[#11181b]">{title}</h2>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[0.82rem] leading-5 text-[#11181b]">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
      </div>

      <Button
        asChild
        size="lg"
        variant={isOwner ? "default" : "outline"}
        className={
          isOwner
            ? "mt-4 h-10 w-full rounded-full bg-[#f47a18] text-[0.95rem] font-semibold text-white shadow-[0_6px_14px_rgb(244_122_24_/_0.28)] hover:bg-[#e86e10]"
            : "mt-4 h-10 w-full rounded-full border-[#075f69] bg-[#075f69] text-[0.95rem] font-semibold text-white shadow-[0_6px_14px_rgb(7_95_105_/_0.24)] hover:bg-[#064f58]"
        }
      >
        <Link to={href}>{buttonLabel}</Link>
      </Button>

      {secondaryHref && secondaryLabel ? (
        <Button
          asChild
          size="lg"
          variant="outline"
          className="mt-2 h-10 w-full rounded-full border-[#075f69] bg-transparent text-[0.9rem] font-semibold text-[#075f69] hover:bg-[#e6f8f7] hover:text-[#075f69]"
        >
          <Link to={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      ) : null}
    </article>
  );
}
