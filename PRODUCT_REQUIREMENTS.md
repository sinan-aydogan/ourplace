# Vehicle Expense & Income Tracker - Product Requirements Document (PRD)

## Project Overview
A cross-platform mobile application (iOS, Android, Web) built with Expo, React Native, and Gluestack UI components for tracking vehicle expenses and income.

## Tech Stack
- **Framework**: Expo with React Native
- **UI Library**: Gluestack UI (use MCP tools to discover components)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: Tailwind CSS via NativeWind
- **Language**: TypeScript
- **State Management**: React hooks + Context API (or LegendApp Motion)
- **Database**: SQLite (expo-sqlite) for local storage
- **Internationalization**: i18n (react-i18next)

## Component Discovery
Use Gluestack MCP tools to explore and implement UI components:
- `get_all_components_metadata` - Browse available components
- `select_components` - Select components to use
- `get_selected_components_docs` - Get detailed documentation

All components are available in `/components/ui/` directory.

---

## Core Features

### 1. Multi-Vehicle Management

#### 1.1 Vehicle Limitations by Subscription
- **Free Tier**: 1 vehicle per type (car, truck, motorcycle, etc.)
- **Basic Plan**: Unlimited vehicles of all types

#### 1.2 Vehicle Brands
**Database Schema:**
```typescript
// Static brands table
brands {
  id: number (PK)
  name: string
  vehicle_type: enum ('car', 'truck', 'motorcycle', 'other')
}

// Vehicles table
vehicles {
  id: number (PK)
  user_id: number (FK)
  name: string
  brand_id: number | null (FK to brands)
  custom_brand_name: string | null
  model: string | null
  production_year: string | null
  license_plate: string | null
  fuel_type: enum ('gasoline', 'diesel', 'electric', 'hybrid', 'lpg')
  is_income_generating: boolean (default: false)
  purchase_date: date | null
  purchase_price: decimal | null
  purchase_currency: string (default: 'USD')
  sale_date: date | null
  sale_price: decimal | null
  sale_currency: string (default: 'USD')
  image_uri: string | null
  is_active: boolean (default: true)
  created_at: timestamp
  updated_at: timestamp
}
```

**Business Logic:**
- If user selects from predefined brands → `brand_id` is set
- If user enters custom brand → `custom_brand_name` is set
- Model and production_year are optional text fields

---

### 2. Transaction System

