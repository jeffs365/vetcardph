import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { OwnerAuthProvider } from "@/lib/owner-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OwnerProtectedRoute } from "@/components/OwnerProtectedRoute";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import OwnerLogin from "@/pages/OwnerLogin";
import OwnerHome from "@/pages/OwnerHome";
import OwnerAddPet from "@/pages/OwnerAddPet";
import OwnerPets from "@/pages/OwnerPets";
import OwnerPetProfile from "@/pages/OwnerPetProfile";
import OwnerAccount from "@/pages/OwnerAccount";
import OwnerShare from "@/pages/OwnerShare";
import PublicShare from "@/pages/PublicShare";
import Home from "@/pages/Home";
import SearchPage from "@/pages/SearchPage";
import CalendarPage from "@/pages/Calendar";
import Account from "@/pages/Account";
import AccountFeedback from "@/pages/AccountFeedback";
import AccountSecurity from "@/pages/AccountSecurity";
import AccountSettings from "@/pages/AccountSettings";
import AccountTeam from "@/pages/AccountTeam";
import AccountTeamNew from "@/pages/AccountTeamNew";
import PetProfile from "@/pages/PetProfile";
import VisitDetail from "@/pages/VisitDetail";
import AppointmentDetail from "@/pages/AppointmentDetail";
import PreventiveCare from "@/pages/PreventiveCare";
import AddPet from "@/pages/AddPet";
import LinkPetProfile from "@/pages/LinkPetProfile";
import AddAppointment from "@/pages/AddAppointment";
import AddVisit from "@/pages/AddVisit";
import AddPreventiveRecord from "@/pages/AddPreventiveRecord";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedPage({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OwnerAuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Navigate to="/clinic/login" replace />} />
              <Route path="/register" element={<Navigate to="/clinic/register" replace />} />
              <Route path="/clinic/login" element={<Login />} />
              <Route path="/clinic/register" element={<Register />} />
              <Route path="/owner/login" element={<OwnerLogin />} />
              <Route path="/share/:publicToken" element={<PublicShare />} />
              <Route
                path="/owner"
                element={
                  <OwnerProtectedRoute>
                    <Navigate to="/owner/home" replace />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/home"
                element={
                  <OwnerProtectedRoute>
                    <OwnerHome />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/pets"
                element={
                  <OwnerProtectedRoute>
                    <OwnerPets />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/pets/new"
                element={
                  <OwnerProtectedRoute>
                    <OwnerAddPet />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/pets/:id/edit"
                element={
                  <OwnerProtectedRoute>
                    <OwnerAddPet />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/pets/:id"
                element={
                  <OwnerProtectedRoute>
                    <OwnerPetProfile />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/share"
                element={
                  <OwnerProtectedRoute>
                    <OwnerShare />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/owner/account"
                element={
                  <OwnerProtectedRoute>
                    <OwnerAccount />
                  </OwnerProtectedRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <ProtectedPage>
                    <Home />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets"
                element={
                  <ProtectedPage>
                    <SearchPage />
                  </ProtectedPage>
                }
              />
              <Route path="/search" element={<Navigate to="/pets" replace />} />
              <Route
                path="/calendar"
                element={
                  <ProtectedPage>
                    <CalendarPage />
                  </ProtectedPage>
                }
              />
              <Route path="/due" element={<Navigate to="/calendar" replace />} />
              <Route
                path="/account"
                element={
                  <ProtectedPage>
                    <Account />
                  </ProtectedPage>
                }
              />
              <Route
                path="/account/settings"
                element={
                  <ProtectedPage>
                    <AccountSettings />
                  </ProtectedPage>
                }
              />
              <Route
                path="/account/team"
                element={
                  <ProtectedPage>
                    <AccountTeam />
                  </ProtectedPage>
                }
              />
              <Route
                path="/account/team/new"
                element={
                  <ProtectedPage>
                    <AccountTeamNew />
                  </ProtectedPage>
                }
              />
              <Route
                path="/account/security"
                element={
                  <ProtectedPage>
                    <AccountSecurity />
                  </ProtectedPage>
                }
              />
              <Route
                path="/account/feedback"
                element={
                  <ProtectedPage>
                    <AccountFeedback />
                  </ProtectedPage>
                }
              />
              <Route
                path="/appointments/new"
                element={
                  <ProtectedPage>
                    <AddAppointment />
                  </ProtectedPage>
                }
              />
              <Route
                path="/appointments/:appointmentId/edit"
                element={
                  <ProtectedPage>
                    <AddAppointment />
                  </ProtectedPage>
                }
              />
              <Route
                path="/appointments/:appointmentId"
                element={
                  <ProtectedPage>
                    <AppointmentDetail />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/new"
                element={
                  <ProtectedPage>
                    <AddPet />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/link"
                element={
                  <ProtectedPage>
                    <LinkPetProfile />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/edit"
                element={
                  <ProtectedPage>
                    <AddPet />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id"
                element={
                  <ProtectedPage>
                    <PetProfile />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/preventive"
                element={
                  <ProtectedPage>
                    <PreventiveCare />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/preventive/new"
                element={
                  <ProtectedPage>
                    <AddPreventiveRecord />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/preventive/:recordId/edit"
                element={
                  <ProtectedPage>
                    <AddPreventiveRecord />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/visits/new"
                element={
                  <ProtectedPage>
                    <AddVisit />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/visits/:visitId/edit"
                element={
                  <ProtectedPage>
                    <AddVisit />
                  </ProtectedPage>
                }
              />
              <Route
                path="/pets/:id/visits/:visitId"
                element={
                  <ProtectedPage>
                    <VisitDetail />
                  </ProtectedPage>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </OwnerAuthProvider>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
