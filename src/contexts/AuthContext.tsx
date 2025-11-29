import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
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
  const [lastActivity, setLastActivity] = useState(Date.now());
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const session = sessionStorage.getItem("auth_session");
    const sessionTime = sessionStorage.getItem("last_activity");
    
    if (session && sessionTime) {
      const timeSinceActivity = Date.now() - parseInt(sessionTime);
      
      if (timeSinceActivity < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
        setLastActivity(parseInt(sessionTime));
      } else {
        // Session expired
        logout();
      }
    }
  }, []);

  // Monitor session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      
      if (timeSinceActivity >= SESSION_TIMEOUT) {
        logout();
        navigate("/login");
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkTimeout);
  }, [isAuthenticated, lastActivity, navigate]);

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
      sessionStorage.setItem("auth_session", "active");
      sessionStorage.setItem("last_activity", now.toString());
      setIsAuthenticated(true);
      setLastActivity(now);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem("auth_session");
    sessionStorage.removeItem("last_activity");
    setIsAuthenticated(false);
  };

  const resetActivityTimer = () => {
    const now = Date.now();
    setLastActivity(now);
    sessionStorage.setItem("last_activity", now.toString());
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, resetActivityTimer }}>
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
