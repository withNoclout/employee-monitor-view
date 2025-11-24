# Style Instruction for Employee Monitor View

This document serves as a guide for maintaining the design system and coding standards of the Employee Monitor View project. Please follow these instructions when creating new components or features to ensure consistency.

## 1. Technology Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Library**: Shadcn/UI (Radix UI primitives)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query)

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

## 3. Styling Guidelines

### Tailwind CSS
- Use Tailwind CSS utility classes for all styling.
- Avoid writing custom CSS in `.css` files unless absolutely necessary (e.g., complex animations).
- Use the `cn()` utility function to merge classes and handle conditional styling.

```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-class", condition && "conditional-class")}>
  ...
</div>
```

### Colors
Use the semantic color variables defined in `tailwind.config.ts` and `src/index.css`. Do not hardcode hex values.

- **Primary**: `bg-primary`, `text-primary-foreground`
- **Secondary**: `bg-secondary`, `text-secondary-foreground`
- **Accent**: `bg-accent`, `text-accent-foreground`
- **Muted**: `bg-muted`, `text-muted-foreground`
- **Destructive**: `bg-destructive`, `text-destructive-foreground`
- **Success**: `bg-success`, `text-success-foreground` (Custom)
- **Warning**: `bg-warning`, `text-warning-foreground` (Custom)
- **Danger**: `bg-danger`, `text-danger-foreground` (Custom)
- **Background**: `bg-background`, `text-foreground`
- **Card**: `bg-card`, `text-card-foreground`
- **Border**: `border-border`

### Typography
- Use Tailwind's typography utilities (e.g., `text-sm`, `font-bold`, `leading-none`).
- Default font is configured in the base styles.

### Icons
- Use `lucide-react` for all icons.
- Import icons individually to enable tree-shaking.

```tsx
import { User, Settings } from "lucide-react";
```

## 4. Component Patterns

- **Functional Components**: Use functional components with named exports.
- **Props Interface**: Define a TypeScript interface for component props.
- **Composition**: Build complex UIs by composing smaller, reusable components (especially Shadcn/UI primitives).

**Example Component Structure:**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  title: string;
  isActive?: boolean;
  className?: string;
}

export const MyComponent = ({ title, isActive, className }: MyComponentProps) => {
  return (
    <Card className={cn("p-4", className)}>
      <CardContent>
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button variant={isActive ? "default" : "outline"}>
          Action
        </Button>
      </CardContent>
    </Card>
  );
};
```

## 5. Routing

- Use `react-router-dom` for navigation.
- Define routes in `src/App.tsx`.
- Use the `useNavigate` hook for programmatic navigation.

## 6. Data Fetching

- Use `TanStack Query` (React Query) for data fetching and state management.
- Wrap the application in `QueryClientProvider` (already done in `App.tsx`).

## 7. Animations

- Use Tailwind's `animate-` utilities or define custom keyframes in `tailwind.config.ts` if needed.
- The project already includes custom animations like `accordion-down` and `accordion-up`.

## 8. Dark Mode

- The project supports dark mode via the `dark` class.
- Colors are defined with CSS variables that adapt to the theme in `src/index.css`.
