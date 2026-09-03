import { useState } from 'react'
import * as XLSX from 'xlsx'
import initSqlJs from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'

type Props = {
  onData: (data: {
    rows: any[]
    source: string
    message?: string
    error?: string
  }) => void
}

function normalizeRow(raw: any) {
  const out: any = {}
  Object.keys(raw).forEach((k) => {
    const low = String(k).trim().toLowerCase()
    if (low === 'date' || low === 'fecha') out.date = raw[k]
    else if (low === 'price' || low === 'close') out.price = raw[k]
    else if (low === 'open') out.open = raw[k]
    else if (low === 'high') out.high = raw[k]
    else if (low === 'low') out.low = raw[k]
    else if (low === 'change' || low === '%change') out.change = raw[k]
    else if (low === 'empresa' || low === 'company') out.empresa = raw[k]
    else if (low === 'volumen' || low === 'volume') out.volumen = raw[k]
    else if (low === 'rendimiento' || low === 'return' || low === 'returns')
      out.rendimiento = raw[k]
    else out[k] = raw[k]
  })
  return out
}

function parseDate(v: any): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  const d = new Date(String(v))
  if (!isNaN(d.getTime())) return d
  const n = Number(v)
  if (!isNaN(n) && n > 59) {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30))
    return new Date(epoch.getTime() + n * 86400000)
  }
  return null
}

export async function parseBufferAndEmit(
  buffer: ArrayBuffer,
  name: string,
  onData: (data: {
    rows: any[]
    source: string
    message?: string
    error?: string
  }) => void,
  setLoading?: (v: boolean) => void,
  setError?: (s: string | null) => void
) {
  try {
    setLoading?.(true)
    setError?.(null)

    const lname = name.toLowerCase()
    let rawRows: any[] = []

    // ---------- Excel ----------
    if (lname.endsWith('.xlsx') || lname.endsWith('.xls')) {
        const wb = XLSX.read(buffer, { type: 'array' })
        const allRows: any[] = []

        for (const sheetName of wb.SheetNames) {
            const sheet = wb.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[]

            if (!json || json.length === 0) continue

            const sample = json[0]
            const keys = Object.keys(sample).map((k) => String(k).toLowerCase().trim())

            const hasDate = keys.some(
            (k) => k === 'date' || k === 'fecha' || k.includes('date')
            )
            const hasPrice = keys.some(
            (k) =>
                k === 'price' ||
                k === 'close' ||
                k === 'open' ||
                k.includes('price') ||
                k.includes('close')
            )
            const hasChange = keys.some(
            (k) =>
                k === 'change' ||
                k === '%change' ||
                k === 'd_ret' ||
                k.includes('change') ||
                k.includes('ret') ||
                k.includes('return')
            )

            if (hasDate && (hasPrice || hasChange)) {
            let empresa = sheetName
                .replace(/stock price history/gi, '')
                .replace(/historical data/gi, '')
                .replace(/price history/gi, '')
                .replace(/historial/gi, '')
                .trim()

            if (!empresa) empresa = sheetName

            json.forEach((row) => {
                allRows.push({
                ...row,
                Empresa: empresa,
                empresa: empresa,
                })
            })
            }
        }

        if (allRows.length === 0) {
            throw new Error(
            'No se encontraron hojas válidas con columnas Date + Price/Change.'
            )
        }

        rawRows = allRows
        }

    // ---------- SQLite / .db ----------
    else if (lname.endsWith('.db') || lname.endsWith('.sqlite')) {
      let SQL: any
      try {
        SQL = await initSqlJs({
          locateFile: () => sqlWasm,
        })
      } catch (err: any) {
        throw new Error(
          `No se pudo cargar sql.js: ${err?.message ?? String(err)}`
        )
      }

      const db = new SQL.Database(new Uint8Array(buffer))
      const tablesRes = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table'"
      )
      const tables = (tablesRes[0]?.values || []).map((r: any[]) => r[0])
      const tableName = tables.includes('portafolio')
        ? 'portafolio'
        : tables[0]

      if (!tableName) throw new Error('No se encontraron tablas en el .db')

      const q = db.exec(`SELECT * FROM "${tableName}" LIMIT 30000`)
      if (!q[0]) throw new Error(`Tabla vacía: ${tableName}`)

      const cols = q[0].columns
      rawRows = q[0].values.map((vals: any[]) => {
        const obj: any = {}
        vals.forEach((v, i) => (obj[cols[i]] = v))
        return obj
      })
    } else {
      throw new Error('Formato no soportado. Usa .xlsx o .db')
    }

    // ---------- Validaciones ----------
    if (!rawRows.length) {
      onData({ rows: [], source: name, error: 'No se detectaron filas' })
      return
    }

    const MAX = 50000
    if (rawRows.length > MAX) {
      rawRows = rawRows.slice(0, MAX)
      setError?.(`Archivo grande — se procesaron las primeras ${MAX} filas`)
    }

    // ---------- Normalización y cálculo de rendimientos ----------
    const normalized = rawRows.map(normalizeRow)
    const byCompany: Record<string, any[]> = {}

    normalized.forEach((r) => {
      const empresa = r.empresa != null ? String(r.empresa) : 'UNKNOWN'
      const date = parseDate(r.date)
      if (!byCompany[empresa]) byCompany[empresa] = []
      byCompany[empresa].push({ ...r, dateObj: date })
    })

    const finalRows: any[] = []

    Object.entries(byCompany).forEach(([empresa, arr]) => {
      // Ordenar por fecha
      arr.sort(
        (a, b) => (a.dateObj?.getTime() ?? 0) - (b.dateObj?.getTime() ?? 0)
      )

      let prevPrice: number | null = null

      for (const row of arr) {
        const out: any = { ...row }
        const price = row.price != null ? Number(row.price) : NaN
        out.price = Number.isFinite(price) ? price : null

        let rend: number | null = null

        // 1. Usar columna Rendimiento si existe
        if (row.rendimiento != null && row.rendimiento !== '') {
          const r = Number(row.rendimiento)
          if (Number.isFinite(r)) rend = r
        }

        // 2. Usar Change si no hay Rendimiento
        if (rend == null && row.change != null) {
          const c = Number(String(row.change).replace('%', ''))
          if (Number.isFinite(c)) rend = c / 100
        }

        // 3. Calcular a partir de Price (cambio porcentual)
        if (
          rend == null &&
          out.price != null &&
          prevPrice != null &&
          prevPrice !== 0
        ) {
          rend = out.price / prevPrice - 1
        }

        out.rendimiento = rend
        out.empresa = empresa
        finalRows.push(out)

        if (out.price != null) prevPrice = out.price
      }
    })

    onData({
      rows: finalRows,
      source: name,
      message: `Cargadas ${finalRows.length} filas · ${
        Object.keys(byCompany).length
      } portafolios`,
    })
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    setError?.(msg)
    onData({ rows: [], source: name, error: msg })
  } finally {
    setLoading?.(false)
  }
}

export default function FileUploader({ onData }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await parseBufferAndEmit(
      await file.arrayBuffer(),
      file.name,
      onData,
      setLoading,
      setError
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Subir archivo (.xlsx o .db)
      </label>
      <input
        type="file"
        accept=".xlsx,.xls,.db,.sqlite"
        onChange={handleFile}
        className="block w-full text-sm text-slate-600
          file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2
          file:text-sm file:font-medium file:text-white hover:file:bg-slate-800
          file:cursor-pointer cursor-pointer"
      />
      {loading && (
        <p className="mt-2 text-sm text-blue-600">Procesando archivo…</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}