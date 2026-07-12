import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import Overview from './pages/Overview';
import Competitors from './pages/Competitors';
import AIReports from './pages/AIReports';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Overview />} />
            <Route path="competitors" element={<Competitors />} />
            <Route path="ai-reports" element={<AIReports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
