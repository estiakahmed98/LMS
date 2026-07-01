'use client'

import AdminLayout from '@/components/AdminLayout'
import { mockNotifications } from '@/lib/mock-data'

export default function NotificationsPage() {

  return (
    <AdminLayout title='Notifications'>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">Notifications</h1>
        <div className="space-y-3">
          {mockNotifications.map((notif) => (
            <div key={notif.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-card-foreground">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
                  {notif.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
