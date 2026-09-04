import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Analisis from './pages/Analisis'
import Convertidor from './pages/Convertidor'
import './App.css'

// Placeholders temporales (los crearemos en los siguientes pasos)
/*function AnalisisPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Análisis de Portafolios</h1>
      <p className="mt-2 text-slate-600">
        Aquí irá el uploader + visualizaciones (próximo paso).
      </p>
    </div>
  )
}

function ConvertidorPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Convertidor .xlsx ↔ .db</h1>
      <p className="mt-2 text-slate-600">
        Aquí irá la herramienta de conversión bidireccional (próximo paso).
      </p>
    </div>
  )
}*/

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analisis" element={<Analisis />} />
            <Route path="/convertidor" element={<Convertidor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}