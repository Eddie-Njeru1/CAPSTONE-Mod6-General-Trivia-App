// This is the entry point for the application. It renders App, enables client side routing and applies global styles. 

import { StrictMode } from 'react' // checks for potential issues during development
import { createRoot } from 'react-dom/client' // renders the React application
import { BrowserRouter  } from 'react-router-dom' // enable client side routing
import './styles/global.css' // for global styling 
import App from './App.jsx' // main App component

// Render the application inside the root HTML element
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
       <App />
    </BrowserRouter>
  </StrictMode>,
)
