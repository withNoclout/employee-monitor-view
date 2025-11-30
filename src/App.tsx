import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Monitor from "./pages/Monitor";
import Training from "./pages/Training";
import BuildWI from "./pages/BuildWI";
import ManageTeam from "./pages/ManageTeam";
import TrainModel from "./pages/TrainModel";
import Annotate from "./pages/Annotate";
import ViewLog from "./pages/ViewLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-left" />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monitor/:id"
                element={
                  <ProtectedRoute>
                    <Monitor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training"
                element={
                  <ProtectedRoute>
                    <Training />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/build-wi"
                element={
                  <ProtectedRoute>
                    <BuildWI />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manage-team"
                element={
                  <ProtectedRoute>
                    <ManageTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/train-model"
                element={
                  <ProtectedRoute>
                    <TrainModel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/annotate"
                element={
                  <ProtectedRoute>
                    <Annotate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-log"
                element={
                  <ProtectedRoute>
                    <ViewLog />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
