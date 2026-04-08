import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Home";
import HeroList from "./pages/Admin/Hero/HeroList";
import Hero from "./pages/Admin/Hero/Hero";

const isAuthenticated = () => {
  return !!localStorage.getItem("access_token");
};

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<SignIn />} />
          {/* Dashboard Layout */}
          <Route
            path="/*"
            element={
              isAuthenticated() ? (
                <AppLayout />
              ) : (
                <Navigate to="/" replace />
              )
            }
          >
            <Route path="home" element={<Home />} />
            <Route path="hero-list" element={<HeroList />} />
            <Route path="hero/:id" element={<Hero />} />
          </Route>

          {/* Default */}
          <Route path="*" element={<Navigate to="/" replace />} />



          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
