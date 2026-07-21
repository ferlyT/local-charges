# Design System

This document outlines the core design system used in the application.

## Styling Framework
We use **TailwindCSS** for all styling, with Dark Mode support via the `class` strategy.

## Color Palette
Colors are defined using CSS variables in `index.css` and mapped in `tailwind.config.js`. Do not use arbitrary colors (e.g., `text-[#123456]`), always use the semantic tokens.

- **`primary`**: Main text color and prominent UI elements.
- **`secondary`**: Subdued text, borders, and secondary buttons.
- **`tertiary`**: The primary brand accent color (often used for primary buttons and active states).
- **`neutral`**: Backgrounds for cards, table headers, and alternating rows.
- **`surface`**: Main background color (white in light mode, dark in dark mode).

## Typography
Fonts are configured in Tailwind:
- **`font-sans`** (`Inter`): Default font for body text, UI elements, and tables.
- **`font-display`** (`Instrument Serif`): Used exclusively for large headers and welcome banners.
- **`font-mono`** (`JetBrains Mono`): Used for numbers, form IDs, and technical data to ensure vertical alignment.

## Core UI Components
Instead of rewriting Tailwind classes, use the shared utility classes (typically defined in `index.css`):
- **Buttons**:
  - `.btn-primary`: For main actions (uses `tertiary` color).
  - `.btn-secondary`: For secondary or cancel actions.
- **Cards**:
  - `.card`: Standard container with border, background, and shadow.
- **Badges**:
  - Used for status indicators.
  - Success: `bg-emerald-500/10 text-emerald-600 border-emerald-500/25`
  - Warning/Partial: `bg-amber-500/10 text-amber-600 border-amber-500/25`
  - Danger/Error: `bg-rose-500/10 text-rose-600 border-rose-500/25`
  - Draft: `.badge-draft`
  - Done: `.badge-done`

## Icons
Use **`lucide-react`** for all icons. Standard sizes are `16`, `18`, or `24`.
If there's a naming conflict with a component (e.g., `History` or `Upload`), rename the icon in the import:
`import { History as HistoryIcon } from "lucide-react";`
