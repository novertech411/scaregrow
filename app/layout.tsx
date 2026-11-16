import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { GreenerSessionProvider } from '@/components/session/greener-session'

const inter = localFont({
  src: './fonts/Inter-Variable.ttf',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Greener | Farm monitoring',
  description: 'Operational farm and soil monitoring for Green Eden Farms.',
  icons: {
    icon: [{ url: '/images/greener-tab.png', type: 'image/png', sizes: '48x48' }],
    apple: [{ url: '/images/greener-apple.png', type: 'image/png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <GreenerSessionProvider>{children}</GreenerSessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
