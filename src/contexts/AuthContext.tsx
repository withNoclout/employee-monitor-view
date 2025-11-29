import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; role: string } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  resetActivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const session = sessionStorage.getItem("auth_session");
    const sessionTime = sessionStorage.getItem("last_activity");
    const storedUser = sessionStorage.getItem("user_data");

    if (session && sessionTime && storedUser) {
      const timeSinceActivity = Date.now() - parseInt(sessionTime);

      if (timeSinceActivity < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
        setLastActivity(parseInt(sessionTime));
      } else {
        // Session expired
        logout();
      }
    }
  }, []);

  // Monitor session timeout
  const location = useLocation();

  // Monitor session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = setInterval(() => {
      // If user is on any page other than dashboard, consider them active/busy
      // This prevents logout during training or monitoring sessions
      if (location.pathname !== '/') {
        resetActivityTimer();
        return;
      }

      const timeSinceActivity = Date.now() - lastActivity;

      if (timeSinceActivity >= SESSION_TIMEOUT) {
        logout();
        navigate("/login");
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkTimeout);
  }, [isAuthenticated, lastActivity, navigate, location.pathname]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      resetActivityTimer();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);

  const login = (username: string, password: string): boolean => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const now = Date.now();
      const userData = { username: username, role: "Administrator" };
      sessionStorage.setItem("auth_session", "active");
      sessionStorage.setItem("last_activity", now.toString());
      sessionStorage.setItem("user_data", JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
      setLastActivity(now);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem("auth_session");
    sessionStorage.removeItem("last_activity");
    sessionStorage.removeItem("user_data");
    setIsAuthenticated(false);
    setUser(null);
  };

  const resetActivityTimer = () => {
    const now = Date.now();
    setLastActivity(now);
    sessionStorage.setItem("last_activity", now.toString());
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, resetActivityTimer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
