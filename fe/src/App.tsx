import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MapPage from './MapPage'

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/region/:regionId" element={<MapPage />} />
        <Route path="/region/:regionId/:locationId" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
