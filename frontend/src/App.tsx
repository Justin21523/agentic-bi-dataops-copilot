import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NLQuery from './pages/NLQuery'
import SQLPlayground from './pages/SQLPlayground'
import QueryHistory from './pages/QueryHistory'
import DataQuality from './pages/DataQuality'
import MetadataExplorer from './pages/MetadataExplorer'
import CustomerAnalytics from './pages/CustomerAnalytics'
import ProductMatrix from './pages/ProductMatrix'
import FunnelCohort from './pages/FunnelCohort'
import GuardrailAnalytics from './pages/GuardrailAnalytics'
import InsightCards from './pages/InsightCards'
import UploadPage from './pages/UploadPage'
import RevenueIntelligence from './pages/RevenueIntelligence'
import WorkflowMap from './pages/WorkflowMap'
import { JourneyProvider } from './context/JourneyContext'
import JourneyPanel from './components/journey/JourneyPanel'
import JourneyLauncher from './components/journey/JourneyLauncher'
import JourneySpotlight from './components/journey/JourneySpotlight'
import JourneyOverlayLayer from './components/journey/JourneyOverlayLayer'

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
      <JourneyProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflow" element={<WorkflowMap />} />
            <Route path="/query" element={<NLQuery />} />
            <Route path="/playground" element={<SQLPlayground />} />
            <Route path="/history" element={<QueryHistory />} />
            <Route path="/dq" element={<DataQuality />} />
            <Route path="/schema" element={<MetadataExplorer />} />
            <Route path="/customers" element={<CustomerAnalytics />} />
            <Route path="/products" element={<ProductMatrix />} />
            <Route path="/funnel" element={<FunnelCohort />} />
            <Route path="/guardrails" element={<GuardrailAnalytics />} />
            <Route path="/insights" element={<InsightCards />} />
            <Route path="/revenue"  element={<RevenueIntelligence />} />
            <Route path="/upload"   element={<UploadPage />} />
          </Routes>
        </Layout>
        <JourneySpotlight />
        <JourneyOverlayLayer />
        <JourneyPanel />
        <JourneyLauncher />
      </JourneyProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
