import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import AdminDashboard from "@/pages/admin/Dashboard";
import MemberDashboard from "@/pages/member/Dashboard";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin Routes */}
          <Route element={<AppLayout role="admin" title="Rudra Fitness" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/members" element={<PlaceholderPage title="Members" />} />
            <Route path="/admin/payments" element={<PlaceholderPage title="Payments" />} />
            <Route path="/admin/reports" element={<PlaceholderPage title="Reports" />} />
            <Route path="/admin/more" element={<PlaceholderPage title="More" />} />
          </Route>

          {/* Member Routes */}
          <Route element={<AppLayout role="member" title="Rudra Fitness" />}>
            <Route path="/member" element={<MemberDashboard />} />
            <Route path="/member/workouts" element={<PlaceholderPage title="Workouts" />} />
            <Route path="/member/diet" element={<PlaceholderPage title="Diet" />} />
            <Route path="/member/progress" element={<PlaceholderPage title="Progress" />} />
            <Route path="/member/more" element={<PlaceholderPage title="More" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
