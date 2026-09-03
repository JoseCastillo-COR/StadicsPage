export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* ========== HERO ========== */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Laboratorio de Portafolios
        </h1>
        <p className="mt-3 text-lg text-slate-600 leading-relaxed">
          Herramienta educativa para el análisis de series de rendimientos,
          cálculo de medias, evaluación de riesgo y exploración de la frontera
          eficiente. Diseñada para equipos de estadística y finanzas que
          trabajan con modelos de predicción e inversión.
        </p>
      </div>

      {/* ========== ¿QUÉ ES UN PORTAFOLIO? ========== */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          ¿Qué es un portafolio?
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Un <strong>portafolio de inversión</strong> es un conjunto de activos
            financieros (acciones, bonos, fondos, etc.) que una persona o
            institución posee. La idea central es <em>no poner todos los huevos
            en la misma canasta</em>: al combinar varios activos se puede
            reducir el riesgo total sin necesariamente sacrificar rendimiento.
          </p>
          <p>
            En esta aplicación, cada <strong>Empresa</strong> (Apple, Mastercard,
            Exxon Mobil, etc.) se trata como un portafolio individual. Cuando
            subes un archivo con varias empresas, el sistema las analiza por
            separado y también permite estudiar combinaciones entre ellas
            (frontera eficiente).
          </p>

          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="font-medium text-slate-800 mb-1">Portafolio de un solo activo</div>
              <p className="text-xs text-slate-600">
                Solo contiene una empresa. Es el caso más simple: analizamos su
                serie de rendimientos, media geométrica, drawdown, etc.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="font-medium text-slate-800 mb-1">Portafolio multi-activo</div>
              <p className="text-xs text-slate-600">
                Combina varios activos con diferentes pesos. Aquí entra la
                frontera eficiente y la simulación Monte Carlo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONCEPTOS CLAVE ========== */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Conceptos clave
        </h2>

        <div className="space-y-5">
          {/* Rendimiento */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">Rendimiento (Return)</h3>
            <p className="mt-2 text-sm text-slate-600">
              Es el cambio porcentual del precio de un activo entre dos periodos
              consecutivos. Si el precio pasa de $100 a $105, el rendimiento es
              +5% (0.05 en decimal).
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
              r<sub>t</sub> = (P<sub>t</sub> / P<sub>t−1</sub>) − 1
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Si el archivo ya trae la columna <code>Change</code> o{' '}
              <code>Rendimiento</code>, se usa directamente. Si no, se calcula
              a partir de la columna <code>Price</code>.
            </p>
          </div>

          {/* Media Aritmética */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">Media Aritmética</h3>
            <p className="mt-2 text-sm text-slate-600">
              Es el promedio simple de todos los rendimientos. En esta
              aplicación se calcula de forma <strong>global</strong>: se juntan
              todos los rendimientos de todas las empresas como si fueran un
              solo conjunto de datos.
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
              r̄ = (1/n) Σ r<sub>i</sub>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Útil como referencia rápida del “rendimiento promedio” del
              conjunto completo de datos cargados.
            </p>
          </div>

          {/* Media Geométrica */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">Media Geométrica</h3>
            <p className="mt-2 text-sm text-slate-600">
              Representa el rendimiento compuesto real a lo largo del tiempo.
              Es la medida correcta para evaluar el desempeño histórico de un
              portafolio, porque tiene en cuenta el efecto de la
              capitalización.
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
              G = [ ∏ (1 + r<sub>i</sub>) ]<sup>1/n</sup> − 1
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Versión numéricamente estable que usa la aplicación:
            </p>
            <div className="mt-1 rounded-lg bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
              G = exp( (1/n) Σ ln(1 + r<sub>i</sub>) ) − 1
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <strong>Importante:</strong> la media geométrica se calcula{' '}
              <em>por cada empresa</em> (cada una es un portafolio independiente).
            </p>
          </div>

          {/* Ejemplo pequeño */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-semibold text-amber-900">Ejemplo numérico</h3>
            <p className="mt-2 text-sm text-amber-800">
              Supongamos tres rendimientos: +10%, −5% y +20%.
            </p>
            <ul className="mt-2 text-sm text-amber-800 space-y-1 list-disc pl-5">
              <li>
                Media aritmética = (0.10 − 0.05 + 0.20) / 3 = <strong>0.0833 (8.33%)</strong>
              </li>
              <li>
                Media geométrica = [(1.10)×(0.95)×(1.20)]<sup>1/3</sup> − 1 ≈{' '}
                <strong>0.0772 (7.72%)</strong>
              </li>
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              La geométrica siempre es menor o igual que la aritmética cuando hay
              volatilidad. Esa diferencia es el “costo” de la volatilidad.
            </p>
          </div>

          {/* Frontera Eficiente */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">
              Frontera Eficiente
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Es el conjunto de portafolios que ofrecen el{' '}
              <strong>mayor rendimiento esperado</strong> para un nivel dado de
              riesgo (medido como desviación estándar). Cualquier portafolio
              que esté por debajo de la frontera es “ineficiente”: se puede
              obtener más rendimiento con el mismo riesgo, o el mismo
              rendimiento con menos riesgo.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              En esta herramienta se aproxima mediante{' '}
              <strong>simulación Monte Carlo</strong>: se generan miles de
              combinaciones aleatorias de pesos y se calculan su riesgo y
              rendimiento. Luego se dibuja la “nube” de puntos y se extrae la
              frontera superior.
            </p>
          </div>

          {/* Monte Carlo */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">
              Simulación Monte Carlo
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Técnica que consiste en generar muchos escenarios aleatorios para
              aproximar un resultado complejo. Aquí se usa para explorar el
              espacio de posibles portafolios:
            </p>
            <ol className="mt-3 text-sm text-slate-600 space-y-1 list-decimal pl-5">
              <li>Se generan pesos aleatorios para cada activo (que sumen 100%).</li>
              <li>Se calcula el rendimiento esperado del portafolio (promedio ponderado).</li>
              <li>Se calcula el riesgo (desviación estándar usando la matriz de covarianza).</li>
              <li>Se repite miles de veces y se grafican todos los puntos.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ========== MÉTRICAS DE LA SERIE ========== */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Métricas de la serie temporal
        </h2>
        <p className="text-sm text-slate-600 mb-5">
          Además de las medias, la aplicación calcula varias series derivadas
          para entender mejor el comportamiento de cada portafolio:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-medium text-slate-800">Rendimiento acumulado</h3>
            <p className="mt-1 text-xs text-slate-600">
              Muestra cómo crece $1 invertido a lo largo del tiempo. Se calcula
              multiplicando sucesivamente (1 + r<sub>t</sub>).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-medium text-slate-800">Drawdown</h3>
            <p className="mt-1 text-xs text-slate-600">
              Mide las caídas desde el máximo histórico. Responde a la pregunta:
              “¿cuánto he perdido desde el mejor momento?”.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-medium text-slate-800">Volatilidad móvil</h3>
            <p className="mt-1 text-xs text-slate-600">
              Desviación estándar de los últimos N periodos (por defecto 20).
              Permite ver en qué momentos el activo fue más “nervioso”.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-medium text-slate-800">Media móvil</h3>
            <p className="mt-1 text-xs text-slate-600">
              Promedio de los últimos N rendimientos. Suaviza el ruido de la
              serie diaria y ayuda a ver la tendencia.
            </p>
          </div>
        </div>
      </section>

      {/* ========== CÓMO FUNCIONA EL SISTEMA ========== */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Cómo funciona el sistema
        </h2>

        <div className="space-y-4 text-sm text-slate-700">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">1. Carga de datos</h3>
            <p>
              Puedes subir un archivo <code className="bg-slate-100 px-1 rounded">.xlsx</code> o{' '}
              <code className="bg-slate-100 px-1 rounded">.db</code>.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600">
              <li>
                Si es Excel con <strong>varias hojas</strong>, el sistema detecta
                automáticamente cuáles tienen estructura de precios (Date +
                Price/Change) y usa el nombre de la hoja como nombre del
                portafolio.
              </li>
              <li>
                Si es un <code>.db</code>, lee la tabla principal (preferiblemente
                llamada <code>portafolio</code>).
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">2. Normalización</h3>
            <p>
              Las columnas se reconocen sin importar mayúsculas/minúsculas ni
              algunos alias comunes (<code>Close</code> → Price,{' '}
              <code>Return</code> → Rendimiento, etc.).
            </p>
            <p className="mt-2">
              Si no existe la columna de rendimiento, se calcula a partir de
              los precios de cierre consecutivos <strong>por cada empresa</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">3. Análisis</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Media geométrica por cada portafolio (empresa).</li>
              <li>Media aritmética global (todos los datos juntos).</li>
              <li>Series temporales enriquecidas (acumulado, drawdown, volatilidad, media móvil).</li>
              <li>Simulación Monte Carlo para aproximar la frontera eficiente.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2">4. Convertidor</h3>
            <p>
              La sección <strong>Convertidor</strong> permite transformar
              archivos de un formato a otro:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong>.xlsx → .db</strong>: junta las hojas válidas en una
                tabla <code>portafolio</code> con columna <code>Empresa</code>.
              </li>
              <li>
                <strong>.db → .xlsx</strong>: exporta cada tabla como hoja y,
                si existe la columna Empresa, también crea hojas separadas por
                empresa.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========== COLUMNAS ACEPTADAS ========== */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Columnas aceptadas
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Columna</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alias aceptados</th>
                <th className="px-4 py-3 font-medium text-slate-700">Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">Date</td>
                <td className="px-4 py-2.5 text-slate-600">Fecha</td>
                <td className="px-4 py-2.5 text-slate-600">Orden temporal obligatorio</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">Empresa</td>
                <td className="px-4 py-2.5 text-slate-600">Company</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Identificador del portafolio (si no existe, se usa el nombre de la hoja)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">Price</td>
                <td className="px-4 py-2.5 text-slate-600">Close</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Precio de cierre (se usa para calcular rendimientos)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">Rendimiento</td>
                <td className="px-4 py-2.5 text-slate-600">Return, Returns, D_RET</td>
                <td className="px-4 py-2.5 text-slate-600">Rendimiento ya calculado</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">Change</td>
                <td className="px-4 py-2.5 text-slate-600">%Change</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Alternativa al rendimiento (se convierte a decimal)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs">Open / High / Low / Volumen</td>
                <td className="px-4 py-2.5 text-slate-600">—</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Se leen pero no se usan en los cálculos actuales
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          El sistema es tolerante con mayúsculas/minúsculas y con nombres de
          columnas en español o inglés.
        </p>
      </section>

      {/* ========== FLUJO RECOMENDADO ========== */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Flujo de trabajo recomendado
        </h2>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
              1
            </span>
            <span>
              Prepara tus datos en Excel (una hoja por empresa) o en un archivo
              <code className="mx-1 bg-slate-100 px-1 rounded">.db</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
              2
            </span>
            <span>
              Si necesitas cambiar de formato, usa el <strong>Convertidor</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
              3
            </span>
            <span>
              Ve a <strong>Análisis</strong>, sube el archivo y explora las
              métricas por portafolio, las series temporales y la frontera
              eficiente.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
              4
            </span>
            <span>
              Interpreta los resultados: media geométrica (desempeño real),
              drawdown (riesgo de caídas) y posición en la frontera (eficiencia
              del portafolio).
            </span>
          </li>
        </ol>
      </section>
    </div>
  )
}