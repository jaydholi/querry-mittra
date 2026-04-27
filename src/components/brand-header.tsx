import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import logo from "@/assets/logo.png";

export function BrandHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Query Mittra" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight">
            Query <span className="text-brand-gradient">Mittra</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
