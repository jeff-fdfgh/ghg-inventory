import { Leaf, Home, Shield, Search, FileText, Calculator, BarChart3, PieChart, FilePlus, Settings, LogOut } from 'lucide-react'
import { useAppContext } from './AppContext'
import { P0_BasicInfo } from './pages/P0_BasicInfo'
import { P1_Boundary } from './pages/P1_Boundary'
import { P2_Identification } from './pages/P2_Identification'
import { P3_ActivityData } from './pages/P3_ActivityData'
import { P4_Quantification } from './pages/P4_Quantification'
import { P5_DataQuality } from './pages/P5_DataQuality'
import { P6_Dashboard } from './pages/P6_Dashboard'
import { P7_Uncertainty } from './pages/P7_Uncertainty'
import { P8_Supplementary } from './pages/P8_Supplementary'

const tabs = [
  { id: 'basic', label: '0. 基本資料', icon: Home },
  { id: 'boundary', label: '1. 邊界設定', icon: Shield },
  { id: 'identify', label: '2. 排放源鑑別', icon: Search },
  { id: 'activity', label: '3. 活動數據', icon: FileText },
  { id: 'quant', label: '4. 定量盤查', icon: Calculator },
  { id: 'quality', label: '5. 數據品質', icon: BarChart3 },
  { id: 'uncertainty', label: '6. 不確定性', icon: BarChart3 },
  { id: 'dashboard', label: '7. 排放量彙總', icon: PieChart },
  { id: 'supplementary', label: '8. 輔助申報', icon: FilePlus },
  { id: 'ref', label: '9. 係數參考', icon: Settings },
]

function App() {
  const { activeTab, setActiveTab, gwpVersion } = useAppContext()

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen bg-background text-on-surface">
      {/* SideNavBar Component matching code.html */}
      <aside className="h-screen w-[260px] fixed left-0 top-0 flex flex-col bg-surface py-8 pl-4 space-y-6 z-50 border-r border-outline-variant/10">
        <div className="px-4 mb-8">
          <h1 className="text-primary font-black text-xl tracking-tighter flex items-center gap-2">
            <Leaf size={24} /> Carbon Tracker
          </h1>
          <p className="font-['Manrope'] font-semibold text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">Enterprise Audit v1.7</p>
        </div>

        <nav className="flex flex-col space-y-2">
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                className={`flex items-center space-x-3 px-4 py-3 rounded-r-full mr-4 transition-transform duration-200 ${isActive
                  ? 'bg-primary text-white'
                  : 'text-on-surface/80 hover:bg-surface-container-low hover:text-on-surface hover:translate-x-1'
                  }`}
                onClick={() => setActiveTab(t.id)}
              >
                <t.icon size={18} />
                <span className="font-['Manrope'] font-bold text-sm uppercase tracking-wider">{t.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto px-4 pr-8">
          <button
            className="w-full py-4 bg-outline-variant/20 hover:bg-error-container hover:text-error text-on-surface-variant rounded-xl font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors"
            onClick={() => { if (confirm('確定登出？(本地資料會清除)')) { localStorage.clear(); location.reload(); } }}
          >
            <LogOut size={18} />
            <span className="text-sm">登出系統</span>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <div className="col-start-2 p-8 lg:p-12">
        {/* TopAppBar matching code.html */}
        <header className="w-full h-16 sticky top-0 z-40 bg-surface/80 backdrop-blur-md flex items-center justify-between mb-12 border-b border-outline-variant/10">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-extrabold text-primary tracking-tighter">Precision Ecology</h2>
            <div className="h-6 w-[1px] bg-outline-variant/30"></div>
            <span className="font-label text-sm text-on-surface-variant">ISO 14064-1 環境盤查系統</span>
          </div>
        </header>

        {activeTab === 'basic' && <P0_BasicInfo />}
        {activeTab === 'boundary' && <P1_Boundary />}
        {activeTab === 'identify' && <P2_Identification />}
        {activeTab === 'activity' && <P3_ActivityData />}
        {activeTab === 'quant' && <P4_Quantification />}
        {activeTab === 'quality' && <P5_DataQuality />}
        {activeTab === 'uncertainty' && <P7_Uncertainty />}
        {activeTab === 'dashboard' && <P6_Dashboard />}
        {activeTab === 'supplementary' && <P8_Supplementary />}
        {activeTab === 'ref' && (
          <div className="card">
            <h2>8. 係數管理/參考</h2>
            <ul style={{ lineHeight: 2.2, color: 'var(--text-muted)' }}>
              <li>🔗 <a href="https://ghgregistry.moenv.gov.tw" target="_blank" rel="noreferrer">環境部溫室氣體排放係數管理表 6.0.4版</a></li>
              <li>🔗 <a href="https://data.moenv.gov.tw" target="_blank" rel="noreferrer">環境資料開放平臺</a></li>
              <li>📋 電力排碳係數 (113年度)：0.474 kgCO2e/度</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📋 GWP 版本：請至「3. 活動數據」設定與調整各排放源的 GWP 參數。
              </li>
              <li>
                <table style={{ fontSize: '0.8rem', marginTop: '0.5rem', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '4px 8px', border: '1px solid var(--border)' }}>氣體</th>
                    <th style={{ padding: '4px 8px', border: '1px solid var(--border)' }}>AR5</th>
                    <th style={{ padding: '4px 8px', border: '1px solid var(--border)' }}>AR6</th>
                  </tr></thead>
                  <tbody>
                    {[['CO2', 1, 1], ['CH4', 28, 27.9], ['N2O', 265, 273], ['SF6', 23500, 25200], ['NF3', 16100, 17400]].map(([g, a5, a6]) => (
                      <tr key={g as string} style={{ background: gwpVersion === 'AR5' ? (g === 'CO2' ? '' : '') : '' }}>
                        <td style={{ padding: '3px 8px', border: '1px solid var(--border)', fontWeight: 600 }}>{g}</td>
                        <td style={{ padding: '3px 8px', border: '1px solid var(--border)', fontWeight: gwpVersion === 'AR5' ? 700 : 400, color: gwpVersion === 'AR5' ? '#10b981' : 'inherit' }}>{a5}</td>
                        <td style={{ padding: '3px 8px', border: '1px solid var(--border)', fontWeight: gwpVersion === 'AR6' ? 700 : 400, color: gwpVersion === 'AR6' ? '#10b981' : 'inherit' }}>{a6}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
