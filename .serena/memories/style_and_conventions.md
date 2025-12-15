# Style & Conventions
- Language: TypeScript across Expo/React Native + web; follow Expo Router file naming; reuse components in /components and Gluestack UI kit under /components/ui.
- UI/UX: Prefer Gluestack components; MultiSelect must come from react-native-element-dropdown; keep styling via NativeWind/Tailwind variants; support light/dark themes from gluestack provider config; responsive mobile-first.
- i18n: Never hardcode user-facing strings; use react-i18next keys (t('...')); add translation entries in /locales/{lang}/ translation files; default language derived from device with fallback to en.
- Data: Follow PRD schemas exactly; transaction_type dictates linked tables; enforce subscription limits (vehicle count per type, custom categories only on Basic); income forms only when is_income_generating.
- Workflow: Database-first; incremental features by phase; component discovery via Gluestack MCP tools; prefer reusable hooks/services for business logic; context for global state (vehicle, theme, language, subscription).
- Testing/quality: No eslint/prettier configs present—default TS/React Native style; use jest-expo for tests; keep ASCII in new edits unless file already uses Unicode.
