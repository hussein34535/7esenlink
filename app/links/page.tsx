"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LinksRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Redirecting...</div>
    </div>
  )
}