import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { MatchingProvider } from './context/MatchingContext';
import { AppLayout } from './layouts/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { MatchingPage } from './pages/MatchingPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { GeospatialPage } from './pages/GeospatialPage';
import { ResultsPage } from './pages/ResultsPage';

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <MatchingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="matching" element={<MatchingPage />} />
              <Route path="heatmap" element={<HeatmapPage />} />
              <Route path="features" element={<FeaturesPage />} />
              <Route path="geospatial" element={<GeospatialPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MatchingProvider>
    </LanguageProvider>
  );
};

export default App;
