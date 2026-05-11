> Archived on 2026-05-04. This document is historical and is not the current VetCard design source of truth.
> Use `DESIGN.md` at the repository root for current brand, UI, and polish guidance.

---
name: Clinic-Ready
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daf0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d9e3f9'
  on-surface: '#121c2c'
  on-surface-variant: '#3e494a'
  inverse-surface: '#273141'
  inverse-on-surface: '#ebf1ff'
  outline: '#6e797a'
  outline-variant: '#bdc9ca'
  surface-tint: '#006971'
  primary: '#006068'
  on-primary: '#ffffff'
  primary-container: '#007b85'
  on-primary-container: '#d5faff'
  inverse-primary: '#7ad4df'
  secondary: '#545f72'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f7'
  on-secondary-container: '#586377'
  tertiary: '#844718'
  on-tertiary: '#ffffff'
  tertiary-container: '#a15f2e'
  on-tertiary-container: '#fff1ea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#96f1fc'
  primary-fixed-dim: '#7ad4df'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f56'
  secondary-fixed: '#d8e3fa'
  secondary-fixed-dim: '#bcc7dd'
  on-secondary-fixed: '#111c2c'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311300'
  on-tertiary-fixed-variant: '#703808'
  background: '#f9f9ff'
  on-background: '#121c2c'
  surface-variant: '#d9e3f9'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-mobile: 20px
  gutter: 16px
  touch-target-min: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is anchored in the "Clinic-Ready" aesthetic: a synthesis of medical precision and approachable care. The visual language evokes the reliability of a professional veterinary practice while maintaining the warmth required for pet owners. 

The style utilizes a **Corporate / Modern** foundation with a **Tactile** twist—specifically referencing the physical "index card" metaphor to organize pet health records. Surfaces are clean and breathable, using generous white space to reduce cognitive load during potentially stressful clinic visits. The interface feels established and institutional yet remains highly accessible through soft edges and intuitive interactions.

## Colors

The palette is led by a deep **Medical Teal**, chosen for its balance between the sterile authority of blue and the organic growth associated with green. 

- **Primary:** Medical Teal (#007B85) for actions, branding, and active states.
- **Background:** The "Paper" feel is achieved with a subtle, cool Light Gray (#F7F9FA), preventing the harshness of pure white while maintaining high contrast for text.
- **Semantic:** Success and Alert colors are slightly desaturated to remain professional, ensuring they stand out without appearing "alarming" in a clinical setting.
- **Neutrals:** A range of slate grays are used for secondary text and borders to maintain a soft, sophisticated hierarchy.

## Typography

This design system uses a dual-font approach to maximize both character and utility. **Manrope** is used for headlines to provide a modern, refined, and trustworthy feel. **Inter** is utilized for all body copy and UI labels due to its exceptional legibility on mobile screens and neutral, systematic nature.

Text hierarchy is strictly maintained to ensure pet health data is easily scannable. Uppercase labels are used sparingly for category headers (e.g., "LAST VACCINATION") to mimic the structure of a medical chart.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for mobile-first interaction. 

- **Margins:** A generous 20px side margin ensures content does not feel cramped on narrow devices.
- **Rhythm:** An 8px base grid governs all vertical spacing to maintain a consistent cadence between medical record entries.
- **Touch Targets:** A strict minimum of 48x48px is enforced for all interactive elements, acknowledging that users may be using the app while holding a pet or moving through a clinic.

## Elevation & Depth

The design system utilizes **Tonal Layers** rather than heavy shadows to indicate depth. This mimics the appearance of stacked paper files.

- **Level 0 (Background):** Light Gray (#F7F9FA).
- **Level 1 (Cards/Base):** Pure White (#FFFFFF) with a very fine, low-contrast 1px border (#E2E8F0).
- **Level 2 (Active/Floating):** A soft, ambient shadow (0px 4px 12px, 5% opacity) is used only for primary action buttons or modal sheets to separate them from the record cards below.
- **Dividers:** Used minimally; whitespace and subtle background shifts are preferred to define sections.

## Shapes

The shape language is consistently **Rounded** (Level 2). This softens the "clinical" feel, making the app appear friendlier and more modern.

- **Standard Components:** 0.5rem (8px) radius for buttons and input fields.
- **Record Cards:** 1rem (16px) radius for main containers to clearly differentiate them as distinct "digital index cards."
- **Avatars/Pet Photos:** Squircle or fully rounded shapes to emphasize the warmth of the pets being cared for.

## Components

### Digital Index Cards
The core of the design system. These white, rounded containers house pet data. They feature a distinct header area (often with a small pet icon or photo) and clear, labeled rows of information.

### Buttons
- **Primary:** High-contrast Teal background with White text. Bold, 16px weight.
- **Secondary:** Teal outline with Teal text for less critical actions (e.g., "View Past Visits").
- **Tertiary:** Ghost style for navigational links.

### Form Fields
Input fields use a solid White background with a subtle 1px border. On focus, the border thickens to 2px Teal. Labels always remain visible (no floating placeholders that disappear) to ensure clarity when filling out complex medical history.

### Simple List Items
Used for appointment logs or medication lists. These feature a high-contrast title, a secondary supporting line (e.g., "Dr. Smith • 10:30 AM"), and a trailing chevron or status indicator.

### Pet Profiles
A specialized component featuring a large pet photo with a status badge (e.g., "Up to Date" or "Action Required") to give the user immediate peace of mind or clear direction.
