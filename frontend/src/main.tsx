import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AppToaster from './components/AppToaster';
import { AuthProvider } from './contexts/AuthContext';
import { FeaturesProvider } from './contexts/FeaturesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SpotifyProvider } from './contexts/SpotifyContext';
import '@fontsource-variable/inter';
import 'sonner/dist/styles.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SpotifyProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <FeaturesProvider>
                <App />
                <AppToaster />
              </FeaturesProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SpotifyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
