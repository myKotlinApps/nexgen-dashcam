// NexGen DashCam — Design System Overview
//
// This design system follows the best practices from:
// - Expo Skills (expo/skills)
// - Figma Implement Design (openai/skills)
// - Android Jetpack Compose Theming (android/skills)
//
// Visual theme: Fluent 2 / SharePoint Web UI Kit inspired
// ─────────────────────────────────────────────
// The palette below approximates Microsoft's public Fluent 2 design
// language (the system the SharePoint Web UI Kit Figma community file is
// built on: figma.com/community/file/1260359051156407926). Exact Figma
// Variables from that file could not be extracted because the connected
// Figma MCP server only exposes FigJam/diagram tools (get_figjam,
// generate_diagram, whoami, create_new_file), not design-file reading
// tools. If pixel-accurate tokens from the kit itself are needed later,
// reconnect Figma with Dev Mode access and re-derive this palette from
// its actual Variables collection.
//
// Principles:
// 1. Design tokens over hardcoded values
// 2. Component reuse before recreation (DRY)
// 3. WCAG AA accessibility compliance
// 4. Pixel-consistent dark mode
// 5. RTL-first Persian layout with Latin fallback
//
// Core Typeface: Vazirmatn (SIL OFL 1.1) — kept instead of Segoe UI
// (Fluent's default), which is Windows-only and unlicensed for Android/
// iOS/web distribution.
// Latin Fallback: Inter (SIL OFL 1.1)
// Monospace: SpaceMono (SIL OFL 1.1)

// Color Palette (Fluent 2 dark neutral ramp + Communication Blue accent)
// ─────────────────────────────────────────────
// Background:   #1B1A19 (Fluent neutral background, darkest)
// Surface:      #292827 (Fluent neutral background 3)
// Surface Alt:  #252423
// Border:       #3B3A39 (Fluent neutral stroke, dark)
// Text Primary: #F3F2F1 (Fluent neutral foreground, dark theme)
// Text Second:  #979593
// Accent:       #0078D4 (Fluent Communication Blue, "Blue Primary")
// Accent Hover: #106EBE (Blue Shade 10)
// Accent Light: #479EF5 (Blue Tint 10, used for icons/accents on dark bg)
// Destructive:  #D13438 (Fluent semantic red)
// Success:      #107C10 (Fluent semantic green)
// Warning:      #FFB900 (Fluent semantic gold)
//
// Spacing: 4px base grid (4,8,12,16,20,24,32,40,48)
// Radius:  4,8,12,16,20,9999 (Fluent 2 corner-radius scale)
// Type:    10,12,14,16,20,24,28,40 (Fluent Caption/Body/Subtitle/Title ramp)

// Usage in components:
// import { Colors, Spacing, Radius, Typography } from "@nexgen/ui"
