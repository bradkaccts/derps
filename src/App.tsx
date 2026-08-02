import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { MessagingProvider } from "@/context/MessagingContext";
import { ApplicationProvider } from "@/context/ApplicationContext";
import { MyPetsProvider } from "@/context/MyPetsContext";
import { PlaydateProvider } from "@/context/PlaydateContext";
import { PlaydatesProvider } from "@/context/playdates/PlaydatesProvider";
import { FEATURES } from "@/config/features";
import Index from "./pages/Index";
import PlaydatesFeed from "./pages/PlaydatesFeed";
import PlaydateQuiz from "./pages/PlaydateQuiz";
import PlaydateMatches from "./pages/PlaydateMatches";
import PlaydateVenues from "./pages/PlaydateVenues";
import PlaydateSafety from "./pages/PlaydateSafety";
import PetProfile from "./pages/PetProfile";
import Inbox from "./pages/Inbox";
import MyDerps from "./pages/MyDerps";
import Profile from "./pages/Profile";
import CreateListing from "./pages/CreateListing";
import MyApplications from "./pages/MyApplications";
import RehomerApplications from "./pages/RehomerApplications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PreferencesProvider>
          <FavoritesProvider>
            <MessagingProvider>
              <ApplicationProvider>
                <MyPetsProvider>
                  <PlaydateProvider>
                    <PlaydatesProvider>
                      <AppLayout>
                        <Routes>
                          {/* Release 1 is Derpdates-first: the feed is home. */}
                          <Route path="/" element={<PlaydatesFeed />} />
                          <Route path="/inbox" element={<Inbox />} />
                          <Route path="/my-derps" element={<MyDerps />} />
                          <Route path="/profile" element={<Profile />} />

                          {/* Adoption surfaces — hidden for release 1 */}
                          {FEATURES.adoption && (
                            <>
                              <Route path="/browse" element={<Index />} />
                              <Route path="/pet/:id" element={<PetProfile />} />
                              <Route path="/create-listing" element={<CreateListing />} />
                              <Route path="/my-applications" element={<MyApplications />} />
                              <Route path="/applications-inbox" element={<RehomerApplications />} />
                            </>
                          )}

                          {/* Derps Playdates — pet-to-pet social matching */}
                          <Route path="/playdates" element={<PlaydatesFeed />} />
                          <Route path="/playdates/quiz/:petId" element={<PlaydateQuiz />} />
                          <Route path="/playdates/matches" element={<PlaydateMatches />} />
                          <Route path="/playdates/matches/:matchId" element={<PlaydateMatches />} />
                          <Route path="/playdates/venues" element={<PlaydateVenues />} />
                          <Route path="/playdates/safety" element={<PlaydateSafety />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppLayout>
                    </PlaydatesProvider>
                  </PlaydateProvider>
                </MyPetsProvider>
              </ApplicationProvider>
            </MessagingProvider>
          </FavoritesProvider>
        </PreferencesProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
