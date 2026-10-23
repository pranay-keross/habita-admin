import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import AiUsagePage from './pages/AiUsagePage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignEditPage from './pages/CampaignEditPage';
import BannersPage from './pages/BannersPage';
import BannerEditPage from './pages/BannerEditPage';
import BannerSeriesPage from './pages/BannerSeriesPage';
import ChallengesPage from './pages/ChallengesPage';

export default function App() {
  const { admin, loading } = useAuth();

  if (loading) return <div className="boot">Loading…</div>;
  if (!admin) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="ai-usage" element={<AiUsagePage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/new" element={<CampaignEditPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignEditPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="banners/series" element={<BannerSeriesPage />} />
        <Route path="banners/new" element={<BannerEditPage />} />
        <Route path="banners/:bannerId" element={<BannerEditPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
