import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, X, Megaphone, Bell, Ticket, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl shadow-industrial border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 max-w-[1600px]">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg gradient-primary shadow-industrial flex items-center justify-center transition-all duration-300 ${
              scrolled ? "scale-90" : "scale-100"
            }`}>
              <img src="/logo.svg" alt="NextXO Logo" className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`font-bold text-foreground tracking-tight transition-all duration-300 ${
                scrolled ? "text-xl" : "text-2xl"
              }`}>
                NextXO Monitor
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">System Online</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg bg-muted/30 border border-border/30 transition-all duration-300 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Real-time Monitoring
              </p>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border/50" />
            
            {/* Icon Buttons */}
            <div className="flex items-center gap-2">
              {/* Announcements */}
              <Button
                variant="outline"
                size="sm"
                className="relative hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all shadow-sm w-10 h-10 p-0"
                title="Announcements"
              >
                <Megaphone className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px] border-2 border-background">
                  3
                </Badge>
              </Button>

              {/* Alerts */}
              <Button
                variant="outline"
                size="sm"
                className="relative hover:bg-warning/10 hover:text-warning hover:border-warning/50 transition-all shadow-sm w-10 h-10 p-0"
                title="Alerts"
              >
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-warning text-warning-foreground text-[10px] border-2 border-background">
                  5
                </Badge>
              </Button>

              {/* Tickets */}
              <Button
                variant="outline"
                size="sm"
                className="relative hover:bg-accent/10 hover:text-accent hover:border-accent/50 transition-all shadow-sm w-10 h-10 p-0"
                title="Tickets"
              >
                <Ticket className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-accent text-accent-foreground text-[10px] border-2 border-background">
                  2
                </Badge>
              </Button>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border/50" />

            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="sm"
              className="hover:bg-muted transition-all shadow-sm w-10 h-10 p-0"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all shadow-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/30 bg-background/95 backdrop-blur-xl">
            <div className="space-y-3">
              <div className="px-4 py-2 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Real-time Monitoring
                </p>
              </div>

              {/* Mobile Icon Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {/* Announcements */}
                <Button
                  variant="outline"
                  className="relative flex flex-col items-center gap-1 h-auto py-3 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                >
                  <Megaphone className="w-5 h-5" />
                  <span className="text-xs font-medium">Announcements</span>
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
                    3
                  </Badge>
                </Button>

                {/* Alerts */}
                <Button
                  variant="outline"
                  className="relative flex flex-col items-center gap-1 h-auto py-3 hover:bg-warning/10 hover:text-warning hover:border-warning/50 transition-all"
                >
                  <Bell className="w-5 h-5" />
                  <span className="text-xs font-medium">Alerts</span>
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-warning text-warning-foreground text-[10px]">
                    5
                  </Badge>
                </Button>

                {/* Tickets */}
                <Button
                  variant="outline"
                  className="relative flex flex-col items-center gap-1 h-auto py-3 hover:bg-accent/10 hover:text-accent hover:border-accent/50 transition-all"
                >
                  <Ticket className="w-5 h-5" />
                  <span className="text-xs font-medium">Tickets</span>
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-accent text-accent-foreground text-[10px]">
                  2
                </Badge>
              </Button>
            </div>

            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 hover:bg-muted transition-all"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  Dark Mode
                </>
              )}
            </Button>
              
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* Decorative line */}
      <div className={`h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity duration-300 ${
        scrolled ? "opacity-100" : "opacity-0"
      }`} />
    </nav>
  );
};
