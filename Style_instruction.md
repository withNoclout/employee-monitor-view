# Style Instruction for AlignWhat Project

This document serves as a guide for maintaining the design system and coding standards of the AlignWhat Project. Please follow these instructions when creating new components or features to ensure consistency.

## 1. Technology Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Library**: Shadcn/UI (Radix UI primitives)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query)
- **Animation**: Framer Motion

## 2. File Structure & Aliases

- **Components**: Place reusable feature components in `src/components`.
  - Alias: `@/components`
- **UI Primitives**: Shadcn/UI components reside in `src/components/ui`.
  - Alias: `@/components/ui`
- **Pages**: Route components reside in `src/pages`.
- **Utils**: Utility functions reside in `src/lib`.
  - Alias: `@/lib`
  - Use `cn()` from `@/lib/utils` for conditional class merging.
- **Hooks**: Custom hooks reside in `src/hooks`.
  - Alias: `@/hooks`
- **Contexts**: Context providers reside in `src/contexts`.
  - Alias: `@/contexts`

## 3. Design System - Professional Industrial Aesthetic

### Color Palette
The AlignWhat Project uses a professional industrial color palette with deep blues, grays, and electric blue accents. **CRITICAL**: All colors MUST be HSL values and use semantic tokens defined in `src/index.css` and `tailwind.config.ts`.

**DO NOT hardcode colors directly in components. ALWAYS use semantic tokens:**

- **Primary**: `bg-primary`, `text-primary-foreground` (Electric blue accents)
- **Secondary**: `bg-secondary`, `text-secondary-foreground` (Subtle gray)
- **Accent**: `bg-accent`, `text-accent-foreground` (Highlight color)
- **Muted**: `bg-muted`, `text-muted-foreground` (Subdued backgrounds)
- **Background**: `bg-background`, `text-foreground` (Main surface)
- **Card**: `bg-card`, `text-card-foreground` (Panel backgrounds)
- **Border**: `border-border` (Consistent borders)
- **Success**: `bg-success`, `text-success-foreground` (Success states)
- **Warning**: `bg-warning`, `text-warning-foreground` (Warning states)
- **Danger**: `bg-danger`, `text-danger-foreground` (Error/danger states)
- **Destructive**: `bg-destructive`, `text-destructive-foreground` (Destructive actions)

### Typography
- **Primary Font**: `Inter` (sans-serif) for all UI text
- **Monospace Font**: `JetBrains Mono` for code, data, and technical displays
- Use Tailwind's typography utilities: `text-xs`, `text-sm`, `text-base`, `text-lg`, etc.
- Use `font-bold`, `font-semibold` for emphasis
- Use `tracking-tight`, `tracking-wide`, `tracking-widest` for visual hierarchy
- Use `uppercase` for labels, section headers, and technical indicators

### Visual Effects & Styling

#### Glass Morphism
Use the `.glass-effect` utility class for modern frosted glass appearance:
```tsx
<div className="glass-effect">
  // Content
</div>
```

#### Industrial Shadows
- `.shadow-industrial` - Standard industrial shadow
- `.shadow-industrial-lg` - Larger industrial shadow for prominent elements
- `.shadow-glow` - Subtle glow effect for emphasis

#### Tech Borders
- `.border-tech` - Gradient border effect for technical aesthetic
- Use `border-border/40` for subtle borders
- Use `border-border` for standard borders

#### Background Patterns
- `.bg-industrial-grid` - Subtle grid background pattern
- `.gradient-primary` - Primary gradient background
- `.gradient-success` - Success gradient background
- `.gradient-warning` - Warning gradient background
- `.gradient-danger` - Danger gradient background
- `.gradient-industrial` - Industrial gradient background

#### Animations
- `.animate-pulse-slow` - Slow pulse animation
- `.animate-fade-in-up` - Fade in with upward motion
- Use `framer-motion` for complex animations and transitions

### Component Styling Guidelines

#### Cards & Panels
```tsx
<Card className="glass-effect shadow-industrial border-border/40">
  <CardHeader>
    <CardTitle className="text-lg font-bold tracking-wide uppercase">
      Panel Title
    </CardTitle>
    <CardDescription className="text-xs uppercase tracking-widest text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent>
    // Content
  </CardContent>
</Card>
```

