# Web App Review (Mobile-First) — VetCard
> Iteration 3 of 3 · Reviewed 2026-05-03

## Executive Summary

The web app is the most polished layer of the stack. The design system is coherent, the component architecture is clean, and the mobile-first layout (bottom nav, full-bleed cards, 48px touch targets, safe-area insets) is well-executed. The main issues are: the `mobile/` directory is empty (the Expo app is not started), missing error boundaries, the pet list having no pagination awareness, and several UX gaps in forms that will trip up staff during the day-to-day.

---

## Architecture Overview

- **Framework:** React 18 + Vite
- **Routing:** React Router v6 (two portals: `/clinic/*` for staff, `/owner/*` for pet owners)
- **State:** TanStack Query (server state) + React Context (auth session)
- **UI:** Tailwind CSS + shadcn/ui components + custom design system
- **Forms:** react-hook-form + Zod resolver
- **Notifications:** Sonner toasts
- **Two auth contexts:** `AuthProvider` (clinic staff JWT) and `OwnerAuthProvider` (owner OTP JWT)

---

## Design System & Mobile-First Layout

### What Works Exceptionally Well

**The `AppLayout` chrome** is an excellent mobile shell:
- Sticky header with `backdrop-blur-md` — degrades gracefully on lower-end devices.
- 5-tab bottom navigation with a `Plus` action button that opens a "Quick Add" sheet — the iOS/Android native pattern done correctly in a PWA.
- `pb-24` on the main content area clears the bottom nav on all screen sizes.
- `safe-area-inset-bottom` used on the bottom nav for iPhone notch/home-indicator clearance.
- The `animate-fade-up` on route transitions gives a polished feel without overloading the CPU.

**The "Index Card" visual language** is consistent. The `index-card` utility class (rounded-2xl, border, shadow-card, bg-card) is used everywhere to create the "stacked paper files" metaphor from the design doc. It reads clearly on both mobile and desktop.

**Typography** is correct: `font-display` (Manrope) for headings, `sans` (Inter) for body. The `label-eyebrow` pattern (uppercase, small, letter-spaced) for category headers mimics a medical chart effectively.

**Touch targets** — interactive elements use `size-9` or `size-10` icon buttons, `h-11` inputs, and `size-lg` form buttons. These meet the 48px minimum specified in the design doc.

**Color system** — the HSL-based CSS variable approach with full dark-mode support is solid. The warm off-white background (`40 33% 98%`) and deep teal primary avoid the sterile pure-white / bright-blue clinic look successfully.

---

## Issues & Recommendations

### 1. Mobile Directory Is Empty
```
/mobile  (no files)
```

The `mobile/` directory listed in the root exists but contains no files. If the Expo/React Native app is planned but not started, that's fine — but the business requirements mention a mobile app as a key delivery. This should be tracked explicitly in the roadmap.

### 2. No React Error Boundaries
There are no `ErrorBoundary` components anywhere in the component tree. If any component throws a runtime error (e.g., a `null` dereference on unexpected API data), the entire app will white-screen with no user-facing message.

**Fix:** Add a top-level error boundary in `main.tsx` at minimum:
```tsx
// main.tsx
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
  <App />
</ErrorBoundary>
```
shadcn/ui does not ship an ErrorBoundary — use `react-error-boundary` (already a common peer dep).

### 3. QueryClient Has No Global Error Handler
**File:** `web/src/App.tsx` line 40

```ts
const queryClient = new QueryClient();
```

No `defaultOptions` are set. This means:
- Failed queries silently retry 3 times (TanStack Query default) before surfacing to the UI.
- There is no global toast for unexpected API failures — each component must handle errors individually. Several pages do handle errors explicitly (good), but some do not.
- The `refetchOnWindowFocus` default is `true`, which will cause a burst of API calls every time the staff member alt-tabs back to the browser. On mobile, switching apps and returning triggers this constantly.

