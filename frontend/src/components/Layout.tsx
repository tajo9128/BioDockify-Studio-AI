import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatusBar } from '@/components/StatusBar'

export function Layout() {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