#### 2.1 Main Transaction Log
**Database Schema:**
```typescript
vehicle_transactions {
  id: number (PK)
  vehicle_id: number (FK)
  transaction_type: enum ('purchase', 'sale', 'expense', 'income')
  amount: decimal (required)
  currency: string (required, default: 'USD')
  expense_type_id: number | null (FK to expense_types)
  income_type_id: number | null (FK to income_types)
  description: string | null
  transaction_date: date (required)
  odometer_reading: number | null
  receipt_image_uri: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

**Purpose:**
- Central log for ALL vehicle-related financial transactions
- Used for generating reports and summaries
- Links to specific expense/income types when applicable

---

### 3. Expense Management

#### 3.1 Expense Types
**Database Schema:**
```typescript
expense_types {
  id: number (PK)
  name: string
  is_custom: boolean (default: false)
  user_id: number | null (FK - only for custom types)
  is_active: boolean (default: true)
  created_at: timestamp
}
```

**Default Expense Types (Free Tier):**
- Oil Change (Yağ Değişimi)
- Brake Pad Replacement (Balata Değişimi)
- Tire Replacement (Lastik Değişimi)
- Battery Replacement (Akü Değişimi)
- General Maintenance (Genel Bakım)
- Fuel (Yakıt)
- Insurance (Sigorta)
- Road Tax (MTV)
- Parking (Park Ücreti)
- Toll Fee (Köprü/Otoyol Ücreti)

**Custom Expense Types:**
- Requires **Basic Plan**
- User can add unlimited custom expense types
- Custom types are user-specific

#### 3.2 Expenses Table
**Database Schema:**
```typescript
expenses {
  id: number (PK)
  transaction_id: number (FK to vehicle_transactions)
  expense_type_id: number (FK to expense_types)
  notes: string | null
}
```

---

### 4. Income Management

#### 4.1 Income Types
**Database Schema:**
```typescript
income_types {
  id: number (PK)
  name: string
  is_custom: boolean (default: false)
  user_id: number | null (FK - only for custom types)
  is_active: boolean (default: true)
  created_at: timestamp
}
```

**Default Income Types (Free Tier):**
- Ride Service (Taşıma Hizmeti)
- Rental Income (Kiralama Geliri)
- Delivery Service (Teslimat Hizmeti)
- Taxi/Uber Service (Taksi/Uber)
- Other Service (Diğer Hizmet)

**Custom Income Types:**
- Requires **Basic Plan**
- User can add unlimited custom income types
- Custom types are user-specific

#### 4.2 Incomes Table
**Database Schema:**
```typescript
incomes {
  id: number (PK)
  transaction_id: number (FK to vehicle_transactions)
  income_type_id: number (FK to income_types)
  notes: string | null
}
```

**Business Logic:**
- Income tracking only available if vehicle settings `is_income_generating` = true
- Income forms only shown for income-generating vehicles

---

### 5. Vehicle Settings Page

**UI Components (Gluestack):**
- Form controls (Input, Select, Switch)
- Avatar component for vehicle image
- Button components
- Date pickers

**Fields:**
1. **Basic Info:**
   - Vehicle Name (Input)
   - License Plate (Input)
   - Brand (Select or Custom Input)
   - Model (Input - optional)
   - Production Year (Input - optional)

2. **Fuel Type (Enum):**
   - Gasoline
   - Diesel
   - Electric
   - Hybrid
   - LPG

3. **Income Settings:**
   - Is Income Generating? (Switch/Toggle)

4. **Purchase/Sale Info:**
   - Purchase Date (DatePicker)
   - Purchase Price (Input with currency selector)
   - Sale Date (DatePicker - optional)
   - Sale Price (Input with currency selector - optional)

5. **Vehicle Image:**
   - Avatar component
   - Click to upload/change image
   - Image picker integration

---

### 6. Home Page (Main Dashboard)

#### 6.1 Quick Fuel Expense Form
**UI Components:**
- Input fields (amount, date, odometer)
- Currency selector
- Submit button
- Auto-selects "Fuel" expense type

**Fields:**
- Amount (required)
- Currency (dropdown, default: USD)
- Date (default: today)
- Odometer Reading (optional)
- Notes (optional)

#### 6.2 Recent Transactions List
- Display last 5 transactions
- Show: date, type, amount, description
- "Load More" button at bottom
- Pagination for loading next 5 transactions

#### 6.3 Empty State
**When no vehicles exist:**
- Message: "Let's register your first vehicle!"
- "Add New Vehicle" button
- Navigates to vehicle creation page

#### 6.4 Vehicle Switcher
**UI Components:**
- Floating button (fixed position - left or right corner)
- Drawer/Sidebar (opens from left or right)
- Vehicle list with cards

**Behavior:**
- Button opens vehicle selection drawer
- Drawer displays all user vehicles
- Click on vehicle → sets as active vehicle
- Dashboard data updates for selected vehicle
- Drawer closes automatically

---

### 7. Statistics Page

#### 7.1 Time Period Selector
**UI Components (Gluestack):**
- Button Group for quick filters
- Select component for custom range
- Date Range Picker
- Button to generate report

**Quick Filters:**
- Daily
- Weekly
- Monthly
- Yearly
- Custom Range

**Behavior:**
- Default: Monthly report
- Select "Custom Range" → shows date range picker
- "Generate Report" button → fetches and displays data

#### 7.2 Report Formats (Separate Sub-pages)
**Phase 1: Monthly Report**
- Total expenses by category
- Total income (if applicable)
- Net profit/loss
- Expense breakdown chart
- Transaction timeline

**Phase 2+: Other Reports**
- Daily Report
- Weekly Report
- Yearly Report
- Custom Range Report

**Implementation Strategy:**
- Each report type = separate component/page
- Reusable chart components
- Modular data fetching hooks

---

### 8. App Settings Page

**Sections:**

#### 8.1 Language Settings
**Supported Languages:**
- Turkish (Türkçe)
- English
- German (Deutsch)
- French (Français)
- Bulgarian (Български)
- Italian (Italiano)

**Default:** Device language (if supported), otherwise English

#### 8.2 Theme Settings
**UI Components:**
- Switch/Toggle for Dark Mode
- Theme preview

**Themes:**
- Light Mode
- Dark Mode
- System Default (follows device theme)

#### 8.3 Subscription Information
**Display:**
- Current plan (Free/Basic)
- Plan features list
- Upgrade button (if on Free plan)
- Subscription renewal date (if on Basic plan)

---

## Subscription Plans

### Free Tier
✅ 1 vehicle per type
✅ Basic expense types (10 predefined)
✅ Basic income types (5 predefined)
✅ All reports
✅ Multi-language support
✅ Dark mode
❌ Custom expense types
❌ Custom income types
❌ Unlimited vehicles

### Basic Plan
✅ Everything in Free
✅ Unlimited vehicles (all types)
✅ Custom expense types (unlimited)
✅ Custom income types (unlimited)
✅ Priority support

---

## Database Schema Summary

```
users
├── vehicles (1:N)
│   ├── vehicle_transactions (1:N)
│   │   ├── expenses (1:1)
│   │   └── incomes (1:1)
│   
brands (static data)
expense_types (default + user custom)
income_types (default + user custom)
subscriptions
```

---

## Navigation Structure (Expo Router)

```
/app
├── index.tsx                    # Home/Dashboard
├── tabs/
│   ├── (tabs)/
│   │   ├── home.tsx            # Main dashboard
│   │   ├── statistics.tsx      # Statistics page
│   │   └── settings.tsx        # App settings
│   
├── vehicles/
│   ├── [id].tsx                # Vehicle details/settings
│   ├── create.tsx              # Add new vehicle
│   
├── transactions/
│   ├── create.tsx              # Add transaction (expense/income)
│   ├── [id].tsx                # Transaction details
│   
├── reports/
│   ├── daily.tsx
│   ├── weekly.tsx
│   ├── monthly.tsx
│   ├── yearly.tsx
│   └── custom.tsx
│   
└── subscription/
    └── index.tsx               # Subscription management
