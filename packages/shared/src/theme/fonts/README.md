Central font entry point for web and console.

Purpose:
- Keep font-family naming centralized in `@pocketdev/shared/theme`
- Let web and console share the same CSS variable setup
- Allow the real PocketDev display font to be added later without changing app code

Current state:
- `web-fonts.ts` exports shared fallback stacks and a small `applyWebFontTheme()` helper
- Web and console can use the shared CSS variables now, even before the licensed display font file is bundled

When the final display font is ready:
1. Add the web-safe asset(s) somewhere versioned in the repo, likely under an app public directory or a shared published asset location.
2. Register it with `@font-face` in the consuming app.
3. Keep the family name aligned with `fontFamilyTokens.display` (`PocketDevBauhausDisplay`) so existing usage keeps working.
