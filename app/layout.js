import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from './components/ToastProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata = {
  title: 'NovaPulse — AI-Powered News',
  description: 'NovaPulse delivers the latest global news enhanced with AI-powered summaries and sentiment analysis. Stay informed, stay ahead.',
  openGraph: {
    title: 'NovaPulse — AI-Powered News',
    description: 'The next generation news experience. AI summaries, sentiment analysis, and real-time global coverage.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0a0e1a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
