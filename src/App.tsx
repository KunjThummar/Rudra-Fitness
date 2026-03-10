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
import SignUp from "@/pages/SignUp";
import ResetPassword from "@/pages/ResetPassword";
import AdminDashboard from "@/pages/admin/Dashboard";
import MembersPage from "@/pages/admin/Members";
import MemberForm from "@/pages/admin/MemberForm";
import MemberProfile from "@/pages/admin/MemberProfile";
import PaymentsPage from "@/pages/admin/Payments";
import MembershipPlansPage from "@/pages/admin/MembershipPlans";
import WorkoutsPage from "@/pages/admin/Workouts";
import DietPlansPage from "@/pages/admin/DietPlans";
import TrainersPage from "@/pages/admin/Trainers";
import ReportsPage from "@/pages/admin/Reports";
import AttendancePage from "@/pages/admin/Attendance";
import NotificationsAdminPage from "@/pages/admin/Notifications";
import AdminMorePage from "@/pages/admin/More";
import MemberDashboard from "@/pages/member/Dashboard";
import MemberWorkoutsPage from "@/pages/member/Workouts";
import MemberDietPage from "@/pages/member/Diet";
import MemberProgressPage from "@/pages/member/Progress";
import MemberAttendancePage from "@/pages/member/Attendance";
import MemberNotificationsPage from "@/pages/member/Notifications";
import MemberAchievementsPage from "@/pages/member/Achievements";
import MemberProfilePage from "@/pages/member/Profile";
import MemberMorePage from "@/pages/member/More";
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
            <Route path="/signup" element={<SignUp />} />
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
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/more" element={<AdminMorePage />} />
              <Route path="/admin/workouts" element={<WorkoutsPage />} />
              <Route path="/admin/diet-plans" element={<DietPlansPage />} />
              <Route path="/admin/trainers" element={<TrainersPage />} />
              <Route path="/admin/announcements" element={<NotificationsAdminPage />} />
              <Route path="/admin/attendance" element={<AttendancePage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/help" element={<HelpPage />} />
            </Route>

            {/* Member Routes */}
            <Route element={<AppLayout role="member" title="Rudra Fitness" />}>
              <Route path="/member" element={<MemberDashboard />} />
              <Route path="/member/workouts" element={<MemberWorkoutsPage />} />
              <Route path="/member/diet" element={<MemberDietPage />} />
              <Route path="/member/progress" element={<MemberProgressPage />} />
              <Route path="/member/more" element={<MemberMorePage />} />
              <Route path="/member/membership" element={<PlaceholderPage title="Membership" />} />
              <Route path="/member/attendance" element={<MemberAttendancePage />} />
              <Route path="/member/notifications" element={<MemberNotificationsPage />} />
              <Route path="/member/achievements" element={<MemberAchievementsPage />} />
              <Route path="/member/profile" element={<MemberProfilePage />} />
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
