# Stitch designs

UI designs from the Google Stitch project "KaLi's Era Design System" (`7753701483405540779`), exported on 3 November 2026. They are a visual reference, not a spec: the PRD, the design docs and [`design-system.md`](../design-system.md) win where they differ, and [`decisions.md`](../decisions.md) records how (entries 37 onward).

- `screens/`: each screen rendered from its code at 1440px (desktop) or 390px (mobile), split into parts when tall.
- `code/`: the HTML and Tailwind that Stitch generated. Reference only; never copy it into `src/`.
- `logos/`: two monogram app-icon concepts (not adopted; the brand mark is the text monogram in `design-system.md`).
- `design-system.md`: Stitch's two style guides, as written.

The current dashboard design is `dashboard-desktop-1440px-updated`. Stitch has no mobile dashboard, no empty state, and no signup or password pages.

Added on 11 November 2026, generated in the same project with the "Architectural Elegance" design system from prompts that give the app's real content and tokens (decision 62): `wedding-members-settings` (Settings → Wedding members) and `you-are-invited` (the invite link page). These two are Stitch's own screenshots at 2560px wide, not renders from code.
