import { useState } from 'react'
import FileUploader from '../components/FileUploader'
import PortfolioViewer from '../components/PortfolioViewer'

export type ParsedData = {
  rows: any[]
  source: string
  message?: string
  error?: string
}

export default function Analisis() {
  const [data, setData] = useState<ParsedData | null>(null)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Análisis de Portafolios
        </h1>
        <p className="mt-2 text-slate-600">
          Sube un archivo <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.xlsx</code> o{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.db</code>. 
          Se calcularán medias aritmética y geométrica por portafolio, series de rendimientos 
          y una aproximación de la frontera eficiente.
        </p>
      </div>

      {/* Uploader section */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <FileUploader onData={setData} />
          </div>

          <button
            onClick={async () => {
              try {
                const res = await fetch('/portafolio.db')
                if (!res.ok) throw new Error('No se encontró el archivo de ejemplo')
                const buffer = await res.arrayBuffer()
                const { parseBufferAndEmit } = await import('../components/FileUploader')
                await parseBufferAndEmit(buffer, 'portafolio.db', setData)
              } catch (err: any) {
                setData({
                  rows: [],
                  source: 'portafolio.db',
                  error: err?.message ?? String(err),
                })
              }
            }}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Cargar ejemplo
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <strong className="font-medium text-slate-700">Columnas aceptadas:</strong>{' '}
          Date, Price, Open, High, Low, Change, Empresa, Volumen, Rendimiento.
          <br />
          Si no existe <code>Rendimiento</code>, se calcula a partir de <code>Price</code> 
          (cambio porcentual entre cierres consecutivos por empresa) o de <code>Change</code>.
        </div>
      </section>

      {/* Results */}
      {data && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Datos cargados: <span className="font-mono text-base">{data.source}</span>
            </h2>
          </div>

          {data.message && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {data.message}
            </div>
          )}

          {data.error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {data.error}
            </div>
          )}

          {data.rows.length > 0 && <PortfolioViewer rows={data.rows} />}
        </section>
      )}

      {!data && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-500">
            Aún no se ha cargado ningún archivo.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Usa el botón de arriba o carga el ejemplo incluido.
          </p>
        </div>
      )}
    </div>
  )
}