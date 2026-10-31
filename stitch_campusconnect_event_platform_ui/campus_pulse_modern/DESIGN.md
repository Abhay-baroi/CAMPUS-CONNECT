---
name: Campus Pulse Modern
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#474555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#787586'
  outline-variant: '#c8c4d8'
  surface-tint: '#5543df'
  primary: '#5442de'
  on-primary: '#ffffff'
  primary-container: '#6d5ef8'
  on-primary-container: '#ffffff'
  inverse-primary: '#c5c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#a63628'
  on-tertiary: '#ffffff'
  tertiary-container: '#c74e3e'
  on-tertiary-container: '#fffeff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c5c0ff'
  on-primary-fixed: '#140067'
  on-primary-fixed-variant: '#3c22c7'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad4'
  tertiary-fixed-dim: '#ffb4a8'
  on-tertiary-fixed: '#410000'
  on-tertiary-fixed-variant: '#872015'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  badge-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.5rem
  space-sm: 1rem
  space-md: 1.5rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system drives a vibrant, contemporary campus discovery and event management ecosystem. The interface balances high-density utility with energetic, student-centric optimism. The emotional signature is accessible, organized, and spontaneous—encouraging participation across campus life, club initiatives, academic conferences, and social mixers.

The aesthetic fuses **Modern Corporate** cleanliness with crisp, youthful micro-details:
- Pristine, high-contrast surfaces over slightly tinted canvases.
- High-contrast typography that commands immediate scanning.
- Precise interactive boundaries with crisp chips, pills, and event tags that feel tactile without visual clutter.
- Purposeful accent pops that clearly separate category tags, live engagement states, and ticket/registration milestones.

## Colors

The palette is engineered for vibrant student discovery against an ultra-clean foundation:

- **Primary Violet (`#6D5EF8`)**: Anchors primary calls to action (e.g., "RSVP", "Register", "Join Club"), key focus outlines, and active navigation indicators.
- **Secondary Emerald (`#10B981`)**: Dedicated to verified student states, confirmed tickets, active check-ins, and free-event callouts.
- **Tertiary Coral (`#F97360`)**: Handles urgency, sold-out alerts, live ongoing sessions, deadlines, and critical cancellations.
- **Neutral Primary Navy (`#111827`)**: Governs high-priority titles, headlines, and prominent card headers.
- **Neutral Secondary Slate (`#475569`)**: Carries event metadata (dates, times, locations, organizer handles) and helper text.
- **Surface Canvas (`#F8FAFC`)**: Provides a soft, glare-free backdrop, enabling pure white (`#FFFFFF`) card containers to float crisply.
- **Borders & Dividers (`#E2E8F0`)**: Hairline definitions to cleanly demarcate calendar slots, badges, and card boundaries without visual heaviness.

## Typography

The type system is powered entirely by Inter to ensure crisp rendering across web and native mobile displays.

- **Headlines & Titles**: Styled with tight tracking (`-0.02em` to `-0.01em`) and bold weights (`700` and `800`) to punch through image-heavy event thumbnails and hero sections.
- **Body Text**: Tuned for effortless readability in event overviews, speaker bios, and schedule timelines. Neutral Slate ensures long descriptions stay comfortable on the eyes.
- **Labels & Badges**: Set in semi-bold and bold weights with subtle positive letter spacing (`0.01em` to `0.04em`), keeping tags, category pills, and ticket count indicators instantly legible at small sizes.

## Layout & Spacing

The layout is grounded in a strict 8px increment spatial system (`8px`, `16px`, `24px`, `32px`, `48px`).

- **Grid Strategy**:
  - **Desktop (1024px+)**: 12-column responsive grid with `24px` (`1.5rem`) gutters and `32px` (`2rem`) outer margins. Max content container is capped at 1280px.
  - **Tablet (768px - 1023px)**: 8-column layout with `16px` gutters and `24px` margins. Event cards transition from 3-column rows to 2-column rows.
  - **Mobile (< 768px)**: 4-column layout with `16px` (`1rem`) gutters and `16px` (`1rem`) safe margins. Filter rails collapse into a sticky top bar or modal sheet.
