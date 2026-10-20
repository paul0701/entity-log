import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";
import LogPage from "@/pages/LogPage";
import StatsPage from "@/pages/StatsPage";
import GlobalPage from "@/pages/GlobalPage";
import AuthPage from "@/pages/AuthPage";

const Loading = () => <p className="px-4 pt-10 text-stone-500">Entering the fog...</p>;

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  return user ? children : <Navigate to="/auth" replace />;
};

const Home = () => {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  return <Navigate to={user ? "/log" : "/global"} replace />;
};

const AuthRoute = () => {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  return user ? <Navigate to="/log" replace /> : <AuthPage />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/log" element={<Protected><LogPage /></Protected>} />
            <Route path="/stats" element={<Protected><StatsPage /></Protected>} />
            <Route path="/global" element={<GlobalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
        <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { background: "#0F111A", border: "1px solid rgba(220,38,38,.35)" } }} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
