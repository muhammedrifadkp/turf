---
name: Athletic Management UI
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#3d4a43'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#6d7a73'
  outline-variant: '#bccac2'
  surface-tint: '#006c51'
  primary: '#006c51'
  on-primary: '#ffffff'
  primary-container: '#00a67e'
  on-primary-container: '#003224'
  inverse-primary: '#5bdcb0'
  secondary: '#b7102a'
  on-secondary: '#ffffff'
  secondary-container: '#db313f'
  on-secondary-container: '#fffbff'
  tertiary: '#6f5d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c8a900'
  on-tertiary-container: '#4b3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7af9cc'
  primary-fixed-dim: '#5bdcb0'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513c'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b1'
  on-secondary-fixed: '#410007'
  on-secondary-fixed-variant: '#92001c'
  tertiary-fixed: '#ffe16a'
  tertiary-fixed-dim: '#e8c404'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  price-display:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  card-gap: 12px
  section-gap: 24px
---

## Brand & Style

The design system is engineered for high-performance sports facility management, specifically optimized for rapid mobile interactions in point-of-sale (POS) environments. The personality is **athletic, professional, and efficient**. It prioritizes clarity and actionability through a refined **Corporate/Modern** style that incorporates subtle **Tonal Layering**.

The interface evokes a sense of reliability and speed. By using vibrant action colors against a clinical, high-contrast neutral background, the design ensures that critical data—such as booking times and payment statuses—is immediately legible under varying lighting conditions typical of sports arenas.

**Key Visual Principles:**
- **Clarity over Ornament:** Every element serves a functional purpose, with minimal decorative flourishes.
- **High Information Density:** Optimized for list-heavy views without feeling cluttered.
- **Action-Oriented:** Primary actions use high-saturation greens to signal progress and completion.

## Colors

The palette is anchored by a signature "Turf Green" (#00A67E), symbolizing growth and operational success. This primary color is used exclusively for positive actions and "paid" states.

- **Primary (Green):** Used for primary buttons, success indicators, and active navigation states.
- **Secondary (Soft Red):** Reserved for urgent financial actions like "Add Expense" or "Overdue" alerts. It is vibrant but balanced to avoid inducing panic.
- **Tertiary (Yellow/Amber):** Specifically used for time-sensitive scheduling cues and "Pending" status chips.
- **Neutrals:** A range of cool grays provides structure. The background uses a very light off-white (`#F8F9FA`) to reduce eye strain while maintaining high contrast with the primary text (`#1A1C1E`).

## Typography

The typography utilizes **Hanken Grotesk** to achieve a sharp, contemporary look that balances technical precision with high readability.

- **Scale:** The hierarchy is tight. Headlines use heavy weights (700-800) to anchor sections, while body text remains clean and functional.
- **Labels:** Small labels (e.g., "TEAM NAME") use uppercase styling with increased letter spacing to create a distinct visual layer from the data they describe.
- **Currency:** Price points and balances are emphasized with increased font weight and specific coloring (Primary Green for paid, Soft Red for balances) to ensure financial data is the first thing a user sees.

## Layout & Spacing

This design system uses a **Fluid Grid** model optimized for narrow viewports. On mobile, the content follows a single-column stack with generous side margins to prevent "edge-clutter."

- **Rhythm:** An 8px base grid is used for all layout decisions, with 4px increments for tighter component internals.
- **Grouping:** Related information (like Team Name and Timing) is tightly grouped (4-8px), while distinct data sets (like different bookings) are separated by 12px gaps within a container.
- **Safe Areas:** The mobile bottom navigation and header use fixed heights (56px and 64px respectively) to ensure touch targets are always accessible.

## Elevation & Depth

The system uses **Tonal Layers** rather than heavy shadows to create depth. This ensures the UI remains "flat" and fast-loading while still indicating hierarchy.

- **Level 0 (Background):** Primary background color (`#F8F9FA`).
- **Level 1 (Containers):** Large white surfaces (`#FFFFFF`) with subtle 1px borders (`#E9ECEF`) to define major sections.
- **Level 2 (Active Cards):** Individual item cards within a section use a slightly different border or a very soft, low-blur shadow (4px blur, 2% opacity) to suggest interactability.
- **Level 3 (Pop-overs/Modals):** High-contrast overlays with a 16px blur backdrop to focus attention on critical inputs.

## Shapes

The shape language is **Rounded**, providing a friendly but professional feel that softens the "industrial" nature of a POS system.

- **Standard Radius:** 8px (`rounded-md`) is the default for most buttons, inputs, and internal card elements.
- **Container Radius:** 16px (`rounded-xl`) is used for the primary outer containers and section headers to create a "nested" look.
- **Pill Shapes:** Used exclusively for status chips (e.g., "Paid in Full", "4:00 PM - 5:00 PM") to differentiate them from actionable buttons.

## Components

### Buttons
- **Primary Action:** Solid Turf Green (`#00A67E`) background with White text. Bold weight, 48px minimum height for mobile touch.
- **Secondary Action:** Solid Soft Red (`#E63946`) background for destructive or expense-related items.
- **Outline/Ghost:** 1px border using the primary color with transparent background for secondary details within a card.

### Cards
- **Booking Card:** White background, 1px border, 8px padding. Uses a "header" style for the team name and a "footer" style for the primary action button.
- **Status Chips:** Light tinted backgrounds (e.g., light yellow for "Pending", light green for "Paid") with dark, high-contrast text.

### Form Elements
- **Inputs:** 44px height, light gray border (`#DEE2E6`), 8px radius. Active state uses a 1px Turf Green border.
- **Checkboxes:** Standard 20px size with Turf Green fill when active.

### Lists
- Lists use "Divideless" design, where the spacing between cards and the subtle background color provides the separation, rather than horizontal lines.