# Architectural Elegance

## Brand & Style

This design system establishes a private, high-end editorial atmosphere tailored for discerning couples and executive wedding planners. The visual language deliberately rejects traditional ornate wedding tropes—eschewing gilt textures, calligraphic flourishes, floral filigree, and saturated bridal clichés in favor of architectural purity, structured typography, and intentional restraint.

The aesthetic fuses modern editorial layout principles with contemporary minimalism:
- **Tone**: Poised, discreet, architectural, calm, and unmistakably premium.
- **Visual Rhythm**: Ample negative space acting as a luxury design element rather than vacant screen area.
- **Compositional Discipline**: Razor-sharp hairline borders, asymmetric typographic pairings, and disciplined alignment inspired by high-fashion monographs and contemporary architectural magazines.
- **Audience Impact**: Evokes quiet confidence, effortless organization, and serene authority amidst high-stakes event coordination.

## Layout & Spacing

The layout is built upon an 8px modular baseline grid, prioritizing expansive negative space that mirrors luxury print layouts.

### Grid & Max Dimensions
- **Max Width**: Application views center within a strict `1200px` content container, preserving optimal readability and layout proportion on ultra-wide screens.
- **Desktop (1024px+)**: 12-column layout with 24px (`1.5rem`) gutters and 48px (`3rem`) canvas margins.
- **Tablet (768px - 1023px)**: 8-column layout with 20px gutters and 32px (`2rem`) canvas margins.
- **Mobile (< 768px)**: 4-column layout with 16px (`1rem`) gutters and 20px (`1.25rem`) canvas margins.

### Spatial Rhythm
- Density must always remain low-to-medium. Functional groupings should rely on whitespace hierarchy (`space-lg` to `space-xl`) rather than heavy physical dividing boxes.
- Section margins prioritize generous vertical breathing room (`48px` to `64px` between major blocks).

## Elevation & Depth

Visual hierarchy is achieved through boundary precision and surface contrast rather than multi-layered shadows.

- **Default Surface Treatment**: All standard containers, modular panels, and surface cards sit flush or semi-flush, bounded by a razor-thin `1px solid #E8E2DA` border against the `#FBF8F4` Warm Ivory background.
- **Ghost Elevation**: Heavy, muddy drop shadows are prohibited. The solitary permitted shadow is an imperceptible ambient feathering on hoverable elements:
  `box-shadow: 0 4px 20px -2px rgba(28, 25, 23, 0.04);`
- **Overlays & Drawers**: Modals, vendor detail sheets, and floating popovers maintain crisp `1px` structural borders, accompanied by an architectural ambient veil:
  `box-shadow: 0 16px 40px -8px rgba(28, 25, 23, 0.08);`
- **Layering Philosophy**: Depth is conveyed horizontally through clean compartmentalization and vertical stacking of crisp white panels upon the ivory canvas.

## Components

### Buttons
- **Primary**: Background `#7A1F3D`, text `#FFFFFF`, radius `10px`, padding `12px 24px`. Font: Inter 14px Medium. Hover state transitions to `#5E1730`. No drop shadow.
- **Secondary / Outlined**: Background `#FFFFFF`, 1px border `#E8E2DA`, text `#1C1917`, radius `10px`, padding `12px 24px`. Hover state: border color `#1C1917` with subtle `#FBF8F4` surface shift.
- **Ghost / Text**: Transparent background, text `#7A1F3D`, padding `12px 16px`. Hover: background `#F4E8EC`.

### Form Controls & Inputs
- **Text Inputs & Selects**: Height `44px`, background `#FFFFFF`, border `1px solid #E8E2DA`, radius `10px`, padding `0 14px`. Text `#1C1917`, placeholder `#6B645C`.
- **Focus State**: `1px solid #7A1F3D` with an outer ring `3px solid rgba(122, 31, 61, 0.12)`.
- **Labels**: Inter 14px Medium, Deep Charcoal `#1C1917`, placed 6px above the field with optional subtle helper text.

