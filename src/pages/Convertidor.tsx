import { useState } from 'react'
import * as XLSX from 'xlsx'
import initSqlJs from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'

type ConversionResult = {
  filename: string
  blob: Blob
  message: string
}

export default function Convertidor() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [fileInfo, setFileInfo] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)
    setFileInfo(null)

    try {
      const buffer = await file.arrayBuffer()
      const name = file.name.toLowerCase()

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        // ========== .xlsx → .db ==========
        const wb = XLSX.read(buffer, { type: 'array' })
        const allRows: any[] = []
        const sheetNamesUsed: string[] = []

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

            sheetNamesUsed.push(empresa)

            json.forEach((row) => {
              allRows.push({
                ...row,
                Empresa: empresa,
              })
            })
          }
        }

        if (allRows.length === 0) {
          throw new Error(
            'No se encontraron hojas válidas con columnas Date + Price/Change.'
          )
        }

        // Crear base de datos SQLite en memoria
        const SQL = await initSqlJs({ locateFile: () => sqlWasm })
        const db = new SQL.Database()

        // Obtener todas las columnas posibles
        const allKeys = new Set<string>()
        allRows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)))
        const columns = Array.from(allKeys)

        // Crear tabla
        const colDefs = columns.map((c) => `"${c}" TEXT`).join(', ')
        db.run(`CREATE TABLE portafolio (${colDefs})`)

        // Insertar filas
        const placeholders = columns.map(() => '?').join(', ')
        const insertStmt = db.prepare(
          `INSERT INTO portafolio (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
        )

        allRows.forEach((row) => {
          const values = columns.map((c) => {
            const v = row[c]
            return v == null ? null : String(v)
          })
          insertStmt.run(values)
        })
        insertStmt.free()

        const data = db.export()
        const blob = new Blob([data], { type: 'application/x-sqlite3' })

        const outName = file.name.replace(/\.(xlsx|xls)$/i, '') + '.db'

        setFileInfo(
          `Se detectaron ${sheetNamesUsed.length} hojas válidas: ${sheetNamesUsed.join(', ')} → ${allRows.length} filas`
        )
        setResult({
          filename: outName,
          blob,
          message: `Conversión exitosa: ${allRows.length} filas guardadas en la tabla "portafolio"`,
        })
      } else if (name.endsWith('.db') || name.endsWith('.sqlite')) {
        // ========== .db → .xlsx ==========
        const SQL = await initSqlJs({ locateFile: () => sqlWasm })
        const db = new SQL.Database(new Uint8Array(buffer))

        const tablesRes = db.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        const tables = (tablesRes[0]?.values || []).map((r: any[]) => r[0] as string)

        if (tables.length === 0) {
          throw new Error('No se encontraron tablas en el archivo .db')
        }

        const wb = XLSX.utils.book_new()

        for (const tableName of tables) {
          const result = db.exec(`SELECT * FROM "${tableName}"`)
          if (!result[0]) continue

          const cols = result[0].columns
          const rows = result[0].values.map((vals: any[]) => {
            const obj: any = {}
            vals.forEach((v, i) => {
              obj[cols[i]] = v
            })
            return obj
          })

          const ws = XLSX.utils.json_to_sheet(rows)
          // Limitar nombre de hoja a 31 caracteres (límite de Excel)
          const safeName = tableName.slice(0, 31)
          XLSX.utils.book_append_sheet(wb, ws, safeName)
        }

        // Si solo hay una tabla y tiene columna Empresa, también crear hojas separadas por empresa
        if (tables.length === 1) {
          const mainTable = tables[0]
          const result = db.exec(`SELECT * FROM "${mainTable}"`)
          if (result[0]) {
            const cols = result[0].columns
            const hasEmpresa = cols.some(
              (c) => c.toLowerCase() === 'empresa' || c.toLowerCase() === 'company'
            )

            if (hasEmpresa) {
              const rows = result[0].values.map((vals: any[]) => {
                const obj: any = {}
                vals.forEach((v, i) => (obj[cols[i]] = v))
                return obj
              })

              const byEmpresa: Record<string, any[]> = {}
              rows.forEach((r) => {
                const emp =
                  r.Empresa || r.empresa || r.Company || r.company || 'UNKNOWN'
                if (!byEmpresa[emp]) byEmpresa[emp] = []
                byEmpresa[emp].push(r)
              })

              // Solo agregamos hojas extra si hay más de 1 empresa
              if (Object.keys(byEmpresa).length > 1) {
                Object.entries(byEmpresa).forEach(([emp, empRows]) => {
                  const ws = XLSX.utils.json_to_sheet(empRows)
                  const safeName = String(emp).slice(0, 31)
                  // Evitar duplicar si ya existe
                  if (!wb.SheetNames.includes(safeName)) {
                    XLSX.utils.book_append_sheet(wb, ws, safeName)
                  }
                })
              }
            }
          }
        }

        const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([xlsxBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const outName = file.name.replace(/\.(db|sqlite)$/i, '') + '.xlsx'

        setFileInfo(`Tablas encontradas: ${tables.join(', ')}`)
        setResult({
          filename: outName,
          blob,
          message: `Conversión exitosa: ${tables.length} tabla(s) exportada(s)`,
        })
      } else {
        throw new Error('Formato no soportado. Usa .xlsx o .db')
      }
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  const downloadResult = () => {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Convertidor .xlsx ↔ .db
        </h1>
        <p className="mt-2 text-slate-600">
          Sube un archivo y se detectará automáticamente el formato.
          Puedes convertir de Excel a SQLite y viceversa.
        </p>
      </div>

      {/* Uploader */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selecciona un archivo (.xlsx o .db)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.db,.sqlite"
          onChange={handleFile}
          className="block w-full text-sm text-slate-600
            file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5
            file:text-sm file:font-medium file:text-white hover:file:bg-slate-800
            file:cursor-pointer cursor-pointer"
        />

        {loading && (
          <p className="mt-4 text-sm text-blue-600">Procesando archivo…</p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {fileInfo && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {fileInfo}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-emerald-800 mb-4">{result.message}</p>
            <button
              onClick={downloadResult}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              Descargar {result.filename}
            </button>
          </div>
        )}
      </div>

      {/* Ayuda */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 space-y-3">
        <h3 className="font-semibold text-slate-800">Cómo funciona</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>.xlsx → .db</strong>: Detecta automáticamente las hojas que
            tienen columnas de precios (Date + Price/Change). Usa el nombre de
            la hoja como <code>Empresa</code> y guarda todo en una tabla llamada{' '}
            <code>portafolio</code>.
          </li>
          <li>
            <strong>.db → .xlsx</strong>: Exporta cada tabla como una hoja de
            Excel. Si la tabla tiene columna <code>Empresa</code>, también crea
            hojas separadas por empresa.
          </li>
        </ul>
      </div>
    </div>
  )
}