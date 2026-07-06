import React, { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(c => !c)} 
      />
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? 72 : 240 }}
      >
        {children}
      </main>
    </div>
  );
}
