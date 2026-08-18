import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App.tsx'
import StartlistGenerator from './tools/StartlistGenerator.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/admin-tools">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/startlist-generator" element={<StartlistGenerator />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
