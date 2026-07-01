'use client'

import AdminLayout from '@/components/AdminLayout'

export default function SettingsPage() {

  return (
    <AdminLayout title='Settings'>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Settings</h1>
        
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-bold text-card-foreground mb-4">System Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Institution Name
                </label>
                <input
                  type="text"
                  placeholder="PSTC"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  placeholder="support@pstc.edu"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button className="w-full px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
