import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StartMapPage } from './StartMapPage'

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<StartMapPage />} />
        <Route path="/region/:regionId" element={<StartMapPage />} />
        <Route path="/region/:regionId/:locationId" element={<StartMapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
