import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Travel Planner - AI-Powered Trip Planning',
  description: 'Plan your perfect trip with AI-powered recommendations and real-time collaboration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}



import './globals.css'