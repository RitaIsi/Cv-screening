---
version: alpha
name: Unify GTM
description: Editorial, high-contrast marketing system with a warm ivory canvas, bold serif headlines, and a single vivid orange accent.
colors:
  primary: "#FE3C01"
  secondary: "#241E20"
  tertiary: "#E5E7EB"
  neutral: "#FFFFF9"
  surface: "#FFFFFF"
  on-surface: "#241E20"
  muted: "#6B6466"
  border: "#E5E7EB"
  error: "#D92D20"
typography:
  headline-display:
    fontFamily: Feature Text
    fontSize: 90px
    fontWeight: 700
    lineHeight: 90px
    letterSpacing: -3.6px
  headline-lg:
    fontFamily: Feature Text
    fontSize: 62px
    fontWeight: 400
    lineHeight: 74px
    letterSpacing: -1.2px
  headline-md:
    fontFamily: Feature Text
    fontSize: 42px
    fontWeight: 400
    lineHeight: 72px
    letterSpacing: -2.88px
  headline-sm:
    fontFamily: Saans
    fontSize: 29px
    fontWeight: 400
    lineHeight: 35px
    letterSpacing: 0px
  body-lg:
    fontFamily: Saans
    fontSize: 20px
    fontWeight: 400
    lineHeight: 30px
    letterSpacing: -0.2px
  body-md:
    fontFamily: Saans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: -0.1px
  body-sm:
    fontFamily: Saans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: -0.1px
  label-lg:
    fontFamily: Saans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: Saans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: Saans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.02em
  nav-item:
    fontFamily: Saans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 5px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 120px
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 15px 10px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 15px 10px
    height: 44px
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 15px 10px
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 15px 10px
    height: 44px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 8px
---

# Unify GTM

## Overview
This system feels like an elevated B2B marketing site with an editorial point of view. The tone is confident, polished, and slightly theatrical: large serif headlines, a warm ivory background, and a single punchy orange accent create immediate focus without feeling noisy. The layout is spacious and centered, designed for premium brand storytelling rather than dense product documentation.

## Colors
- **Primary (#FE3C01):** A vivid ember-orange used sparingly for emphasis, headline highlights, and attention-grabbing moments. It gives the page energy against the otherwise restrained palette.
- **Secondary (#241E20):** A deep espresso ink used for the main text, strong buttons, and dark UI chrome. It provides the majority of contrast in the interface.
- **Neutral (#FFFFF9):** A warm ivory background that softens the composition and avoids the starkness of pure white.
- **Surface (#FFFFFF):** Clean white for floating panels, forms, and card-like UI surfaces when a brighter layer is needed.
- **Tertiary (#E5E7EB):** A light neutral border and divider color used for subtle separation without heavy framing.
- **On-surface (#241E20):** The primary content color on white or ivory surfaces; visually identical to the main ink for consistency.
- **Muted (#6B6466):** A softer supporting text color for secondary copy, placeholder text, and less prominent labels.
- **Border (#E5E7EB):** A minimal, cool-neutral stroke for cards and controls that should remain understated.
- **Error (#D92D20):** Reserved for destructive or validation states; it should remain uncommon to preserve the brand’s controlled use of color.

## Typography
Feature Text is the display face and defines the brand voice. It is used for large editorial headlines with dramatic negative tracking, especially the hero treatment where the letters feel tall, refined, and intentionally compressed. Saans is the utility face for navigation, body copy, labels, and controls; it is clean, modern, and highly readable at smaller sizes.

Headlines should feel expressive and spacious, with the largest sizes reserved for campaign statements and page-level messaging. Body copy should stay calm and legible, using 16px to 20px text with comfortable line heights. Labels and navigation items use medium weight rather than bold, which keeps the interface sophisticated instead of overbearing.

Uppercase is not a dominant convention here; the system relies more on size, spacing, and contrast than on all-caps styling. Letter spacing is generally tight in display text and neutral in utility text, reinforcing the editorial look.

## Layout
The page uses a centered, fixed-max-width content column with generous side gutters and large vertical breathing room. Section spacing is intentionally expansive, with the 120px scale used for major page gaps and 40px/24px rhythm for intra-section separation. The composition favors a clear top-to-bottom hierarchy rather than a dense grid.

Use the spacing scale consistently: 8px for fine adjustments, 16px for component padding, 24px for grouped content, and 40px or more for section breaks. Cards and floating overlays should keep internal padding at 16px or slightly above, while hero containers and major marketing blocks should remain visually open.

## Elevation & Depth
The system is mostly flat and relies on contrast, whitespace, and layering rather than heavy shadow. Depth appears through tonal separation: dark navigation bars, light cards, and white overlays placed over imagery. When shadow is used, it is subtle and soft, never glossy or floating too far above the page.

Borders are minimal and often more important than shadows for defining interactive areas. The overall effect is calm and premium, with structure created by alignment and color blocking instead of pronounced elevation.

## Shapes
The shape language is gently rounded and pragmatic. Buttons use small radii around 4px to 5px, while cards and inputs can step up to 8px for a more approachable surface feel. The full-radius pill shape is appropriate for chips, badges, and highly compact UI.

Overall, the system feels slightly soft rather than rigid, but it avoids overly friendly curves. Corners should stay modest so the typography and imagery remain the visual focus.

## Components
Buttons are the clearest interactive pattern in the system. Primary buttons use the dark ink background with ivory text, medium weight labels, and a minimum height of 44px; they should feel decisive and high-contrast. Secondary buttons should be transparent or light-filled with a dark border and dark text, keeping the same height and similar padding for consistent alignment. Link-style buttons should remove borders and padding entirely and behave like quiet text actions.

Cards should use the neutral or white surface, a thin border, and rounded corners around 8px. Keep card padding modest at 16px so content breathes without feeling oversized. Cards should not rely on shadow for separation; instead, use surface contrast and border color.

Inputs and text-entry surfaces should feel like clean white panels with subtle borders and generous internal padding. Placeholder text should use the muted color rather than the primary ink. If an input contains a CTA icon or affordance, keep it visually restrained and aligned to the right edge.

Nav items and utility links should use Saans at 16px with medium weight, matching the button typography. Chips and badges should be compact pills with full rounding and very light surfaces so they support, not compete with, the main story.

## Do's and Don'ts
- Do use Feature Text only for large editorial headlines and campaign messaging.
- Do keep the palette restrained, with the orange accent used as a highlight rather than a fill color everywhere.
- Do preserve generous whitespace around hero sections and major calls to action.
- Do keep buttons at a consistent 44px minimum height for comfortable interaction.
- Don't introduce heavy shadows, glossy effects, or glassmorphism.
- Don't use multiple competing accent colors; the system should feel intentionally limited.
- Don't over-round corners on core UI; the interface should remain crisp and premium.
- Don't set body copy in the display serif; use Saans for readability.