import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {PasscodeGate} from './components/PasscodeGate';
import {CloudBoot} from './components/CloudBoot';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasscodeGate>
      {(passcode) => (
        <CloudBoot passcode={passcode}>
          <App />
        </CloudBoot>
      )}
    </PasscodeGate>
  </StrictMode>,
);
