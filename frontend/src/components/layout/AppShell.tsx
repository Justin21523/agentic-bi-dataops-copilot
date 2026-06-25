import { Outlet } from 'react-router-dom';
import { DemoGuideAssistant } from '../common/DemoGuideAssistant';
import { SafetyNotice } from '../common/SafetyNotice';
import { WorkflowStepper } from '../common/WorkflowStepper';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="top-frame">
        <Header />
        <Sidebar />
      </div>
      <main className="main-panel">
        <WorkflowStepper />
        <SafetyNotice />
        <Outlet />
      </main>
      <DemoGuideAssistant />
    </div>
  );
}
