import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Home";
import HeroList from "./pages/Admin/Hero/HeroList";
import Hero from "./pages/Admin/Hero/Hero";
import ProgramsList from "./pages/Admin/Programs/ProgramsList";
import Program from "./pages/Admin/Programs/Program";
import CategoriesList from "./pages/Admin/Category/CategoriesList";
import Category from "./pages/Admin/Category/Category";
import CategoryPreview from "./pages/Admin/Category/CategoryPreview";
import NewsList from "./pages/Admin/News/NewsList";
import News from "./pages/Admin/News/News";
import VideosList from "./pages/Admin/Videos/VideosList";
import Video from "./pages/Admin/Videos/Video";
import ImagesList from "./pages/Admin/Images/ImagesList";
import Image from "./pages/Admin/Images/Image";
import DestinationsList from "./pages/Admin/Destinations/DestinationsList";
import Destination from "./pages/Admin/Destinations/Destination";

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
            <Route path="programs-list" element={<ProgramsList />} />
            <Route path="programs/:id" element={<Program />} />
            <Route path="categories-list" element={<CategoriesList />} />
            <Route path="categories/:id" element={<Category />} />
            <Route path="categories/preview/:id" element={<CategoryPreview />} />
            <Route path="news-list" element={<NewsList />} />
            <Route path="news/:id" element={<News />} />
            <Route path="videos-list" element={<VideosList />} />
            <Route path="videos/:id" element={<Video />} />
            <Route path="images-list" element={<ImagesList />} />
            <Route path="images/:id" element={<Image />} />
            <Route path="destinations-list" element={<DestinationsList />} />
            <Route path="destinations/:id" element={<Destination />} />
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