```

---

## Internationalization (i18n)

**Setup:**
- Use `react-i18next` or `expo-localization`
- JSON translation files per language
- Language files location: `/locales/{language}/translation.json`

**Translation Keys Structure:**
```json
{
  "common": {
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "cancel": "Cancel",
    "save": "Save"
  },
  "vehicles": {
    "title": "My Vehicles",
    "addNew": "Add New Vehicle",
    "brand": "Brand",
    "model": "Model"
  },
  "expenses": { ... },
  "incomes": { ... },
  "statistics": { ... },
  "settings": { ... }
}
```

**Default Language Logic:**
```typescript
// On app launch
const deviceLanguage = getDeviceLanguage(); // 'tr', 'en', 'de', etc.
const supportedLanguages = ['tr', 'en', 'de', 'fr', 'bg', 'it'];
const defaultLanguage = supportedLanguages.includes(deviceLanguage) 
  ? deviceLanguage 
  : 'en';
```

---

## Dark Mode Implementation

**Using Gluestack UI theming:**
- Light and dark color schemes defined in `/components/ui/gluestack-ui-provider/config.ts`
- Use system theme detection
- Persistent user preference in local storage
- Theme toggle in settings page

---

## Development Instructions

### 🎯 AI Development Guidelines

**ALL development MUST follow these principles:**

1. **Reference this PRD for every feature implementation**
   - Consult database schemas before creating/modifying tables
   - Follow UI component guidelines
   - Respect subscription tier limitations

2. **Use Gluestack MCP Tools:**
   ```
   - Discover components: get_all_components_metadata
   - Select needed components: select_components(['button', 'input', ...])
   - Get documentation: get_selected_components_docs(['button', ...])
   ```

3. **Component Discovery Workflow:**
   - Before building a screen, use MCP tools to find suitable Gluestack components
   - Always prefer Gluestack UI components over custom components
   - Reference `/components/ui/` for available components

4. **Database-First Approach:**
   - Implement database schema from this PRD before UI
   - Use TypeScript types matching database schema
   - Create migration files for schema changes

5. **Incremental Development:**
   - Build features in phases (as outlined in report sections)
   - Complete one feature fully before moving to next
   - Test each feature thoroughly

6. **Translation-Ready Code:**
   - Never hardcode text strings
   - Always use translation keys: `t('vehicles.addNew')`
   - Create translation keys for new features

7. **Subscription Enforcement:**
   - Check subscription tier before allowing actions
   - Show upgrade prompts for premium features
   - Gracefully handle tier limitations

8. **File Structure:**
   - Follow Expo Router conventions
   - Place reusable components in `/components`
   - Keep business logic in `/services` or `/hooks`

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Database schema setup (SQLite)
- [ ] User authentication (simple local user)
- [ ] Basic vehicle CRUD
- [ ] Home page with quick fuel form
- [ ] Recent transactions list

### Phase 2: Core Features
- [ ] Expense management (default types)
- [ ] Income management (default types)
- [ ] Vehicle settings page
- [ ] Vehicle switcher (drawer)

### Phase 3: Statistics & Reports
- [ ] Monthly report implementation
- [ ] Statistics page UI
- [ ] Chart components
- [ ] Data aggregation logic

### Phase 4: Localization & Theme
- [ ] i18n setup (6 languages)
- [ ] Dark mode implementation
- [ ] Settings page

### Phase 5: Subscription System
- [ ] Subscription tier enforcement
- [ ] Custom expense/income types (Basic plan)
- [ ] Unlimited vehicles (Basic plan)
- [ ] Upgrade flow UI

### Phase 6: Polish & Advanced Reports
- [ ] Daily/Weekly/Yearly reports
- [ ] Custom date range reports
- [ ] Image upload for vehicles
- [ ] Receipt image upload
- [ ] Performance optimization

---

## Key Business Rules

1. **Vehicle Type Limitation (Free):**
   ```typescript
   if (userPlan === 'free') {
     const vehicleCount = await getVehicleCountByType(vehicleType);
     if (vehicleCount >= 1) {
       showUpgradePrompt();
       return;
     }
   }
   ```

2. **Custom Type Creation (Basic Required):**
   ```typescript
   if (userPlan === 'free' && isCustomType) {
     showUpgradePrompt('Create custom types with Basic plan');
     return;
   }
   ```

3. **Transaction Type Logic:**
   ```typescript
   // When creating transaction:
   if (type === 'expense') {
     // Must link to expense_type_id
     // Create entry in expenses table
   } else if (type === 'income') {
     // Must link to income_type_id
     // Only if vehicle.is_income_generating === true
   }
   ```

4. **Brand Selection Logic:**
   ```typescript
   if (selectedBrand.id) {
     vehicle.brand_id = selectedBrand.id;
     vehicle.custom_brand_name = null;
   } else {
     vehicle.brand_id = null;
     vehicle.custom_brand_name = customBrandInput;
   }
   ```

---

## UI/UX Guidelines

1. **Use Gluestack Components:**
   - Button, Input, Select, Modal, Drawer, Avatar, Card, etc.
   - Maintain consistency across the app
   - Leverage built-in accessibility features

2. **Responsive Design:**
   - Mobile-first approach
   - Support both portrait and landscape
   - Tablet-friendly layouts

3. **Loading States:**
   - Show spinners for async operations
   - Skeleton screens for data loading
   - Optimistic UI updates where possible

4. **Error Handling:**
   - User-friendly error messages
   - Validation feedback
   - Toast notifications for success/error

5. **Empty States:**
   - Helpful messages with clear CTAs
   - Illustrations or icons
   - Guide users to first action

---

## Testing Strategy

1. **Unit Tests:**
   - Database operations
   - Business logic functions
   - Subscription tier checks

2. **Integration Tests:**
   - Transaction creation flow
   - Vehicle switching
   - Report generation

3. **E2E Tests:**
   - Complete user journeys
   - Multi-language support
   - Dark mode switching

---

## Performance Considerations

1. **Database Optimization:**
   - Index on frequently queried fields (vehicle_id, user_id, transaction_date)
   - Pagination for transaction lists
   - Lazy loading for reports

2. **Image Handling:**
   - Compress images before storage
   - Use thumbnails for lists
   - Cache images appropriately

3. **State Management:**
   - Context API for global state (selected vehicle, theme, language)
   - Local state for component-specific data
   - Minimize re-renders

---

## Security Considerations

1. **Data Protection:**
   - Local SQLite database encryption (optional)
   - Secure image storage
   - No sensitive data in logs

2. **Input Validation:**
   - Sanitize all user inputs
   - Validate amounts and dates
   - Prevent SQL injection

---

## Future Enhancements (Post-MVP)

- Cloud backup/sync
- Multi-user support (family sharing)
- Export reports (PDF, CSV)
- Budget planning features
- Maintenance reminders based on date/odometer
- Fuel efficiency tracking
- Insurance expiry notifications
- OCR for receipt scanning

---

## Appendix: Common Queries

### Get Monthly Expenses for Vehicle
```sql
SELECT 
  et.name as expense_type,
  SUM(vt.amount) as total_amount,
  vt.currency,
  COUNT(*) as transaction_count
FROM vehicle_transactions vt
JOIN expenses e ON e.transaction_id = vt.id
JOIN expense_types et ON et.id = e.expense_type_id
WHERE vt.vehicle_id = ? 
  AND vt.transaction_type = 'expense'
  AND strftime('%Y-%m', vt.transaction_date) = ?
GROUP BY et.id, vt.currency
ORDER BY total_amount DESC;
```

### Get Net Profit/Loss for Period
```sql
SELECT 
  SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
  (SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) - 
   SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END)) as net_profit
FROM vehicle_transactions
WHERE vehicle_id = ?
  AND transaction_date BETWEEN ? AND ?
  AND currency = ?;
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-02  
**Status:** Ready for Development

---

## Quick Start for AI Agent

When starting a new development task:

1. ✅ Read relevant section of this PRD
2. ✅ Use Gluestack MCP to discover needed UI components
3. ✅ Check database schema for data requirements
4. ✅ Verify subscription tier requirements
5. ✅ Implement with TypeScript + i18n support
6. ✅ Test with both light/dark themes
7. ✅ Update this PRD if requirements change

**Remember:** This document is the single source of truth for the application architecture and requirements.
