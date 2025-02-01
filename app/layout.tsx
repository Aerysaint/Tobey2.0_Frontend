import "@/styles/globals.css"
import { Inter, Montserrat } from 'next/font/google'
import { Providers } from './providers'
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/app/contexts/auth-context"

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat'
})

export const metadata: Metadata = {
  title: 'Tobey - AI-Powered Trip Planning',
  description: 'Plan your perfect trip with AI-powered recommendations and real-time collaboration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${montserrat.variable} font-inter`}>
        <AuthProvider>
          <Providers>
            {children}
          </Providers>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}