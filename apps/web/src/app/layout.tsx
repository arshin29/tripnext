import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { WishlistProvider } from '../context/WishlistContext';

export const metadata: Metadata = {
  title: 'TripNext — Every journey, thoughtfully planned.',
  description:
    'A premium travel planning and collaboration platform for curating journeys, managing itineraries, and coordinating with travel companions.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-primary-text font-sans antialiased flex flex-col">
        <AuthProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
