---
name: AM Educational Platform
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727786'
  outline-variant: '#c2c6d7'
  surface-tint: '#0058c9'
  primary: '#0057c6'
  on-primary: '#ffffff'
  primary-container: '#006ef7'
  on-primary-container: '#fffdff'
  inverse-primary: '#b0c6ff'
  secondary: '#a14000'
  on-secondary: '#ffffff'
  secondary-container: '#fe6b08'
  on-secondary-container: '#571f00'
  tertiary: '#5c5c5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#757575'
  on-tertiary-container: '#fdfdfd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#00429a'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#ffb694'
  on-secondary-fixed: '#351000'
  on-secondary-fixed-variant: '#7b2f00'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: beVietnamPro
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: beVietnamPro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: beVietnamPro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: beVietnamPro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: ibmPlexSans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: ibmPlexSans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  code-sm:
    fontFamily: geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for a high-performance, interactive programming education environment. It balances the rigorous, structured utility of a modern Integrated Development Environment (IDE) with the approachable, welcoming atmosphere of a premium learning platform. 

The aesthetic is **Corporate Modern** with a focus on **Interactive Precision**. It utilizes a clean, high-contrast interface to reduce cognitive load during complex coding tasks. The design evokes a sense of technical mastery and progress, utilizing white space to frame dense technical content and vibrant accents to signal milestones and calls to action. The system is built from the ground up for full Right-to-Left (RTL) compatibility, ensuring a native experience for Arabic-speaking developers.

## Colors
The palette is centered on a high-energy **Vibrant Tech Blue** as the primary brand driver, symbolizing trust and logic. An **Energetic Orange** is reserved strictly for high-priority conversion points and interactive highlights, creating a clear visual path for the user.

- **Surface Tiers**: Use `#FFFFFF` for primary cards and workspace areas. Use `#F8FAFC` (Slate) for global backgrounds and `#EFF6FF` (Blue Tint) to distinguish sidebar navigation or secondary IDE panels.
- **Typography**: Primary content is set in absolute `#000000` for maximum legibility. Secondary meta-data and labels use a Dark Slate shade to maintain hierarchy without sacrificing clarity.
- **Semantic Accents**: Use the primary blue for progress indicators and the accent orange for "Run Code" buttons or celebratory achievement badges.

## Typography
The typography system prioritizes technical legibility and modern character. **Be Vietnam Pro** is used for headlines to provide a friendly yet contemporary feel. **IBM Plex Sans** is utilized for body text for its high readability in educational contexts. For the IDE and technical labels, **Geist** is employed to provide a precise, developer-centric monospaced feel.

In RTL contexts, the system swaps to high-quality Arabic sans-serif equivalents that maintain the same weight and x-height characteristics. Line heights are slightly increased (approx 10-15%) for Arabic script to accommodate deeper descenders and avoid crowding.

## Layout & Spacing
The layout follows a **Fluid Grid** model with strict 12-column alignment for dashboard views and a specialized **Workspace Layout** for coding lessons.

- **The Workspace**: A three-pane layout (Instruction / Editor / Output). In RTL, the instruction panel is pinned to the right, the editor in the center, and the output/console on the left.
- **Rhythm**: All spacing is derived from a 4px base unit. Component internal padding should favor `16px` (4 units) or `24px` (6 units) to maintain a sense of openness.
- **Breakpoints**: 
    - **Mobile (<768px)**: Single column, 16px margins, hidden sidebars behind a drawer.
    - **Tablet (768px - 1024px)**: 8-column grid, 24px margins.
    - **Desktop (>1024px)**: 12-column grid, 48px margins, max-width of 1440px for centered content.

## Elevation & Depth
This design system uses a combination of **Tonal Layering** and **Ambient Shadows** to define the hierarchy of the educational environment.

- **Level 0 (Background)**: `#F8FAFC` or `#EFF6FF`.
- **Level 1 (Cards/Workspaces)**: White `#FFFFFF` with a subtle 1px border in `#E2E8F0`.
- **Level 2 (Interactive Elements)**: Buttons and active cards use a soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`.
- **Level 3 (Overlays/Modals)**: High elevation with a larger blur radius and 15% opacity black shadow to pull the user's focus during quizzes or code submissions.

## Shapes
The shape language is characterized by **Generous Rounding**. This softens the "technical" edge of a coding platform, making it feel more like a modern learning tool and less like a legacy software application.

- **Standard Elements**: Buttons and input fields use `0.5rem` (rounded).
- **Containers**: Course cards and IDE panels use `1rem` (rounded-lg).
- **Large Sections**: Hero areas and modal containers use `1.5rem` (rounded-xl) to emphasize a premium, custom-built feel.

## Components
- **Buttons**: Primary buttons are solid Tech Blue with white text. CTA buttons (e.g., "Unlock Pro", "Submit Code") use the Energetic Orange. Both feature a subtle lift effect on hover.
- **IDE Panels**: Use a dark mode variant for the code editor specifically (to reduce eye strain), wrapped in a light-mode container. Use rounded-lg corners for the editor frame.
- **Progress Chips**: Small, pill-shaped badges using light tints of blue or green to indicate lesson status (Completed, In Progress).
- **Input Fields**: Clean white backgrounds with 1px slate borders. Focus states use a 2px Tech Blue ring with a subtle glow.
- **Code Snippets**: Inline code uses a subtle grey background with `geist` font.
- **Cards**: Feature a "hover-climb" effect where the card moves 4px upward and the shadow deepens when the user interacts with a lesson tile.