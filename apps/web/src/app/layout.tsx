import './global.css';
import { Providers } from './providers';

export const metadata = {
  title: 'ag2 — Mobile App Builder',
  description: 'Turn your website into a native Android and iOS app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
