import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { ClubThemeProvider } from "@/components/ClubThemeProvider";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Players from "./pages/Players";
import NewPlayer from "./pages/NewPlayer";
import PlayerDetail from "./pages/PlayerDetail";
import Events from "./pages/Events";
import NewEvent from "./pages/NewEvent";
import EventDetail from "./pages/EventDetail";
import Ausencias from "./pages/Ausencias";
import Profile from "./pages/Profile";
import Ratings from "./pages/Ratings";
import ClubSettings from "./pages/ClubSettings";
import DisplacementCalendar from "./pages/DisplacementCalendar";
import PendingTasks from "./pages/PendingTasks";
import WeeklySummary from "./pages/WeeklySummary";
import CoachManagement from "./pages/CoachManagement";
import ClubOnboarding from "./pages/ClubOnboarding";
import ClubManagement from "./pages/ClubManagement";
import AdminPanel from "./pages/AdminPanel";
import Subscription from "./pages/Subscription";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ClubThemeProvider>
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <AuthGuard unauthenticatedRedirect="/landing">
                <Index />
              </AuthGuard>
            }
          />
          <Route
            path="/teams"
            element={
              <AuthGuard>
                <Teams />
              </AuthGuard>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <AuthGuard>
                <TeamDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/players"
            element={
              <AuthGuard>
                <Players />
              </AuthGuard>
            }
          />
          <Route
            path="/players/new"
            element={
              <AuthGuard>
                <NewPlayer />
              </AuthGuard>
            }
          />
          <Route
            path="/players/:playerId"
            element={
              <AuthGuard>
                <PlayerDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/events"
            element={
              <AuthGuard>
                <Events />
              </AuthGuard>
            }
          />
          <Route
            path="/events/new"
            element={
              <AuthGuard>
                <NewEvent />
              </AuthGuard>
            }
          />
          <Route
            path="/events/:eventId"
            element={
              <AuthGuard>
                <EventDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/ausencias"
            element={
              <AuthGuard>
                <Ausencias />
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard>
                <Profile />
              </AuthGuard>
            }
          />
          <Route
            path="/ratings"
            element={
              <AuthGuard>
                <Ratings />
              </AuthGuard>
            }
          />
          <Route
            path="/club-settings"
            element={
              <AuthGuard>
                <ClubSettings />
              </AuthGuard>
            }
          />
          <Route
            path="/displacements"
            element={
              <AuthGuard>
                <DisplacementCalendar />
              </AuthGuard>
            }
          />
          <Route
            path="/pending-tasks"
            element={
              <AuthGuard>
                <PendingTasks />
              </AuthGuard>
            }
          />
          <Route
            path="/weekly-summary"
            element={
              <AuthGuard>
                <WeeklySummary />
              </AuthGuard>
            }
          />
          <Route
            path="/coach-management"
            element={
              <AuthGuard>
                <CoachManagement />
              </AuthGuard>
            }
          />
          <Route
            path="/club-onboarding"
            element={
              <AuthGuard requireClub={false}>
                <ClubOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/club-management"
            element={
              <AuthGuard>
                <ClubManagement />
              </AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <AdminPanel />
              </AuthGuard>
            }
          />
          <Route
            path="/subscription"
            element={
              <AuthGuard>
                <Subscription />
              </AuthGuard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ClubThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;