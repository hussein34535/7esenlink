'use client'

import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const navigation = [
    { name: 'Links', href: '/', icon: '📋' },
    { name: 'Categories', href: '/categories', icon: '📂' },
    { name: 'Import', href: '/import', icon: '📥' },
    { name: 'AI Manager', href: '/ai-manager', icon: '🤖' },
  ]

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground shadow-lg transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between h-16 px-4 border-b">
                  <h1 className="text-xl font-bold text-sidebar-foreground">IPTV Redirect</h1>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none"
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
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${pathname === item.href
                        ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
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
              <div className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-background/80 backdrop-blur-md border-b border-border">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <span className="sr-only">Open sidebar</span>
                  ☰
                </button>
                <div className="flex-1 max-w-2xl mx-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full px-4 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <ThemeToggle />
              </div>

              {/* Page content */}
              <main className="flex-1 p-6">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
