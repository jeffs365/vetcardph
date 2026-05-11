# VetCard Design & Brand System

Last updated: 2026-05-04

This is the current source of truth for VetCard's product UI and brand direction. Older design notes are archived in `docs/archive/`.

## Brand Direction

VetCard should feel like connected veterinary care without the paperwork drag: calm enough for clinic staff under time pressure, warm enough for pet owners, and precise enough for health records.

The product promise is simple:

> One pet record that follows the pet from home to clinic.

Use this idea to guide UI decisions. The app should prioritize clarity, trust, speed, and a small amount of pet-owner warmth.

## Brand Roles

VetCard has two primary audiences, and color should help users understand where they are.

- Clinic staff: use clinic green and deep teal. This side should feel operational, focused, and dependable.
- Pet owners: use warm orange. This side should feel friendly, reassuring, and easy.
- Shared/product system: use deep teal as the anchor across the shell, brand, headings, navigation, and trust cues.

## Logo

The canonical app mark and lockup live in `web/src/components/BrandLockup.tsx`.

- Mark asset: `web/public/vetcard-icon.svg`
- Wordmark: `Vet` in teal, `Card` in orange
- Use the compact lockup in headers and constrained mobile screens.
- Use the larger lockup only on first-touch/login/landing moments.

Do not recolor the wordmark per audience. Clinic screens still use the VetCard brand lockup with orange `Card`; clinic action color changes happen in the UI controls.

## Color System

All design tokens are HSL CSS variables in `web/src/index.css` and mapped through Tailwind in `web/tailwind.config.ts`.

Core palette:

- Background: warm off-white, `hsl(40 33% 98%)`
- Foreground: deep teal ink, `hsl(191 53% 17%)`
- Primary teal: `hsl(188 68% 23%)`
- Primary deep: `hsl(188 78% 17%)`
- Primary soft: `hsl(184 46% 91%)`
- Owner orange / tertiary: `hsl(27 97% 52%)`
- Owner soft: `hsl(29 100% 93%)`
- Clinic green / success: `hsl(160 54% 31%)`
- Clinic soft: `hsl(156 48% 90%)`
- Muted warm neutral: `hsl(36 24% 95%)`
- Border: `hsl(35 18% 86%)`
- Destructive: `hsl(0 75% 42%)`

Usage rules:

- Teal is the system anchor: headings, brand, shell, navigation, trust copy.
- Orange is reserved for pet-owner primary actions, owner login/register, owner accents, and the `Card` wordmark.
- Green is reserved for clinic primary actions, clinic login/register, and positive/clinical operational states.
- Avoid purple, blue-heavy gradients, beige-heavy themes, brown/orange dominance, and decorative blobs.
- Prefer warm white surfaces with restrained borders and subtle shadows.

## Typography

Fonts are loaded in `web/src/index.css`.

- Display/headings: Manrope
- Body/UI: Inter

Current guidance:

- Major login and landing headings use Manrope, bold, tight but readable.
- Compact app headings should stay smaller and more operational than marketing hero type.
- Body copy should be direct, short, and scannable.
- Do not scale font sizes with viewport width.
- Avoid negative letter spacing beyond the existing heading treatment.

## Layout

VetCard is mobile-first. The app should feel like a polished phone workspace even on desktop.

Shared app shell:

- `.app-shell`: page-level viewport wrapper.
- `.app-canvas`: centered max-width phone canvas, currently `max-w-[440px]`.
- Mobile: full-bleed app surface.
- Desktop: phone-shaped canvas with rounded corners and soft depth.
- Use safe viewport units already present in CSS: `100svh` and `100dvh`.

Navigation:

- Staff app: sticky top header, bottom tab navigation, quick-add workflow.
- Owner app: simple owner shell, bottom navigation where needed, clear return paths after share/revoke flows.

Cards:

- Use cards for individual record items, form panels, modals, and repeated list items.
- Do not put cards inside other cards.
- Do not turn full page sections into floating cards.
- Keep card radius generally at `rounded-2xl` for VetCard mobile surfaces.

## Components

Buttons:

- Owner primary: filled orange (`bg-tertiary`).
- Clinic primary: filled green (`bg-success`).
- Shared/system primary: teal.
- Secondary actions should use outline or soft-tinted surfaces.
- Buttons should include icons when the action benefits from instant recognition.

