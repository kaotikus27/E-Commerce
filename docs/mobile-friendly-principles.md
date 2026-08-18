---
title: Mobile-Friendly Responsiveness Principles
type: reference
status: active
created: 2026-08-18
updated: 2026-08-18
ai_generated: true
---

# Mobile-Friendly Responsiveness Principles

Standing reference for how this project builds responsive UI. Applies to all new frontend
work and is the checklist to audit existing components against.

## Core Principles

1. **Fluid layouts over fixed pixels** — avoid hardcoded pixel widths (`width: 1200px`) on
   layout containers. Use percentages, `clamp()`/`min()`/`max()`, or CSS Grid/Flexbox with
   `minmax()` and `auto-fit`/`auto-fill`.

2. **Mobile-first CSS** — write base styles for small screens first, then layer on
   enhancements with `min-width` media queries:

   ```css
   /* Base styles: Mobile (1 column) */
   .grid-container { display: grid; grid-template-columns: 1fr; gap: 1rem; }

   /* Tablet and up */
   @media (min-width: 768px) {
     .grid-container { grid-template-columns: repeat(2, 1fr); }
   }

   /* Desktop and up */
   @media (min-width: 1024px) {
     .grid-container { grid-template-columns: repeat(4, 1fr); }
   }
   ```

3. **Touch target ergonomics** — fingers need bigger interaction zones than a mouse cursor.
   All buttons, icons, and tap targets should be at least 48×48px with adequate spacing to
   prevent mis-taps.

4. **Viewport meta tag** — every entry HTML must include:

   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

   Confirmed present in `frontend/src/index.html`.

## Standard Sizing Guidelines Across Breakpoints

| Section / Element | Mobile (<768px) | Tablet (768–1023px) | Desktop (≥1024px) |
|---|---|---|---|
| Viewport padding | 16–20px margins | 24–32px margins | 32–80px (or centered `max-width: 1280px`) |
| Navigation bar height | 56–64px (drawer / bottom bar) | 64–72px | 72–80px (inline links) |
| Hero height | Auto content-height or 70–80vh | 80–90vh | 80–100vh (max 800–900px) |
| Section padding (Y-axis) | 40–60px | 60–80px | 80–120px |
| Cards (grid items) | 100% width (min height 120px) | 2 columns (min width 280px) | 3–4 columns (300–380px) |
| Base body typography | 16px (line height 1.5) | 16–18px | 16–18px |
| Hero heading (H1) | 32–40px | 44–52px | 56–72px (or `clamp(2rem, 5vw, 4.5rem)`) |

## Key UI Component Standards

**Navigation bar**
- Mobile: replace inline header nav with a hamburger menu / slide-out drawer, or a fixed
  bottom bar for primary actions (cart, search, home, account).
- Desktop: fixed/sticky top bar, max width constrained to 1280–1440px.

**Hero section**
- Mobile stacks elements vertically: headline → subtitle → primary CTA → image/graphic.
  Never place text side-by-side with a large image on mobile.
- Keep vertical padding tight (40px top/bottom) on mobile so the primary CTA sits near the
  fold.

**Cards & grid items**
- Avoid explicit heights; let content define vertical height, constrain `max-width` instead.
- Primary action buttons inside a card should be full-width (`width: 100%`) on mobile.

**Forms & text inputs**
- Minimum font size 16px on mobile inputs — smaller sizes trigger iOS Safari's auto-zoom
  and break the layout.
- Input heights 44–52px for touch comfort.

## Project Breakpoint Convention

This codebase's components (`home-page.component.ts`, etc.) standardize on `min-width: 640px`
as the mobile→tablet breakpoint, with `720px`/`860px`/`960px` used for further tablet→desktop
steps where a component needs them. New components should follow this ladder rather than
introducing arbitrary breakpoint values.

The shared `.grid-responsive` helper (`styles.css`) additionally steps through `480px` for a
1→2 column jump on small phones, before the standard `640px`/`960px` steps to 3/4 columns —
use this same `480px` step for any other card-grid component that needs a 1-column mobile base.
Updated 2026-08-18: base was 2 columns with no mobile step down to 1; changed after a review
found 2-up cards too cramped (~170px each) on 390–440px phone widths.