- **Internal Spacing Rhythm**:
  - `space-xs` (8px): Icon-to-label gaps, chip inner padding, avatar group overlaps.
  - `space-sm` (16px): Input field inner padding, card micro-gaps, list item separations.
  - `space-md` (24px): Card container inner padding, category tag groups, modal content spacing.
  - `space-lg` (32px): Vertical margins between content widgets and sub-sections.
  - `space-xl` (48px): Section breaks between carousel discoveries, upcoming calendar blocks, and discovery feeds.

## Elevation & Depth

Visual hierarchy combines clean tonal surfaces, low-contrast structural outlines, and soft ambient drop shadows:

- **Base Layer (Level 0)**: Page background set to `#F8FAFC`.
- **Card & Sheet Surface (Level 1)**: Pure white (`#FFFFFF`) with a `1px` border of `#E2E8F0` and an ultra-soft ambient shadow: `0 1px 3px 0 rgba(17, 24, 39, 0.05), 0 1px 2px -1px rgba(17, 24, 39, 0.05)`.
- **Card Interactive / Hover (Level 2)**: Shifts slightly upward (`-2px` transform) with an expanded ambient shadow: `0 10px 15px -3px rgba(109, 94, 248, 0.08), 0 4px 6px -4px rgba(17, 24, 39, 0.05)` and a subtle primary border shift.
- **Overlays & Popovers (Level 3)**: Modals, filter menus, and date pickers use `0 20px 25px -5px rgba(17, 24, 39, 0.1), 0 8px 10px -6px rgba(17, 24, 39, 0.08)` anchored against a `rgba(17, 24, 39, 0.4)` backdrop blur overlay.

## Shapes

The design system maintains distinct radii tailored directly to component roles:

- **Cards & Modal Containers**: Standardized to `12px` (`0.75rem`), balancing modern structural framing with warm corner transitions.
- **Buttons & Form Controls**: Standardized to `8px` (`0.5rem`) for crisp, ergonomic click and tap affordances.
- **Chips, Badges, & Status Pills**: Fully rounded pill shapes (`9999px`) to emphasize categoric scanning and live markers.

## Components

### Buttons
- **Primary**: Solid Violet (`#6D5EF8`) fill, white text, 8px radius, `h-11` (44px) for desktop and mobile touch readiness. Focused with a 2px offset violet ring.
- **Secondary / Outline**: Transparent fill, 1px border (`#E2E8F0`), text Dark Navy (`#111827`). Hover transitions to `#F1F5F9`.
- **Destructive / Urgency**: Background light Coral tint (`rgba(249, 115, 96, 0.1)`), text Coral (`#F97360`), transitions to solid coral on high-impact cancellations.

### Cards (Events, Clubs, Bookmarks)
- 12px radius, pure white background, 1px `#E2E8F0` outline.
- Padding set to `24px` (`space-md`), holding a 16:9 aspect event thumbnail with 8px inner corner radii.
- Footer contains organizer avatar, RSVP counters, and inline primary action button.

### Chips, Pills, and Badges
- **Category Chips**: 9999px radius, 12px vertical/horizontal text padding, 32px height. Resting state: light slate background (`#F1F5F9`), text Slate (`#475569`). Selected state: solid Violet (`#6D5EF8`) with white text.
- **Status Badges**: 20px height, uppercase `badge-xs` typography. Emerald Green badge (`#10B981` tint) for "Free" or "Confirmed", Coral badge (`#F97360` tint) for "Filling Fast" or "Happening Now".

### Input Fields & Search
- Height `44px`, 8px radius, white fill, 1px `#CBD5E1` border.
- Text `14px` Dark Navy, placeholder in `#94A3B8`.
- Focus state: border color `#6D5EF8`, with a 3px ambient shadow ring in `rgba(109, 94, 248, 0.15)`. Leading icons (search glass, campus location pin) set in Slate.

### Selection Controls (Checkboxes & Radios)
- **Checkboxes**: 20px square with 4px border radius. Checked state fills with `#6D5EF8` and displays a crisp white check icon.
- **Radio Buttons**: 20px circular controls. Checked state shows a solid 6px white center within a `#6D5EF8` outer ring.

### Lists & Timelines
- Calendar schedule items use clean horizontal dividers (`#E2E8F0`).
- Left timestamp column uses bold Navy text paired with secondary Slate timezones; right content section nests inside an interactive hover row with an 8px radius.