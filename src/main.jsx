import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import { ProyectoProvider } from './context/ProyectoContext.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <UIProvider>
      <ProyectoProvider>
        <App />
      </ProyectoProvider>
    </UIProvider>
  </AuthProvider>
);
