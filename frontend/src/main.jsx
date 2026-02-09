import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { OrgProvider } from './context/OrgContext';
import { NotificationProvider } from './context/NotificationContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <OrgProvider>
            <NotificationProvider>
              <AnalyticsProvider>
                <App />
              </AnalyticsProvider>
            </NotificationProvider>
          </OrgProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
