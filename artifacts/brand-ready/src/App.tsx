import { useEffect, Component, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/hooks/useSession";
import { useAppConfig } from "@/hooks/useAppConfig";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Analyze from "@/pages/Analyze";
import Results from "@/pages/Results";
import Dashboard from "@/pages/Dashboard";
import Pricing from "@/pages/Pricing";
import Tasks from "@/pages/Tasks";
import PaymentCallback from "@/pages/PaymentCallback";
import Profile from "@/pages/Profile";
import Billing from "@/pages/Billing";
import Subscription from "@/pages/Subscription";
import ResendConfirmation from "@/pages/ResendConfirmation";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import GoogleAuthSuccess from "@/pages/GoogleAuthSuccess";
import BrandSetup from "@/pages/BrandSetup";
import BrandMentions from "@/pages/BrandMentions";
import Competitors from "@/pages/Competitors";
import DailyTasks from "@/pages/DailyTasks";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminApiIntegrations from "@/pages/AdminApiIntegrations";
import AdminAppearance from "@/pages/AdminAppearance";
import AdminGeneralSettings from "@/pages/AdminGeneralSettings";
import AdminPlansAndPricing from "@/pages/AdminPlansAndPricing";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminUsers from "@/pages/AdminUsers";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import AdminNotifications from "@/pages/AdminNotifications";
import Messages from "@/pages/Messages";
import MyBrands from "@/pages/MyBrands";
import CompetitorAnalysis from "@/pages/CompetitorAnalysis";
import CompetitorAdsIntelligence from "@/pages/CompetitorAdsIntelligence";
import MyAnalysis from "@/pages/MyAnalysis";
import AdminLogin from "@/pages/AdminLogin";
import AdminForgotPassword from "@/pages/AdminForgotPassword";
import AdminResetPassword from "@/pages/AdminResetPassword";
import AdminSecurity from "@/pages/AdminSecurity";
import Register from "@/pages/Register";
import WaitlistSuccess from "@/pages/WaitlistSuccess";
import Login from "@/pages/Login";
import CheckEmail from "@/pages/CheckEmail";
import ConfirmEmail from "@/pages/ConfirmEmail";
import Onboarding from "@/pages/Onboarding";
import Features from "@/pages/Features";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import AiBrandCoach from "@/pages/AiBrandCoach";
import ContentGenerator from "@/pages/ContentGenerator";
import PressReleaseBuilder from "@/pages/PressReleaseBuilder";
import ReviewTemplates from "@/pages/ReviewTemplates";
import IndustryBenchmarks from "@/pages/IndustryBenchmarks";
import CompetitorScoreTracker from "@/pages/CompetitorScoreTracker";
import CompetitorStrategyDecoder from "@/pages/CompetitorStrategyDecoder";
import AudienceTrustScore from "@/pages/AudienceTrustScore";
import ViralContentDetector from "@/pages/ViralContentDetector";
import ShareOfVoice from "@/pages/ShareOfVoice";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">{(this.state.error as Error).message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

function LoginRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/login"); }, [setLocation]);
  return null;
}

function PricingRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/pricing"); }, [setLocation]);
  return null;
}

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) return <LoginRedirect />;
  return <Component />;
}

function Router() {
  const config = useAppConfig();
  const [location] = useLocation();

  // Show maintenance page for non-admin routes when maintenance mode is on
  if (config.maintenanceMode && !location.startsWith("/admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🔧</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.siteName} is under maintenance</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              We're making some improvements. We'll be back shortly — thank you for your patience.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Maintenance in progress
          </div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/waitlist" component={WaitlistSuccess} />
      <Route path="/login" component={Login} />
      <Route path="/check-email" component={CheckEmail} />
      <Route path="/confirm-email" component={ConfirmEmail} />
      <Route path="/resend-confirmation" component={ResendConfirmation} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/auth/google/success" component={GoogleAuthSuccess} />
      <Route path="/features" component={Features} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/pricing" component={Pricing} />

      {/* Admin routes (guarded by AdminAuthGate inside each page) */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/forgot-password" component={AdminForgotPassword} />
      <Route path="/admin/reset-password" component={AdminResetPassword} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/api-integrations" component={AdminApiIntegrations} />
      <Route path="/admin/appearance" component={AdminAppearance} />
      <Route path="/admin/general" component={AdminGeneralSettings} />
      <Route path="/admin/plans" component={AdminPlansAndPricing} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/security" component={AdminSecurity} />

      {/* Protected user routes */}
      <Route path="/dashboard">{() => <PrivateRoute component={Dashboard} />}</Route>
      <Route path="/onboarding">{() => <PrivateRoute component={Onboarding} />}</Route>
      <Route path="/analyze">{() => <PrivateRoute component={Analyze} />}</Route>
      <Route path="/results/:id">{() => <PrivateRoute component={Results} />}</Route>
      <Route path="/tasks/:analysisId">{() => <PrivateRoute component={Tasks} />}</Route>
      <Route path="/payment/callback">{() => <PrivateRoute component={PaymentCallback} />}</Route>
      <Route path="/profile">{() => <PrivateRoute component={Profile} />}</Route>
      <Route path="/billing">{() => <PrivateRoute component={Billing} />}</Route>
      <Route path="/subscription">{() => <PrivateRoute component={Subscription} />}</Route>
      <Route path="/brand-setup">{() => <PrivateRoute component={BrandSetup} />}</Route>
      <Route path="/brand-mentions">{() => <PrivateRoute component={BrandMentions} />}</Route>
      <Route path="/competitors">{() => <PrivateRoute component={Competitors} />}</Route>
      <Route path="/daily-tasks">{() => <PrivateRoute component={DailyTasks} />}</Route>
      <Route path="/messages">{() => <PrivateRoute component={Messages} />}</Route>
      <Route path="/my-brands">{() => <PrivateRoute component={MyBrands} />}</Route>
      <Route path="/competitor-analysis">{() => <PrivateRoute component={CompetitorAnalysis} />}</Route>
      <Route path="/competitor-ads">{() => <PrivateRoute component={CompetitorAdsIntelligence} />}</Route>
      <Route path="/my-analysis">{() => <PrivateRoute component={MyAnalysis} />}</Route>
      <Route path="/ai-coach">{() => <PrivateRoute component={AiBrandCoach} />}</Route>
      <Route path="/content-generator">{() => <PrivateRoute component={ContentGenerator} />}</Route>
      <Route path="/press-release">{() => <PrivateRoute component={PressReleaseBuilder} />}</Route>
      <Route path="/review-templates">{() => <PrivateRoute component={ReviewTemplates} />}</Route>
      <Route path="/benchmarks">{() => <PrivateRoute component={IndustryBenchmarks} />}</Route>
      <Route path="/competitor-tracker">{() => <PrivateRoute component={CompetitorScoreTracker} />}</Route>
      <Route path="/strategy-decoder">{() => <PrivateRoute component={CompetitorStrategyDecoder} />}</Route>
      <Route path="/trust-score">{() => <PrivateRoute component={AudienceTrustScore} />}</Route>
      <Route path="/viral-detector">{() => <PrivateRoute component={ViralContentDetector} />}</Route>
      <Route path="/share-of-voice">{() => <PrivateRoute component={ShareOfVoice} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
