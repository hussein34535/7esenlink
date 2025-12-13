'use client'

import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const navigation = [
    { name: 'Import', href: '/', icon: '📥' },
    { name: 'Links', href: '/links', icon: '📋' },
  ]

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-100">
          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between h-16 px-4 border-b">
                <h1 className="text-xl font-bold text-gray-900">IPTV Redirect</h1>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <span className="sr-only">Close sidebar</span>
                  ✕
                </button>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className={`flex flex-col flex-1 ${isSidebarOpen ? 'ml-64' : ''} transition-all duration-200 ease-in-out`}>
            {/* Top bar */}
            <div className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white shadow-sm">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <span className="sr-only">Open sidebar</span>
                ☰
              </button>
              <div className="flex-1 max-w-2xl mx-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Page content */}
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