### Selection Controls (Checkboxes & Radios)
- **Checkboxes**: `18px x 18px`, `4px` radius, border `1.5px solid #E8E2DA`, background `#FFFFFF`. When checked: background `#7A1F3D`, border `#7A1F3D`, crisp white check icon.
- **Radio Buttons**: `18px x 18px`, circular, border `1.5px solid #E8E2DA`. When selected: `1.5px solid #7A1F3D` ring with a centered `8px` solid `#7A1F3D` dot.

### Status Badges & Chips
- **Geometry**: Pill-shaped (`9999px` radius), padding `4px 10px`, font: Inter 13px Medium.
- **Neutral / Draft**: Background `#FBF8F4`, border `1px solid #E8E2DA`, text `#6B645C`.
- **Success (Confirmed / RSVP'd)**: Background `rgba(47, 125, 91, 0.08)`, text `#2F7D5B`.
- **Warning (Pending / In Review)**: Background `rgba(183, 121, 31, 0.08)`, text `#B7791F`.
- **Danger (Declined / Overdue)**: Background `rgba(180, 35, 24, 0.08)`, text `#B42318`.

### Cards & Stat Panels
- **Stat Cards**: Surface `#FFFFFF`, border `1px solid #E8E2DA`, radius `14px`, padding `24px`. Key metric rendered in Newsreader 36px (`#1C1917`), secondary label in Inter 14px Regular (`#6B645C`).
- **Interactive Cards**: Maintain identical resting style; on hover apply `box-shadow: 0 4px 20px -2px rgba(28,25,23,0.04)` and border `#D6CECE`.

### Lists & Data Tables
- **Table Container**: Encased in a `14px` rounded white container with an outer `#E8E2DA` border.
- **Row Styling**: Height `56px`, horizontal divider `1px solid #E8E2DA`. Default row background `#FFFFFF`. Hover state `#FBF8F4`.
- **Selected State**: Background `#F4E8EC` with a left border accent of `3px solid #7A1F3D`.

### Navigation & Tabs
- **Sidebar Navigation**: Active navigation item uses Deep Maroon text (`#7A1F3D`) over a Soft Rose Tint pill/card background (`#F4E8EC`) with weight Inter Medium. Inactive items use `#6B645C`.
- **Underline Tabs**: Minimal borderless row with a `2px solid #7A1F3D` bottom active indicator; resting tabs use `#6B645C` with bottom border `transparent`.

### Iconography
- **Style**: Strict monoline minimalist icons, 1.5px consistent stroke width, 20px or 24px bounding box. Color matches adjacent text token (`#1C1917`, `#6B645C`, or `#7A1F3D`).

---

# Architectural Elegance & Pure Minimalism

## Brand & Style

This design system is anchored in architectural discipline, restraint, and classical proportion. It strips away extraneous visual noise to spotlight editorial clarity, spatial balance, and typographic dignity. 

### Design Philosophy
- **Restraint Over Decoration:** Surfaces rely on structural layout, crisp natural borders, and deliberate negative space rather than heavy layering or ornamental effects.
- **Editorial Intent:** Warm natural grounds paired with classical serif headlines evoke the timeless precision of high-end architectural monographs and curated exhibition catalogs.
- **Audience & Emotion:** Conceived for discerning professionals, patrons, and collectors who value poise, understated confidence, and frictionless functional legibility.

### Monogram Standard
The brand mark is a live typographic monogram composed of the letters **"LK"** set in *Newsreader* (or Fraunces styling), enclosed within a razor-thin circle (`border: 1px solid #E8E2DA`). It maintains optical centering with consistent internal clear space equal to the stroke width of the enclosing ring.

## Layout & Spacing

Layouts adhere to an absolute 8px vertical and horizontal grid cadence: `8px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`.

### Spatial Standards
- **Grid Architecture:** 12-column responsive layout with 32px (`2rem`) gutters on desktop, collapsing to 16px (`1rem`) on mobile viewports.
- **Section Rhythm:** Major page segments are spaced by an expansive 96px (`6rem`) cadence on desktop viewports to preserve editorial breathing room, shifting to 64px (`4rem`) on mobile devices.
- **Card Enclosures:** Standard card internal padding is fixed at 24px (`1.5rem`) evenly across all four edges.
- **Component Stack Spacing:** Sequential form groups and body text blocks maintain an orderly 16px or 24px separation.

## Elevation & Depth

Visual depth is achieved primarily through planar distinction and crisp boundary lines rather than heavy volumetric shadows.

### Elevation Principles
- **Atmospheric Floor:** Warm ivory (`#FBF8F4`) anchors the scene as the lowest planar level.
- **Card Planes:** White cards (`#FFFFFF`) sit directly atop the ivory field, separated by a crisp `1px solid #E8E2DA` boundary rule and an ultra-subtle contact occlusion: `0 1px 3px rgba(0, 0, 0, 0.04)`.
- **Modals & Overlays:** Elevated dialogs and detached menus inherit the same `1px solid #E8E2DA` outline, accompanied by a restrained soft dispersion: `0 12px 32px rgba(28, 25, 23, 0.06)`. Backdrops must utilize a muted ivory-tinted veil (`rgba(251, 248, 244, 0.8)`) with a gentle `backdrop-blur(4px)` to sustain focus without harsh visual disruption.
- **No Heavy Drop Shadows:** Deep black, multi-stop, or high-blur shadow stacks are prohibited.

## Components

Components follow strict visual economy, crisp stroke definitions, and measured typographic alignment.

### Buttons
- **Primary Button (Maximum 1 per screen):**
  - Surface: `#7A1F3D`
  - Text: `#FFFFFF`, `Inter 14px / 500`
  - Border: None
  - Radius: `10px`
  - Padding: `12px 20px`
  - States: Hover `#661A33`, Active `#54152A`, Focus Ring `2px offset 2px #7A1F3D`
- **Secondary Button:**
  - Surface: `#FFFFFF`
  - Text: `#1C1917`, `Inter 14px / 500`
  - Border: `1px solid #E8E2DA`
  - Radius: `10px`
  - Padding: `11px 19px`
  - States: Hover `#FBF8F4`, Active `#F4EFEA`
- **Ghost / Link Action:**
  - Surface: Transparent
  - Text: `#7A1F3D`, `Inter 14px / 500`
  - Radius: `10px`
  - Padding: `8px 12px`
  - States: Hover underline or soft ivory wash `#F4EFEA`

### Input Fields & Controls
- **Field Anatomy:** `#FFFFFF` background, `10px` radius, `1px solid #E8E2DA` border. Height: `44px`. Padding: `0 14px`.
- **Text:** Typed input `#1C1917`, placeholder `#A8A29E`.
- **Focus State:** 1px stroke `#7A1F3D` with outer focus ring: `0 0 0 3px rgba(122, 31, 61, 0.12)`.
- **Checkboxes & Radios:** `20px` dimension, `1.5px` border `#E8E2DA`. When active: `#7A1F3D` solid fill with white checkmark or inner dot.

### Badges & Status Chips
- Rendered exclusively with `rounded-full` curvature, height `24px`, padding `0 10px`, font size `13px / 500`.
- **Success:** `#ECFDF3` ground, `#027A48` label, `1px solid rgba(2, 122, 72, 0.2)`
- **Warning:** `#FEF0C7` ground, `#B54708` label, `1px solid rgba(181, 71, 8, 0.2)`
- **Critical:** `#FEF3F2` ground, `#B42318` label, `1px solid rgba(180, 35, 24, 0.2)`

### Cards & Structured Panels
- Background: `#FFFFFF`
- Border: `1px solid #E8E2DA`
- Corner Radius: `14px`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.04)`
- Padding: `24px` standard interior spacing.
- Header Treatment: When cards feature titles, separate with an optional 1px horizontal rule `#E8E2DA` or maintain clean 24px vertical space.

### Iconography
- Geometry: Bounding box fixed at `20px × 20px`.
- Stroke Width: Uniform `1.5px` hairline stroke, open outline style.
- Color Application: `#6B645C` for standard state; switches to `#7A1F3D` strictly when the parent control is active or focused.

### Monogram Component
- A circular element sized at `36px` or `44px` with a `1px solid #E8E2DA` border and `#FFFFFF` or `#FBF8F4` surface.
- Contains the live letters **"LK"** set in *Newsreader* (approx. 45% of circle diameter) colored in `#1C1917`, perfectly centered vertically and horizontally.