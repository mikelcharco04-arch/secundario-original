import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login.tsx";
import ProxyConfig from "./pages/ProxyConfig.tsx";
import Admin from "./pages/Admin.tsx";
import Pay from "./pages/Pay.tsx";
import FreeKey from "./pages/FreeKey.tsx";
import ReferralRedirect from "./pages/ReferralRedirect.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/proxy" element={<ProxyConfig />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/free-key" element={<FreeKey />} />
          <Route path="/r/:code" element={<ReferralRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
