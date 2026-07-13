import type { Metadata } from "next"
import "./globals.css"
import { packet } from "@/lib/report"

export const metadata: Metadata = {
  title: `${packet.client} — Intelligence report`,
  description: packet.objective,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="page-grid" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
