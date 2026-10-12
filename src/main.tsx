import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary isRoot={true} fallbackTitle="Falha na inicialização do Obragest">
    <App />
  </ErrorBoundary>
);
