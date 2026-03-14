import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import { OfflineBanner, InstallPrompt } from "@/components/PWAComponents";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Lazy-loaded pages for code splitting and Performance Optimization
const Login = lazy(() => import("@/pages/Login"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const MembersPage = lazy(() => import("@/pages/admin/Members"));
const MemberForm = lazy(() => import("@/pages/admin/MemberForm"));
const MemberProfile = lazy(() => import("@/pages/admin/MemberProfile"));
const PaymentsPage = lazy(() => import("@/pages/admin/Payments"));
const MembershipPlansPage = lazy(() => import("@/pages/admin/MembershipPlans"));
const WorkoutsPage = lazy(() => import("@/pages/admin/Workouts"));
const DietPlansPage = lazy(() => import("@/pages/admin/DietPlans"));
const TrainersPage = lazy(() => import("@/pages/admin/Trainers"));
const ReportsPage = lazy(() => import("@/pages/admin/Reports"));
const AttendancePage = lazy(() => import("@/pages/admin/Attendance"));
const NotificationsAdminPage = lazy(() => import("@/pages/admin/Notifications"));
const AdminMorePage = lazy(() => import("@/pages/admin/More"));
const MemberDashboard = lazy(() => import("@/pages/member/Dashboard"));
const MemberWorkoutsPage = lazy(() => import("@/pages/member/Workouts"));
const MemberDietPage = lazy(() => import("@/pages/member/Diet"));
const MemberProgressPage = lazy(() => import("@/pages/member/Progress"));
const MemberAttendancePage = lazy(() => import("@/pages/member/Attendance"));
const MemberNotificationsPage = lazy(() => import("@/pages/member/Notifications"));
const MemberAchievementsPage = lazy(() => import("@/pages/member/Achievements"));
const MemberProfilePage = lazy(() => import("@/pages/member/Profile"));
const MemberMorePage = lazy(() => import("@/pages/member/More"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const HelpPage = lazy(() => import("@/pages/Help"));
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage"));
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, 
      gcTime: 10 * 60 * 1000,   
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />
          <InstallPrompt />
          <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><LoadingSpinner text="Loading..." /></div>}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