Forms:

- Inputs are rounded, tall enough for mobile use, and visibly tied to the page role.
- Owner forms use orange focus/border accents.
- Clinic forms use green focus/border accents.
- Use mobile-friendly attributes such as `inputMode`, `autoComplete`, and camera `capture` where relevant.

Badges and status:

- Status badges should combine icon + text, not color alone.
- Status color must be supportive, not the only way to understand state.
- Keep badges compact so clinical tables/lists remain scannable.

Empty/loading/error states:

- Use plain language and a clear next step.
- For app workflows, avoid marketing copy.
- Every dead-end state should provide a route back into the app.

## Imagery

Current asset direction:

- Landing hero: realistic veterinary clinic/mobile product composition.
- Owner login hero: cute pet-owner illustration with pets and phone.
- Clinic login hero: cute clinic-workflow illustration, matching owner scale but using clinic green for UI actions.
- Reusable character models: dog, cat, and parrot transparent PNGs in `web/src/assets/brand/characters/`.

Rules:

- Use bitmap assets for hero/illustration moments.
- Keep generated image backgrounds transparent or visually blended with the page background when they sit on the app surface.
- Do not use generic gradients, decorative orbs, or abstract SVG hero art.
- Images should communicate the real product context: pets, records, clinic workflow, care, and phone access.
- Future character variants should match the saved dog, cat, and parrot models in proportions, outline weight, warmth, and teal/orange VetCard accents.

## Voice And Copy

VetCard copy should be practical, reassuring, and short.

Good patterns:

- "Find any pet record in seconds, not minutes."
- "One shared record for home and every clinic visit."
- "Enter clinic workspace."
- "Get one-time code."

Avoid:

- Generic SaaS claims.
- Long explanations inside app surfaces.
- Overstating security without specifics.
- Making login labels sound like sign-up CTAs unless the action truly creates an account.

## Page Guidance

Landing page:

- Lead with the concrete clinic value proposition.
- Keep the first viewport focused on product utility, not a generic brand hero.
- Use trust cues only when accurate.

Clinic login:

- Green primary action.
- Operational illustration.
- No demo-account callout in production-facing UI.
- Include a clear path to create a clinic workspace.
- Include a clear path to owner sign-in.

Owner login:

- Orange primary action.
- Warm illustration.
- Make phone login feel secure and simple.
- Include a clear path to create/register an owner account when supported.
- Include a clear path to clinic staff sign-in.

Staff workspace:

- Prioritize dense but calm information.
- Navigation should make appointments, pets, records, and search easy to reach.
- Avoid oversized decorative hero sections inside the workspace.

Owner workspace:

- Prioritize pet details, shared access, emergency QR/share flows, and simple next actions.
- Avoid clinical admin density on owner screens.

## Do And Don't

Do:

- Use teal for system identity.
- Use orange for owner actions.
- Use green for clinic actions.
- Keep pages mobile-first and thumb-friendly.
- Use icons to improve scan speed.
- Keep copy direct and useful.
- Preserve clear return paths from every terminal state.

Don't:

- Reintroduce the archived blue Material-like palette.
- Use color alone for status.
- Nest cards inside cards.
- Add decorative gradient blobs or abstract hero art.
- Let marketing copy creep into workflow screens.
- Use orange as the clinic primary action color.

## Implementation Source Of Truth

Primary files:

- `web/src/index.css`: CSS tokens, base styles, app canvas, shared component classes.
- `web/tailwind.config.ts`: Tailwind token mapping.
- `web/src/components/BrandLockup.tsx`: brand mark and wordmark.
- `web/src/assets/brand/characters/`: reusable dog, cat, parrot character assets.
- `web/src/pages/Index.tsx`: current landing composition.
- `web/src/pages/Login.tsx`: clinic login pattern.
- `web/src/pages/OwnerLogin.tsx`: owner login pattern.
- `web/src/components/AppLayout.tsx`: clinic app shell.
- `web/src/components/OwnerLayout.tsx`: owner app shell.

Before major UI changes, check this document and the token files together. If the product direction changes, update this document in the same pass as the implementation.
