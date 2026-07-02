import AdminSidebar from './AdminSidebar'
import TopNav from './TopNav'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav title={title} showLogo={false} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
