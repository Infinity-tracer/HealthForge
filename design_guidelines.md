# Health Records Management System (HRMS) Design Guidelines

## Design Approach
**Futuristic Medical Interface** with glassmorphism and neumorphic design patterns, emphasizing security, clarity, and modern healthcare aesthetics.

## Core Design Principles
1. **Trust & Security**: Visual cues that emphasize data protection and biometric authentication
2. **Clinical Clarity**: Clean hierarchy for medical data with clear visual separation
3. **Futuristic Minimalism**: Glass-style UI with subtle depth and sophisticated transitions
4. **Role Distinction**: Visual differentiation between Doctor and Patient interfaces

## Typography System
- **Headings**: Inter or Poppins (600-700 weight) for dashboard titles and section headers
- **Body**: Inter or System UI (400-500 weight) for forms, tables, and content
- **Data/Medical Info**: JetBrains Mono or Roboto Mono (500 weight) for medical IDs, license numbers, measurements
- **Sizes**: text-3xl for page titles, text-xl for section headers, text-base for body, text-sm for labels

## Layout & Spacing
**Spacing Units**: Consistently use Tailwind units of 4, 6, 8, 12, 16 (p-4, gap-6, mb-8, etc.)
- Dashboard layouts: Two-column grid with fixed sidebar (w-64) and fluid main area
- Card spacing: p-6 for content, gap-4 between elements
- Form fields: space-y-4 for vertical stacking
- Section padding: py-12 for major sections, py-6 for subsections

## Component Library

### Authentication Components
**Login Cards**: Glassmorphic cards (backdrop-blur-xl, bg-white/10, border border-white/20) with role-specific color accents
- Patient login: Biometric scanner visual (circular gradient animation, fingerprint icon center)
- Doctor login: Professional form layout with license ID field prominence
- PIN input: 6-digit individual boxes with neumorphic depth

### Dashboard Layouts
**Sidebar Navigation**: Fixed left sidebar with:
- Profile section at top with avatar and role badge
- Navigation items with icons (Lucide-react)
- Hover states with subtle glow effects
- Active state with gradient background

**Main Content Area**: 
- Grid layout for cards (grid-cols-1 lg:grid-cols-2 xl:grid-cols-3)
- Card components with glassmorphic styling
- Data tables with sticky headers and alternating row treatments

### Form Components
**Input Fields**: Neumorphic style with:
- Inset shadow effect (shadow-inner)
- Rounded corners (rounded-lg)
- Focus states with glowing border (ring-2 ring-blue-400/50)
- Inline validation icons and error messages

**File Upload**: Drag-and-drop zone with:
- Dashed border animation on hover
- File preview cards with thumbnails
- Progress indicators for upload simulation
- 10MB limit indicator with file type badges

### Data Visualization
**Timeline Chart**: Vertical timeline for medical history with:
- Connected dots showing measurement dates
- Data cards expanding from timeline points
- Color-coded by disease/category
- Gradient connections between events

**Patient Table**: Filterable/searchable with:
- Quick action buttons per row (View History, Contact)
- Status pills (Active, Pending, Archived)
- Expandable rows for detailed view

### Specialized Components
**Fingerprint Scanner**: 
- Large circular button (w-48 h-48) with pulsing ring animation
- Fingerprint SVG icon from Lucide-react
- Loading state with rotating gradient
- Success checkmark with scale-in animation

**Consent Cards**:
- Permission toggles (READ/WRITE/SHARE) with switch components
- Date range pickers with calendar popup
- Doctor selector with searchable dropdown
- Active consent list with revoke buttons

**Medical Report Cards**:
- Disease name as header with category icon
- Attribute pills showing key values (Insulin: 45 mg/dL)
- Upload date and status badge
- Expandable detail section

## Animations & Interactions
**Transitions**: Use smooth, medical-grade precision
- Page transitions: fade-in with slight upward motion (duration-300)
- Card loading: staggered entrance (delay-75, delay-150)
- Button clicks: subtle scale (scale-95 on active)
- Toast notifications: slide-in from top-right

**Micro-interactions**:
- Fingerprint scan: 2-second pulse + rotation on click
- Form validation: shake animation on error
- File upload: progress bar with percentage
- Data refresh: subtle spinner in corner

## Visual Treatments
**Glassmorphism**: 
- Background: bg-white/10 dark:bg-gray-800/10
- Backdrop filter: backdrop-blur-xl
- Borders: border border-white/20
- Shadows: shadow-2xl

**Neumorphism** (for interactive elements):
- Light source top-left
- Dual shadows (inset for pressed state)
- Subtle gradients for depth

**Color Accents** (applied to borders, icons, badges - NOT backgrounds):
- Doctor role: Blue tones for professional trust
- Patient role: Teal/cyan for healthcare calm
- Success states: Green
- Warning/Pending: Amber
- Error: Red

## Responsive Behavior
- **Mobile (< 768px)**: Single column, bottom navigation, collapsible sidebar
- **Tablet (768px - 1024px)**: Two-column grids, side drawer navigation
- **Desktop (> 1024px)**: Full dashboard layout with persistent sidebar

## Toast Notifications
Position: top-right with slide-in animation
- Upload success: Green checkmark icon
- Scan complete: Blue fingerprint icon
- Consent granted: Purple handshake icon
- Error states: Red alert icon
Duration: 4 seconds with progress bar

## Icons
**Library**: Lucide-react exclusively
- Navigation: Home, User, Upload, FileText, Settings
- Medical: Activity, Pill, Syringe, Heart, Brain
- Actions: Search, Filter, Download, Eye, Edit, Trash2
- Biometric: Fingerprint, Lock, Shield, Key

## Images
**Landing Page Hero**: Large medical technology image showing digital health interface or futuristic hospital setting with semi-transparent overlay (bg-gradient-to-r from-blue-900/90 to-purple-900/90). Buttons on hero should have backdrop-blur-md backgrounds.

**Dashboard Avatars**: Circular user photos with medical role badges (stethoscope icon for doctors, patient ID for patients)

**Report Thumbnails**: PDF/image preview cards in upload history

No decorative background images in dashboards - maintain clean, data-focused interface.