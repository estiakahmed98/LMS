import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface LearnerShellProps {
  user?: { name: string }
  children: React.ReactNode
}

export default function LearnerShell({ user, children }: LearnerShellProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
