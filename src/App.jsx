import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './components/layout/MainLayout';
import Overview from './pages/Overview';
import Competitors from './pages/Competitors';
import Comments from './pages/Comments';
import AIReports from './pages/AIReports';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<Overview />} />
                <Route path="competitors" element={<Competitors />} />
                <Route path="comments" element={<Comments />} />
                <Route path="ai-reports" element={<AIReports />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