#### Buttons
- Use semantic variants: `default`, `secondary`, `outline`, `ghost`, `destructive`
- Add `font-bold uppercase` for industrial aesthetic
- Use `shadow-sm` or `shadow-industrial` for depth
- Include hover states with `hover:bg-muted/40` patterns

#### Tabs
```tsx
<Tabs>
  <TabsList className="glass-effect shadow-sm">
    <TabsTrigger className="font-bold uppercase tracking-wide">
      Tab Name
    </TabsTrigger>
  </TabsList>
</Tabs>
```

#### Badges & Labels
```tsx
<Badge className="uppercase font-bold text-xs shadow-sm">
  Status
</Badge>
```

#### Icons
- Use `lucide-react` for all icons
- Standard size: `className="h-4 w-4"` or `className="h-5 w-5"`
- Import individually for tree-shaking

```tsx
import { User, Settings, Activity } from "lucide-react";
```

## 4. Component Patterns

### Functional Components
- Use functional components with named exports
- Define TypeScript interfaces for props
- Use composition for complex UIs

**Example Component Structure:**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface MonitorPanelProps {
  title: string;
  status: "active" | "idle" | "offline";
  className?: string;
}

export const MonitorPanel = ({ title, status, className }: MonitorPanelProps) => {
  return (
    <Card className={cn("glass-effect shadow-industrial border-border/40", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-bold tracking-wide uppercase flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge className={cn(
          "uppercase font-bold text-xs",
          status === "active" && "bg-success text-success-foreground",
          status === "idle" && "bg-warning text-warning-foreground",
          status === "offline" && "bg-danger text-danger-foreground"
        )}>
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
};
```

### Navigation Patterns

#### Sticky Navbar
- Always use sticky positioning with `sticky top-0 z-50`
- Include backdrop blur for glass morphism: `backdrop-blur-lg`
- Apply industrial shadow: `shadow-industrial`
- Scale down on scroll with decorative gradient line

#### User Profile Dropdown
Replace logout buttons with user profile dropdown menus:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost">
      {user.username}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>
      <div className="font-bold">{user.username}</div>
      <div className="text-xs text-muted-foreground">{user.role}</div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Information</DropdownMenuItem>
    <DropdownMenuItem>Security</DropdownMenuItem>
    <DropdownMenuItem>Alert Setting</DropdownMenuItem>
    <DropdownMenuItem>Language</DropdownMenuItem>
    <DropdownMenuItem>Activity</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## 5. Theme System

### Dark Mode
- Supports light and dark mode via `dark` class
- Colors automatically adapt using CSS variables
- **Default theme**: Light mode
- Theme toggle: Located in navbar near user profile
- Persistence: Uses localStorage to maintain preference

### Theme Toggle Implementation
```tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();

<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
  className="relative"
>
  <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
</Button>
```

## 6. Routing & Navigation

- Use `react-router-dom` for navigation
- Define routes in `src/App.tsx`
- Use `useNavigate` for programmatic navigation
- Implement drill-down pattern: overview → detailed view
- Protect routes with `ProtectedRoute` wrapper

## 7. Data Fetching

- Use `TanStack Query` (React Query) for data fetching
- Wrap application in `QueryClientProvider`
- Implement proper loading and error states

## 8. Animations & Transitions

- Use Tailwind's `animate-` utilities for simple animations
- Use `framer-motion` for complex transitions and page animations
- Apply entrance animations with `animate-fade-in-up`
- Use `transition-all duration-300` for smooth state changes

## 9. Accessibility

- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Test with screen readers

## 10. Performance

- Import icons individually for tree-shaking
- Use lazy loading for routes and heavy components
- Optimize images and assets
- Minimize unnecessary re-renders with proper memoization

## 11. Code Quality

- Use TypeScript strictly - define proper types and interfaces
- Use `cn()` utility for conditional class merging
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Comment complex logic and business rules
- Follow consistent naming conventions

## 12. Project Identity

**Project Name**: AlignWhat Project

Use this name consistently across:
- Page titles and meta tags
- Navigation and branding
- Documentation and comments
- User-facing text and labels

---

**Remember**: This design system creates a cohesive, professional industrial monitoring interface. Always prioritize consistency and maintainability over individual component customization.