import { Plus_Jakarta_Sans, JetBrains_Mono, Fraunces } from 'next/font/google'
import OnboardingHost from '@/components/onboarding-host'
import Providers from '@/app/providers'
import {
  isClerkConfigured,
  clerkKeysMatch,
  clerkPublishableKey,
  clerkSecretKey,
} from '@/lib/clerk-config'
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

// Editorial serif with a spine — dossier headlines + brand wordmark.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
})

export const metadata = {
  title: 'Meridian',
  description: 'Deal screening workspace for investment teams.',
}

export default function RootLayout({ children }) {
  const clerkEnabled = isClerkConfigured()
    && clerkKeysMatch(clerkPublishableKey(), clerkSecretKey())

  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers clerkEnabled={clerkEnabled}>
          <OnboardingHost />
          {children}
        </Providers>
      </body>
    </html>
  )
}
