import { useMemo, useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Brush,
  BarChart,
  Bar,
  Area,
  ComposedChart,
} from 'recharts'
import Plot from 'react-plotly.js'

type Row = {
  date?: any
  dateObj?: Date | null
  empresa?: string
  Empresa?: string
  rendimiento?: number | null
  Rendimiento?: number | null
  [key: string]: any
}

function toNumber(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

function geometricMean(values: number[]) {
  const s = values.filter((v) => !Number.isNaN(v))
  if (s.length === 0) return NaN
  if (s.some((x) => 1 + x <= 0)) return NaN
  const logSum = s.reduce((acc, x) => acc + Math.log1p(x), 0)
  return Math.exp(logSum / s.length) - 1
}

function arithmeticMean(values: number[]) {
  const s = values.filter((v) => !Number.isNaN(v))
  if (s.length === 0) return NaN
  return s.reduce((a, b) => a + b, 0) / s.length
}

function formatBoth(value: number) {
  if (Number.isNaN(value)) return { raw: 'N/D', pct: 'N/D' }
  return {
    raw: value.toFixed(6),
    pct: (value * 100).toFixed(4) + ' %',
  }
}

export default function PortfolioViewer({ rows }: { rows: Row[] }) {
  const cleaned = useMemo(() => {
    return rows
      .map((r) => {
        const empresa = String(r.empresa ?? r.Empresa ?? 'UNKNOWN')
        const dateObj =
          r.dateObj ??
          (r.date ? (r.date instanceof Date ? r.date : new Date(r.date)) : null)
        const rendimiento = toNumber(r.rendimiento ?? r.Rendimiento)
        return { dateObj, date: r.date, Empresa: empresa, Rendimiento: rendimiento }
      })
      .filter((r) => r.Empresa && !Number.isNaN(r.Rendimiento))
  }, [rows])

  const companies = useMemo(() => {
    return Array.from(new Set(cleaned.map((r) => r.Empresa))).sort()
  }, [cleaned])

  const [selected, setSelected] = useState<string | null>(null)
  const [viewTab, setViewTab] = useState<'Serie' | 'Geométrica'>('Serie')
  const [seriesSubTab, setSeriesSubTab] = useState<
    'Rendimientos' | 'Acumulado' | 'Drawdown' | 'Volatilidad' | 'MediaMóvil'
  >('Rendimientos')

  // ========== NUEVOS CONTROLES DE LA FRONTERA ==========
  const [meanType, setMeanType] = useState<'arithmetic' | 'geometric'>('arithmetic')
  const [riskType, setRiskType] = useState<'std' | 'variance'>('std')

  useEffect(() => {
    if (companies.length > 0) {
      setSelected((prev) => (prev && companies.includes(prev) ? prev : companies[0]))
    }
  }, [companies])

  // ========== Cálculos base ==========
  const geomByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    companies.forEach((c) => {
      map[c] = geometricMean(
        cleaned.filter((r) => r.Empresa === c).map((r) => r.Rendimiento)
      )
    })
    return map
  }, [companies, cleaned])

  const overallArith = useMemo(
    () => arithmeticMean(cleaned.map((r) => r.Rendimiento)),
    [cleaned]
  )

  // ========== Serie enriquecida del portafolio seleccionado ==========
  const enrichedSeries = useMemo(() => {
    if (!selected) return []

    const raw = cleaned
      .filter((r) => r.Empresa === selected)
      .sort((a, b) => (a.dateObj?.getTime() ?? 0) - (b.dateObj?.getTime() ?? 0))

    let cumulative = 1
    let peak = 1
    const window = 20

    return raw.map((r, i) => {
      const ret = r.Rendimiento
      cumulative *= 1 + ret
      if (cumulative > peak) peak = cumulative
      const drawdown = peak > 0 ? (cumulative - peak) / peak : 0

      const start = Math.max(0, i - window + 1)
      const slice = raw.slice(start, i + 1).map((x) => x.Rendimiento)
      const ma = arithmeticMean(slice)

      let vol = NaN
      if (slice.length >= 5) {
        const mean = arithmeticMean(slice)
        const variance =
          slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (slice.length - 1)
        vol = Math.sqrt(variance)
      }

      return {
        date: r.dateObj ? r.dateObj.toISOString().slice(0, 10) : String(r.date),
        return: ret,
        cumulative,
        drawdown,
        volatility: vol,
        movingAvg: ma,
        positive: ret >= 0 ? ret : null,
        negative: ret < 0 ? ret : null,
      }
    })
  }, [selected, cleaned])

  const geomProcedure = useMemo(() => {
    if (!selected) return null
    const vals = cleaned
      .filter((r) => r.Empresa === selected)
      .map((r) => r.Rendimiento)
      .filter((v) => !Number.isNaN(v))

    if (vals.length === 0) return null
    if (vals.some((x) => 1 + x <= 0)) {
      return { error: 'Media geométrica indefinida: existe (1 + r) ≤ 0' }
    }

    const logVals = vals.map((x) => Math.log1p(x))
    const sumLog = logVals.reduce((a, b) => a + b, 0)
    const meanLog = sumLog / vals.length
    const geom = Math.exp(meanLog) - 1

    return { n: vals.length, sumLog, meanLog, geom }
  }, [selected, cleaned])

  const geomBarsPct = useMemo(
    () => companies.map((c) => ({ name: c, value: geomByCompany[c] * 100 })),
    [companies, geomByCompany]
  )
  const geomBarsRaw = useMemo(
    () => companies.map((c) => ({ name: c, value: geomByCompany[c] })),
    [companies, geomByCompany]
  )

  // ========== Frontera eficiente (Monte Carlo) ==========
  const returnsMatrix = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    cleaned.forEach((r) => {
      const key = r.dateObj ? r.dateObj.toISOString().slice(0, 10) : String(r.date)
      if (!map[key]) map[key] = {}
      map[key][r.Empresa] = r.Rendimiento
    })
    return Object.values(map).filter((row) =>
      companies.every((c) => row[c] !== undefined && !Number.isNaN(row[c]))
    )
  }, [cleaned, companies])

  const portfolioSimulation = useMemo(() => {
    if (returnsMatrix.length < 5 || companies.length < 2) return null

    const nDates = returnsMatrix.length
    const nAssets = companies.length
    const mat = returnsMatrix.map((r) => companies.map((c) => r[c]))

    // 1. Medias aritméticas (SIEMPRE se usan para centrar la covarianza)
    const arithMeans = companies.map((_, j) => {
      const returns = mat.map((row) => row[j])
      return arithmeticMean(returns)
    })

    // 2. Medias que se usarán en el eje Y (según selector)
    const meanReturns = companies.map((_, j) => {
      const returns = mat.map((row) => row[j])
      return meanType === 'geometric'
        ? geometricMean(returns)
        : arithmeticMean(returns)
    })

    // 3. Matriz de covarianza (SIEMPRE centrada con media aritmética)
    const cov: number[][] = Array.from({ length: nAssets }, () => Array(nAssets).fill(0))
    for (let i = 0; i < nAssets; i++) {
      for (let j = i; j < nAssets; j++) {
        let s = 0
        for (let k = 0; k < nDates; k++) {
          s += (mat[k][i] - arithMeans[i]) * (mat[k][j] - arithMeans[j])
        }
        const v = s / (nDates - 1)
        cov[i][j] = v
        cov[j][i] = v
      }
    }

    const numPortfolios = 6000
    const points: { risk: number; ret: number; weights: number[] }[] = []

    for (let p = 0; p < numPortfolios; p++) {
      const w = Array.from({ length: nAssets }, () => Math.random())
      const sum = w.reduce((a, b) => a + b, 0)
      w.forEach((_, i) => (w[i] /= sum))

      // Rendimiento esperado del portafolio (usa meanReturns según selector)
      let pr = 0
      for (let t = 0; t < nAssets; t++) pr += meanReturns[t] * w[t]

      // Varianza del portafolio
      let variance = 0
      for (let a = 0; a < nAssets; a++) {
        for (let b = 0; b < nAssets; b++) {
          variance += w[a] * cov[a][b] * w[b]
        }
      }

      // Riesgo según selector
      const risk = riskType === 'std' ? Math.sqrt(Math.max(0, variance)) : Math.max(0, variance)

      points.push({
        risk,
        ret: pr,
        weights: [...w],
      })
    }

    const minRet = Math.min(...points.map((p) => p.ret))
    const maxRet = Math.max(...points.map((p) => p.ret))
    const targets = Array.from({ length: 80 }, (_, i) => minRet + (i / 79) * (maxRet - minRet))

    const frontier: { risk: number; ret: number }[] = []
    for (const t of targets) {
      let minRisk = Infinity
      let bestRet = NaN
      for (const p of points) {
        if (p.ret >= t && p.risk < minRisk) {
          minRisk = p.risk
          bestRet = p.ret
        }
      }
      if (isFinite(minRisk)) frontier.push({ risk: minRisk, ret: bestRet })
    }

    let minVol = points[0]
    for (const p of points) {
      if (p.risk < minVol.risk) minVol = p
    }

    return { points, frontier, minVol, companies }
  }, [returnsMatrix, companies, meanType, riskType]) // ← dependencias nuevas

  const selectedGeom = selected ? geomByCompany[selected] : NaN
  const selectedGeomFmt = formatBoth(selectedGeom)
  const overallArithFmt = formatBoth(overallArith)

  // ========== Datos para Plotly (Frontera) ==========
  const plotlyData = useMemo(() => {
    if (!portfolioSimulation) return []

    const { points, frontier, minVol, companies: comps } = portfolioSimulation

    const hoverTexts = points.map((p) => {
      const weightsStr = comps
        .map((c, i) => `${c}: ${(p.weights[i] * 100).toFixed(1)}%`)
        .join('<br>')
      return `Riesgo: ${p.risk.toFixed(6)}<br>Rendimiento: ${(p.ret * 100).toFixed(4)}%<br><br>${weightsStr}`
    })

    return [
      {
        x: points.map((p) => p.risk),
        y: points.map((p) => p.ret),
        mode: 'markers',
        type: 'scatter',
        name: 'Portafolios aleatorios',
        marker: {
          color: '#38bdf8',
          size: 6,
          opacity: 0.55,
        },
        text: hoverTexts,
        hoverinfo: 'text',
      },
      {
        x: frontier.map((p) => p.risk),
        y: frontier.map((p) => p.ret),
        mode: 'lines',
        type: 'scatter',
        name: 'Frontera eficiente',
        line: { color: '#dc2626', width: 3 },
        hoverinfo: 'skip',
      },
      {
        x: [minVol.risk],
        y: [minVol.ret],
        mode: 'markers',
        type: 'scatter',
        name: riskType === 'std' ? 'Mínima desviación' : 'Mínima varianza',
        marker: { color: '#0f172a', size: 12, symbol: 'diamond' },
        text: [
          `${riskType === 'std' ? 'Mínima desviación' : 'Mínima varianza'}<br>Riesgo: ${minVol.risk.toFixed(6)}<br>Rendimiento: ${(minVol.ret * 100).toFixed(4)}%`,
        ],
        hoverinfo: 'text',
      },
    ]
  }, [portfolioSimulation, riskType])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* ========== SIDEBAR ========== */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Portafolios</h3>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {companies.map((c) => (
              <li key={c}>
                <button
                  onClick={() => setSelected(c)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selected === c
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
              Portafolio seleccionado
            </div>
            <div className="font-semibold text-slate-900">{selected ?? '—'}</div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs font-medium text-slate-500 mb-1">Media Geométrica</div>
            <div className="text-lg font-semibold tabular-nums text-emerald-700">
              {selectedGeomFmt.raw}
            </div>
            <div className="text-sm text-emerald-600/80 tabular-nums">
              {selectedGeomFmt.pct}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 mb-1">
            Media Aritmética Global
          </div>
          <div className="text-xs text-slate-400 mb-2">
            (todos los rendimientos como un solo portafolio)
          </div>
          <div className="text-lg font-semibold tabular-nums text-slate-900">
            {overallArithFmt.raw}
          </div>
          <div className="text-sm text-slate-500 tabular-nums">
            {overallArithFmt.pct}
          </div>
        </div>
      </aside>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div className="space-y-6">
        {/* Tabs principales */}
        <div className="flex gap-2">
          {(['Serie', 'Geométrica'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setViewTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewTab === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ========== TAB: SERIE ========== */}
        {viewTab === 'Serie' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-800">
              Análisis de la serie · {selected ?? '—'}
            </h3>

            <div className="flex flex-wrap gap-2 mb-5">
              {(
                [
                  ['Rendimientos', 'Rendimientos'],
                  ['Acumulado', 'Acumulado'],
                  ['Drawdown', 'Drawdown'],
                  ['Volatilidad', 'Volatilidad móvil'],
                  ['MediaMóvil', 'Media móvil'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSeriesSubTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    seriesSubTab === key
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={360}>
              {seriesSubTab === 'Rendimientos' && (
                <ComposedChart data={enrichedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      `${Number(v).toFixed(6)} (${(Number(v) * 100).toFixed(4)} %)`,
                      'Rendimiento',
                    ]}
                  />
                  <Bar dataKey="positive" fill="#10b981" name="Positivo" />
                  <Bar dataKey="negative" fill="#ef4444" name="Negativo" />
                  <Brush dataKey="date" height={26} stroke="#94a3b8" />
                </ComposedChart>
              )}

              {seriesSubTab === 'Acumulado' && (
                <LineChart data={enrichedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: any) => [Number(v).toFixed(4), 'Crecimiento de $1']}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                    name="Acumulado"
                  />
                  <Brush dataKey="date" height={26} stroke="#94a3b8" />
                </LineChart>
              )}

              {seriesSubTab === 'Drawdown' && (
                <ComposedChart data={enrichedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      `${(Number(v) * 100).toFixed(2)} %`,
                      'Drawdown',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="#ef4444"
                    fill="#fecaca"
                    strokeWidth={1.5}
                    name="Drawdown"
                  />
                  <Brush dataKey="date" height={26} stroke="#94a3b8" />
                </ComposedChart>
              )}

              {seriesSubTab === 'Volatilidad' && (
                <LineChart data={enrichedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(3)} %` : 'N/D',
                      'Volatilidad (20 periodos)',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="volatility"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    name="Volatilidad móvil"
                  />
                  <Brush dataKey="date" height={26} stroke="#94a3b8" />
                </LineChart>
              )}

              {seriesSubTab === 'MediaMóvil' && (
                <LineChart data={enrichedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      `${(Number(v) * 100).toFixed(4)} %`,
                      String(name),
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="return"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    dot={false}
                    name="Rendimiento"
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    name="Media móvil (20)"
                  />
                  <Brush dataKey="date" height={26} stroke="#94a3b8" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* ========== TAB: GEOMÉTRICA ========== */}
        {viewTab === 'Geométrica' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-800">
              Media geométrica · {selected ?? '—'}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[{ name: selected ?? '—', value: selectedGeom }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => v.toFixed(4)} />
                <Tooltip
                  formatter={(v: any) => [
                    `${v.toFixed(6)} (${(v * 100).toFixed(4)} %)`,
                    'Geométrica',
                  ]}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {geomProcedure && !('error' in geomProcedure) && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm space-y-1">
                <div>n = <strong>{geomProcedure.n}</strong></div>
                <div>Σ ln(1 + rᵢ) = <strong>{geomProcedure.sumLog!.toFixed(8)}</strong></div>
                <div>media de ln = <strong>{geomProcedure.meanLog!.toFixed(8)}</strong></div>
                <div>
                  G = exp(media ln) − 1 ={' '}
                  <strong className="text-emerald-700">
                    {geomProcedure.geom!.toFixed(6)} ({(geomProcedure.geom! * 100).toFixed(4)} %)
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabla Geométrica */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-800">
            Media Geométrica por Portafolio
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Portafolio</th>
                  <th className="pb-2 font-medium text-right">Valor decimal</th>
                  <th className="pb-2 font-medium text-right">Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const g = formatBoth(geomByCompany[c])
                  return (
                    <tr
                      key={c}
                      className={`border-b border-slate-50 ${
                        selected === c ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="py-3 font-medium">{c}</td>
                      <td className="py-3 text-right tabular-nums font-medium text-emerald-700">
                        {g.raw}
                      </td>
                      <td className="py-3 text-right tabular-nums text-emerald-600/80">
                        {g.pct}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Barras de Geométrica */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              Media Geométrica (%)
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={geomBarsPct} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(2)}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(4)} %`, 'Geométrica']} />
                <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              Media Geométrica (decimal)
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={geomBarsRaw} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => v.toFixed(4)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(6)}`, 'Geométrica']} />
                <Bar dataKey="value" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ========== Frontera eficiente con Plotly ========== */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                Frontera eficiente (simulación Monte Carlo)
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Puedes hacer <strong>zoom</strong> y <strong>desplazarte</strong>. Doble clic para resetear.
              </p>
            </div>

            {/* ========== SELECTORES ========== */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Media:</span>
                <select
                  value={meanType}
                  onChange={(e) => setMeanType(e.target.value as 'arithmetic' | 'geometric')}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="arithmetic">Aritmética</option>
                  <option value="geometric">Geométrica</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Riesgo:</span>
                <select
                  value={riskType}
                  onChange={(e) => setRiskType(e.target.value as 'std' | 'variance')}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="std">Desviación estándar</option>
                  <option value="variance">Varianza</option>
                </select>
              </div>
            </div>
          </div>

          {portfolioSimulation === null ? (
            <p className="text-sm text-slate-500">
              Se necesitan al menos 2 portafolios y suficientes fechas comunes.
            </p>
          ) : (
            <Plot
              data={plotlyData as any}
              layout={{
                height: 560,
                margin: { t: 30, r: 30, b: 60, l: 70 },
                xaxis: {
                  title: riskType === 'std' ? 'Riesgo (desviación estándar)' : 'Riesgo (varianza)',
                  zeroline: false,
                  gridcolor: '#e2e8f0',
                },
                yaxis: {
                  title:
                    meanType === 'geometric'
                      ? 'Rendimiento esperado (media geométrica)'
                      : 'Rendimiento esperado (media aritmética)',
                  tickformat: '.2%',
                  zeroline: false,
                  gridcolor: '#e2e8f0',
                },
                legend: {
                  orientation: 'h',
                  y: 1.12,
                },
                plot_bgcolor: '#ffffff',
                paper_bgcolor: '#ffffff',
                hovermode: 'closest',
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                displaylogo: false,
              }}
              style={{ width: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}