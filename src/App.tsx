import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import { OfflineBanner, InstallPrompt } from "@/components/PWAComponents";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AdminDashboard from "@/pages/admin/Dashboard";
import MembersPage from "@/pages/admin/Members";
import MemberForm from "@/pages/admin/MemberForm";
import MemberProfile from "@/pages/admin/MemberProfile";
import PaymentsPage from "@/pages/admin/Payments";
import MembershipPlansPage from "@/pages/admin/MembershipPlans";
import MemberDashboard from "@/pages/member/Dashboard";
import SettingsPage from "@/pages/Settings";
import HelpPage from "@/pages/Help";
import PlaceholderPage from "@/pages/PlaceholderPage";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />
          <InstallPrompt />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Admin Routes */}
            <Route element={<AppLayout role="admin" title="Rudra Fitness" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/members" element={<MembersPage />} />
              <Route path="/admin/members/add" element={<MemberForm />} />
              <Route path="/admin/members/:id" element={<MemberProfile />} />
              <Route path="/admin/members/:id/edit" element={<MemberForm />} />
              <Route path="/admin/payments" element={<PaymentsPage />} />
              <Route path="/admin/plans" element={<MembershipPlansPage />} />
              <Route path="/admin/reports" element={<PlaceholderPage title="Reports" />} />
              <Route path="/admin/more" element={<PlaceholderPage title="More" />} />
              <Route path="/admin/workouts" element={<PlaceholderPage title="Workouts" />} />
              <Route path="/admin/diet-plans" element={<PlaceholderPage title="Diet Plans" />} />
              <Route path="/admin/trainers" element={<PlaceholderPage title="Trainers" />} />
              <Route path="/admin/announcements" element={<PlaceholderPage title="Announcements" />} />
              <Route path="/admin/attendance" element={<PlaceholderPage title="Attendance" />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/help" element={<HelpPage />} />
            </Route>

            {/* Member Routes */}
            <Route element={<AppLayout role="member" title="Rudra Fitness" />}>
              <Route path="/member" element={<MemberDashboard />} />
              <Route path="/member/workouts" element={<PlaceholderPage title="Workouts" />} />
              <Route path="/member/diet" element={<PlaceholderPage title="Diet" />} />
              <Route path="/member/progress" element={<PlaceholderPage title="Progress" />} />
              <Route path="/member/more" element={<PlaceholderPage title="More" />} />
              <Route path="/member/membership" element={<PlaceholderPage title="Membership" />} />
              <Route path="/member/attendance" element={<PlaceholderPage title="Attendance" />} />
              <Route path="/member/notifications" element={<PlaceholderPage title="Notifications" />} />
              <Route path="/member/profile" element={<PlaceholderPage title="Profile" />} />
              <Route path="/member/settings" element={<SettingsPage />} />
              <Route path="/member/help" element={<HelpPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
