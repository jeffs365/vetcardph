# Web App Review (Mobile-First) — VetCard (Iteration 2)
> Reviewed 2026-05-04 · Prior review: `03-web-app-review.md` (2026-05-03) · UI testing passes: `04`–`07`

## Executive Summary

The VetCard web app is well-architected and mobile-first. The prior review identified 14 issues; testing passes (04–07) confirm most have been **fixed** (error boundaries added, QueryClient defaults, birth-date persistence, completed-appointment edit guard, deletion flows, scroll-into-view on validation errors, OTP loading state, PublicShare skeleton, preventive-record edit route).

Fresh issues found in this pass — heavily mobile-focused — include: missing `inputMode`/`autocapitalize`/`autoComplete` attributes that cause iOS keyboard friction, no `capture="environment"` on the pet photo file input, no `viewport-fit=cover` for notched devices, JWT stored in `localStorage` (XSS exposure), no token-refresh mechanism, no global request timeout, color-only status indicators, and no PWA/service-worker. The clinic and owner portals also have minor input-styling drift.

---

## Verification of Prior 14 Findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | Mobile directory empty (Expo not started) | OPEN | `/mobile/` exists, unused. Roadmap-only. |
| 2 | No React error boundaries | **FIXED** | `web/src/main.tsx:6–34` — `ErrorBoundary` class wraps `<App>`. |
| 3 | QueryClient no default options | **FIXED** | `web/src/App.tsx:40–48` — `staleTime: 60s`, `refetchOnWindowFocus: false`, `retry: 1`. |
| 4 | Home page — three queries, no progressive rendering | **PARTIAL** | `Home.tsx:14–30` still fires 3 parallel queries; per-section skeletons added so it now renders progressively. Good enough. |
| 5 | Pet list — no pagination UI (silent cap at 200) | **FIXED** | `SearchPage.tsx:309–312` shows "Showing the 200 most recently updated…" warning when capped. |
| 6 | AddVisit loads full pet profile to find one visit | OPEN | `AddVisit.tsx:50–54` still loads `/pets/:id`. Backend `GET /visits/:visitId` exists now (per API review #1) — switching the client over would be a small change. |
| 7 | No guard on editing visits from completed appointments | **FIXED** | UI testing pass 05 + backend guard verified. |
| 8 | Validation errors not scrolled into view | **FIXED (partial)** | `AddVisit.tsx:155–162` uses `setFocus` + `scrollIntoView`. Pattern is not applied uniformly across other forms (see New Finding 8). |
| 9 | OTP verify loading state | **FIXED** | `OwnerLogin.tsx:206` — button `disabled={busy}` with "Checking…" label. |
| 10 | PublicShare loading skeleton | **FIXED** | `PublicShare.tsx:68–80` shows skeleton cards. |
| 11 | Quick Add not context-aware | OPEN | `AppLayout.tsx:131–160` — three static options. |
| 12 | Search input debouncing | OPEN | `SearchPage.tsx:85–87` — no explicit debounce. TanStack Query dedupes the same key but fast typists can still fire several requests. Add `useDeferredValue` or a 250–300ms debounce. |
| 13 | Dark mode toggle missing | OPEN | `AccountSettings.tsx` does not expose it. CSS already supports `.dark`. |
| 14 | No edit UI for preventive records | **FIXED** | `PreventiveCare.tsx:80–87` links to `/pets/:id/preventive/:recordId/edit`; route registered at `App.tsx:271–277`. |

---

## New Findings

### Mobile UX

#### N1. Missing `inputMode` / `autoComplete` on Mobile-Critical Inputs
**Severity:** Medium
**Files:** `AddPet.tsx:403,437`, `AccountTeamNew.tsx`, `OwnerAccount.tsx`, `Register.tsx`

Phone fields are missing `inputMode="tel"` + `autoComplete="tel"` (forces text keyboard). Weight has `type="number" step="0.1"` but no `inputMode="decimal"` (forces full keyboard with no decimal key on iOS). `OwnerLogin.tsx:147–149` does this correctly — propagate that pattern.

```tsx
<input type="tel"    inputMode="tel"     autoComplete="tel"   {...form.register("ownerMobile")} />
<input type="number" inputMode="decimal" step="0.1"           {...form.register("weightKg")} />
<input type="email"  inputMode="email"   autoComplete="email" {...form.register("email")} />
```

#### N2. Missing `autocapitalize="off"` on Email and OTP Inputs
**Severity:** Low
**Files:** `Login.tsx:91`, `Register.tsx:103`, `OwnerLogin.tsx:146,164`

iOS auto-capitalizes the first letter of email and OTP inputs. Email comparisons fail silently after that. Add `autocapitalize="off"` (and `spellcheck={false}` while you're there).

#### N3. Pet Avatar File Input Missing `capture="environment"`
**Severity:** Medium
**File:** `AddPet.tsx:326–329`

```tsx
<input type="file" accept="image/*" /* no capture */ />
```
Adding `capture="environment"` opens the rear camera by default on mobile — the dominant flow for pet photos. Without it, every upload requires extra taps to switch from gallery to camera.

#### N4. No `viewport-fit=cover` Meta Tag
**Severity:** Low
**File:** `web/index.html:5`

The app uses `safe-area-inset-bottom` in CSS, but the meta tag is `width=device-width, initial-scale=1.0` — without `viewport-fit=cover`, iOS doesn't expose the safe-area insets reliably on notched devices.

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

#### N5. Weight Input Will Spinner-Step by 1 on Some Browsers
**Severity:** Low
**File:** `AddPet.tsx:403–410`

Even with `step="0.1"`, some Safari versions step the spinner by 1. Combined with the missing `inputMode="decimal"` (N1), data entry on mobile is awkward. Consider switching weight to a text input with numeric validation, or rely on `inputMode="decimal"` + manual keyboard entry.

---

### Forms & Validation

#### N6. Native Date Picker Quirks on iOS Safari
**Severity:** Low
**Files:** `AddPet.tsx:419`, `AddVisit.tsx:227`, `AddAppointment.tsx`

`toDateInputValue()` is correctly used to avoid timezone issues, but iOS Safari can place the date picker modal behind the keyboard, with no immediate visual change after selection. Not a blocker, but watch for support feedback.

#### N7. Inconsistent Input Styling Across Clinic vs Owner Portals
**Severity:** Low
**Files:** `AddPet.tsx:59–60` (clinic) vs `OwnerLogin.tsx:10–11` (owner)

- Clinic: `h-11`, `bg-card`, `focus:ring-primary/20`
- Owner: `h-12`, `border-tertiary/40`, `focus:ring-tertiary/20`

Extract a shared `FormInput` component or pair of `inputCls`/`ownerInputCls` constants in one place. Drift will only get worse.

#### N8. `scrollIntoView` on Validation Errors Not Applied Uniformly
**Severity:** Low
**Files:** `OwnerAddPet.tsx`, `AddAppointment.tsx`, `AddPreventiveRecord.tsx`

`AddVisit.tsx:155–162` does this correctly. Other form pages don't. Lift the pattern into a shared `useScrollToFirstError(form)` hook and call it from every form.

---

### Auth & State

#### N9. JWT Stored in `localStorage` (XSS Exposure)
**Severity:** High
**Files:** `web/src/lib/auth.tsx:35–39`, `web/src/lib/owner-auth.tsx`

```ts
const tokenStorageKey = "vetcard.auth.token";
function readStoredToken() { return window.localStorage.getItem(tokenStorageKey); }
```

Any XSS (e.g., via unsanitized rendering of pet notes or owner-supplied content) lets the attacker steal the token. The only defense today is "we don't have XSS yet" — that's not a defense. Best practice: server-set `HttpOnly; SameSite=Strict; Secure` cookie.

This is a coordinated backend+frontend refactor. Not a quick fix, but should be on the security backlog.

#### N10. No Token Refresh Mechanism
**Severity:** Medium
**File:** `web/src/lib/auth.tsx:65–93`

JWT now expires at 30 days (per API review #12 fix). When it expires mid-session, the app calls `/auth/me`, gets an error, and signs out. No refresh-token flow and no sliding-window refresh on activity. Acceptable for daily users; jarring for weekly users.

Either (a) issue refresh tokens server-side and rotate on `/auth/me`, or (b) extend the token's expiry on every authenticated request.

---

### Routing

#### N11. Deep-Link + Back-Button Behavior Untested
**Severity:** Low
**Files:** Anywhere using `state: { from: ... }` + `readReturnTo()`

The `from` pattern works within the app, but external deep links (browser bookmarks, share links) won't have `from` state. Back-button behavior in those cases falls back to a hardcoded path. Worth an E2E test pass.

---

### Data & Performance

#### N12. No Optimistic Updates on Mutations
**Severity:** Medium
**Files:** `AddVisit.tsx:137–153`, `AddAppointment.tsx`, etc.

Mutations wait for the server before navigating or showing the toast. On clinic WiFi this is 1–3 seconds of lag. Adding `onMutate` for an immediate UI response and rolling back on error is the standard TanStack Query pattern.

#### N13. Long Lists Not Virtualized
**Severity:** Low
**Files:** `SearchPage.tsx:314–395`, `Calendar.tsx`

200+ items in a flat list is fine on modern devices but starts to drop frames on older Android phones. Defer to `react-window` only if profiling shows it.

#### N14. No Global API Request Timeout
**Severity:** Medium
**Files:** `web/src/lib/api.ts` (and any direct `fetch()` callers)

If the API hangs (cold start, dropped TCP), `fetch` waits indefinitely. Wrap with `AbortController` + 10s default timeout, surface a "Network is slow" toast on abort.

```ts
const controller = new AbortController();
const t = setTimeout(() => controller.abort(), 10_000);
try { return await fetch(url, { signal: controller.signal, ... }) }
finally { clearTimeout(t) }
```

---

### Accessibility

#### N15. Color-Only Status Indicators
**Severity:** Medium
**Files:** `Calendar.tsx:35–56` (`getAppointmentTone()`), `StatusBadge.tsx`

Appointment status is conveyed by background color (success / danger / neutral). Color-blind users can't distinguish. Each status pill should also carry an icon or distinct text label, and contrast should hit WCAG AA against the warm-off-white background.

#### N16. No Skip-to-Content Link
**Severity:** Low
**Files:** `AppLayout.tsx`, `OwnerLayout.tsx`

Keyboard / screen-reader users tab through the entire bottom nav before hitting content. Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` and an `id="main-content"` on `<main>`.

---

### PWA / Offline

#### N17. No `manifest.json`, No Service Worker, No Offline Cache
**Severity:** Low
**Files:** none — everything missing

Clinics with patchy WiFi would benefit from at least a read-only IndexedDB cache of recently-viewed pet profiles. As a first step: add a manifest + install icons so the app is installable as a PWA.

---

### i18n

#### N18. Hardcoded English; Philippines Locale Assumptions
**Severity:** Low (informational)
**Files:** `OwnerLogin.tsx:103` (`normalizePhilippineMobileInput`), `web/src/lib/format.ts`, all UI strings

Not a current bug — Philippines-only is the current target market — but worth noting before any expansion.

---

### Error States

#### N19. No Dedicated 5xx Error Page
**Severity:** Low
**Files:** `App.tsx:302`, `main.tsx`

`<Route path="*" element={<NotFound />} />` covers 404. Server errors fall through to the global ErrorBoundary fallback. A dedicated "Service unavailable" page with a retry button and a link home would be friendlier.

---

## Summary Table — Sorted by Severity

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| N9 | JWT in `localStorage` (XSS exposure) | **High** | High (coordinate w/ backend) |
| N1 | Missing mobile input attributes (`inputMode`, `autoComplete`) | Medium | Low |
| N3 | Pet avatar input missing `capture="environment"` | Medium | Trivial |
| N10 | No token refresh mechanism | Medium | Medium (backend + client) |
| N12 | No optimistic updates on mutations | Medium | Medium |
| N14 | No global API request timeout | Medium | Low |
| N15 | Color-only status indicators (a11y) | Medium | Low |
| Prev 6 | AddVisit loads full pet profile (API now exists) | Medium | Low |
| Prev 12 | Search input debouncing | Medium | Low |
| N2 | Missing `autocapitalize="off"` on email/OTP | Low | Trivial |
| N4 | No `viewport-fit=cover` meta tag | Low | Trivial |
| N5 | Weight input spinner steps by 1 on some browsers | Low | Low |
| N6 | iOS Safari date picker quirks | Low | — (watch) |
| N7 | Clinic vs owner input styling drift | Low | Low |
| N8 | `scrollIntoView` not applied to all forms | Low | Low |
| N11 | Deep-link + back-button behavior untested | Low | Low (test only) |
| N13 | Long lists not virtualized | Low | Medium (defer until needed) |
| N16 | No skip-to-content link | Low | Trivial |
| N17 | No PWA manifest / service worker / offline cache | Low | Medium |
| N18 | Hardcoded English / Philippines locale | Low | High (defer until expansion) |
| N19 | No dedicated 5xx error page | Low | Low |
| Prev 1 | Mobile (Expo) directory empty | Informational | High (when scoped) |
| Prev 4 | Home page — 3 queries (now progressive) | Low (closed enough) | — |
| Prev 11 | Quick Add not context-aware | Low | Medium |
| Prev 13 | Dark mode toggle missing | Low | Low |

---

## Recommended Sequencing

**This week (quick wins, low effort, high mobile impact):**
- N1, N2, N3, N4 — mobile input attributes, autocapitalize, camera capture, viewport-fit. Maybe an afternoon's work end-to-end.
- N14 — global request timeout.
- N16 — skip-to-content link.
- Prev 6 — switch AddVisit to `GET /visits/:visitId`.

**Next sprint:**
- N9 — plan httpOnly cookie migration (coordinate with backend).
- N10 — implement refresh-token flow.
- N15 — accessibility audit on color-coded status; add icons/labels.
- N12 — optimistic updates on the highest-traffic mutations (visit create, appointment status).
- N7, N8 — extract shared `FormInput` and `useScrollToFirstError`.
- Prev 12 — debounce search.

**Backlog:**
- N17 — PWA manifest + minimal service worker.
- N19 — 5xx error page.
- Prev 11 — context-aware Quick Add.
- Prev 13 — dark mode toggle.
- N5, N6, N13, N18 — defer.

---

## Code Quality Observations

**Strengths to preserve:**
- ErrorBoundary at the app root (`main.tsx:6–34`) — catches white-screen failures.
- QueryClient defaults are sensible (`App.tsx:40–48`).
- `from` navigation pattern is consistently applied — preserves return paths.
- Per-section skeletons on Home — progressive rendering done right.
- `toDateInputValue()` utility — prevents timezone bugs.
- Strong TypeScript discipline throughout.

**Improve next:**
- One canonical `FormInput` component (clinic + owner parity).
- Centralized mobile-input helpers (`inputMode`, `autoComplete`, `autocapitalize` defaults).
- Global `apiRequest` timeout + standard error toast.
- Move auth tokens off `localStorage`.
