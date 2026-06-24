import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import OnboardingHost from '@/components/onboarding-host'
import Providers from '@/app/providers'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata = {
  title: 'Meridian',
  description: 'Deal screening workspace for investment teams.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <OnboardingHost />
          {children}
        </Providers>
      </body>
    </html>
  )
}
