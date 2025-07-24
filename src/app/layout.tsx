import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shapash - Your AI Wedding Planning Expert',
  description: 'Shapash is your AI-powered wedding planning companion. Get personalized advice, vendor recommendations, timeline guidance, and expert tips for your perfect wedding day. Chat with wedding experts and organize your planning resources.',
  keywords: ['wedding planning', 'AI wedding assistant', 'wedding advice', 'wedding vendors', 'bridal planning', 'wedding timeline', 'wedding tips', 'engaged couples', 'wedding expert'],
  authors: [{ name: 'Shapash Wedding Planning Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Shapash - Your AI Wedding Planning Expert',
    description: 'Get personalized wedding planning advice, vendor recommendations, and expert guidance for your perfect day',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shapash - Your AI Wedding Planning Expert',
    description: 'AI-powered wedding planning companion with personalized advice and expert guidance',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="mask-icon" href="/favicon.svg" color="#F43F5E" />
        <meta name="theme-color" content="#F43F5E" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
} 