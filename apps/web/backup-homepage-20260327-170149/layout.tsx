import './globals.css'

export const metadata = {
  title: 'MUWAHID - Umroh Mandiri',
  description: 'Platform Umroh Mandiri',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
}