**Recommended config:**
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,          // 1 minute — avoids re-fetching on every navigation
      refetchOnWindowFocus: false,   // prevent burst refetch on tab switch
      retry: 1,                      // only retry once, not 3 times
    },
  },
})
```

### 4. `Home.tsx` — Three Separate Queries on Mount
**File:** `web/src/pages/Home.tsx` lines 14–31

The home page fires three parallel queries:
1. `GET /dashboard/summary`
2. `GET /appointments/summary`
3. `GET /appointments?startDate=...&status=SCHEDULED`

The first two could be merged into a single dashboard endpoint. The third is separate because it needs the full appointment list (not just the count). However, the dashboard summary and appointment summary are both shown on the same screen and would benefit from a single round-trip.

The loading state waits for all three to resolve before showing any content, which means the user sees a blank "Loading clinic dashboard..." message instead of progressive rendering.

**Fix:** Show the dashboard summary card immediately when it resolves, and show the appointment section with its own loading skeleton. Use `isLoading` per section rather than a combined gate.

### 5. Pet List Has No Pagination UI
**File:** `web/src/pages/SearchPage.tsx`

The API silently caps at 200 pets. The UI shows a pet count but no "showing X of Y" indicator and no "load more" button. A clinic with 200+ pets will silently see a truncated list — this is a data-correctness issue, not just a UX issue.

**Fix (short-term):** After fetching, if `pets.length === 200`, show a warning: "Showing the 200 most recently updated pets. Refine your search to find others." This communicates the limitation honestly.

**Fix (long-term):** Implement cursor-based pagination once the API supports it.

### 6. `AddVisit` Form Loads Full Pet Profile to Pre-Fill
**File:** `web/src/pages/AddVisit.tsx` lines 43–51

```ts
const petQuery = useQuery({
  queryKey: ["pet", id],
  queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${id}`, { token }),
})
const visit = useMemo(
  () => petQuery.data?.pet.visits.find((record) => record.id === visitId) ?? null,
  ...
)
```

When editing a visit, the entire pet profile (all visits, all appointments, all preventive records) is loaded just to find the one visit. This is because `GET /visits/:visitId` does not exist (flagged in the API review).

Until that endpoint is added, the current approach works but is wasteful. As pet histories grow, this page will become noticeably slow.

### 7. `AddVisit` — No Guard Against Editing a Visit Linked to a Completed Appointment
If a visit is linked to an appointment that has been marked COMPLETED, editing the visit is currently allowed. The only guard is `cannotEditVisit = !visit.recordedHere` (blocks edits on visits from other clinics). There is no block on editing visits from a past appointment.

This is a medical record integrity concern. Visits should arguably be read-only after a configurable grace period, or at minimum require an "edit reason" for the audit log.

### 8. Form Validation Errors Are Not Scrolled Into View
**File:** `web/src/pages/AddVisit.tsx`, `AddAppointment.tsx`, `AddPreventiveRecord.tsx`

When a user taps "Save" and there are validation errors, the form errors appear inline (good) but the page does not scroll to the first error. On mobile, the user may not see the error if the relevant field is above the fold.

**Fix:**
```ts
// In useEffect after form.handleSubmit fails:
const firstError = Object.keys(form.formState.errors)[0]
if (firstError) {
  document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
```
Or use react-hook-form's `setFocus` in the `onError` callback.

### 9. `OwnerLogin` OTP Flow — No Loading State on Verify Step
**File:** `web/src/pages/OwnerLogin.tsx`

After the owner enters the OTP and taps verify, if the server is slow (cold start, bad connection), there is no loading indicator. The button should be disabled and show a spinner while the `POST /verify-code` request is in-flight. This is likely already handled with `useMutation`'s `isPending` — confirm it is actually applied to the button's `disabled` prop.

### 10. `PublicShare` Page Has No Loading Skeleton
**File:** `web/src/pages/PublicShare.tsx`

The public share page is the one page that pet owners and emergency responders will see without being logged in. It should be the most polished. If the API is slow, showing a blank page or a plain "Loading..." text is poor for first impressions. Add a content skeleton that matches the card layout.

### 11. `AppLayout` Bottom Nav — "Add" Button Does Not Indicate Context
The `Plus` button in the bottom nav opens a Quick Add sheet with three options: New Pet, Link Pet, and Add Appointment. The options are not contextual — if you are already on the PetProfile page, "New Pet Profile" is not the most likely action. 

**Suggestion:** Make the Quick Add options context-aware based on the current route. On `/pets/:id`, lead with "Record Visit" and "Schedule Appointment" for that pet. This is a UX enhancement, not a bug.

### 12. `SearchPage` — Search Input Debouncing
**File:** `web/src/pages/SearchPage.tsx`

If the search input fires a query on every keystroke (no debounce), each character typed triggers a server round-trip. This creates unnecessary load and a flickering results list. Verify that the search query is debounced (typically 300ms). If using `useQuery` with the raw input as the query key, add `useDeferredValue` or a manual debounce hook.

### 13. Dark Mode — CSS Variables Are Defined but No Toggle UI
`index.css` defines a full `.dark` theme. The CSS variable approach means dark mode works correctly with the system preference (`prefers-color-scheme: dark`). However, there is no user-facing toggle in the Account settings. Users who want to override the system preference cannot.

This is a nice-to-have but should be on the Account settings backlog since the CSS work is already done.

### 14. `PreventiveRecord` Edit Is Not Accessible from `PetProfile`
The Pet Profile page shows preventive records in the `PreventivePanel` component. Records are displayed as non-interactive cards (no link, no edit button). To edit a preventive record, the user must navigate to `/pets/:id/preventive` (the full PreventiveCare page) and find the record there. On `PreventiveCare.tsx`, check whether an edit flow exists — from the file list, `AddPreventiveRecord.tsx` exists but there is no `/preventive/:recordId/edit` route defined in `App.tsx`.

**This is a missing feature:** there is no way to edit a preventive record after it has been created. Only the visit and appointment flows have edit routes. The `PUT /preventive-records/:recordId` API endpoint exists but is unreachable from the UI.

---

## Positive Patterns to Preserve

- **`from` state navigation** — every Link that navigates to a sub-page passes `state: { from: currentPath }` and the destination reads `readReturnTo(location.state)` to go back correctly. This preserves context across deep navigation. Do not break this.
- **`invalidateQueries` on mutation success** — every mutation that changes data invalidates the related query keys so the UI stays fresh. This is correct.
- **`toDateInputValue`** — using a shared utility to format dates for `<input type="date">` prevents timezone bugs. Keep this pattern.
- **`sms:` and `tel:` href attributes on owner contact** — the PetProfile owner card has direct tap-to-call and tap-to-text links. This is exactly right for a mobile-first clinical tool.

---

## Summary Table

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Mobile directory empty (Expo app not started) | Informational | High |
| 2 | No React error boundaries | **High** | Low |
| 3 | QueryClient no default options (refetchOnWindowFocus, retry) | Medium | Low |
| 4 | Home page — three queries, no progressive rendering | Medium | Low |
| 5 | Pet list — no pagination UI (silent cap at 200) | **High** | Low (UI), Medium (API) |
| 6 | AddVisit loads full pet profile to find one visit | Medium | Low (after API fix) |
| 7 | No guard on editing visits from completed appointments | Low | Medium |
| 8 | Validation errors not scrolled into view on mobile | Medium | Low |
| 9 | OTP verify step — confirm loading state on button | Medium | Low |
| 10 | PublicShare — no loading skeleton | Medium | Low |
| 11 | Quick Add sheet not context-aware | Low | Medium |
| 12 | Search input debouncing — verify or add | Medium | Low |
| 13 | Dark mode toggle missing in Account settings | Low | Low |
| 14 | No edit UI for preventive records (PUT endpoint unused) | **High** | Low |

**Priority for tomorrow:** Issues 2, 5 (UI warning), 8, and 14 are the most impactful for daily clinic use. Issue 14 is a missing feature — the PUT API endpoint exists but the UI route is absent.
