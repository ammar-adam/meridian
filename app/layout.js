import { Instrument_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import OnboardingHost from '@/components/onboarding-host'
import Providers from '@/app/providers'
import {
  isClerkConfigured,
  clerkKeysMatch,
  clerkPublishableKey,
  clerkSecretKey,
} from '@/lib/clerk-config'
import './globals.css'

const serif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400'],
})

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata = {
  title: 'Meridian',
  description: 'Deal screening workspace for investment teams.',
}

export default function RootLayout({ children }) {
  const clerkEnabled = isClerkConfigured()
    && clerkKeysMatch(clerkPublishableKey(), clerkSecretKey())

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers clerkEnabled={clerkEnabled}>
          <OnboardingHost />
          {children}
        </Providers>
      </body>
    </html>
  )
}
