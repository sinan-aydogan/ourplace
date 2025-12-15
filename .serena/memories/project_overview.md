# Project Overview
- Purpose: Cross-platform (iOS/Android/Web) vehicle expense & income tracker built with Expo + React Native, with SQLite storage and Gluestack UI.
- Key features: multi-vehicle management with subscription limits (Free: 1 vehicle per type; Basic: unlimited + custom types), central transaction log, expense/income categories (default + custom for Basic), reports (monthly first), quick fuel form, vehicle switcher drawer, settings (language, theme, subscription info), dark mode, image upload (later), receipt images (later).
- Architecture: Expo Router file-based navigation (tabs for home/statistics/settings, vehicles create/detail, transactions create/detail, reports per period, subscription page); Context API for global state (plan, active vehicle, theme/lang); database-first approach with SQLite per PRD schemas (vehicles, brands static, vehicle_transactions plus expenses/incomes detail tables, expense_types/income_types default+custom); i18n with /locales/{lang}/translation.json.
- UI: Gluestack UI components from /components/ui; MultiSelect must use react-native-element-dropdown; styling via NativeWind/Tailwind variants.
- Plans: Free vs Basic as above; upgrade prompt for restricted actions; income entry only when vehicle.is_income_generating.
- Status: PRD v1.1 (2025-12-08) is single source of truth; follow incremental phases Foundation → Core → Reports → Localization/Theme → Subscription → Polish.
- Repo signals: package-lock.json → npm preferred; no eslint/prettier configs found; jest-expo testing preset.
