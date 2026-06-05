import type { Metadata, Viewport } from 'next'

import './globals.css'


export const metadata: Metadata = {

  title: 'Distinction PLE Tutor',

  description: 'P7 PLE preparation app for Ugandan students — Maths, English and Science',

  manifest: '/manifest.json',

  appleWebApp: {

    capable: true,

    statusBarStyle: 'default',

    title: 'PLE Tutor',

  },

}


export const viewport: Viewport = {

  width: 'device-width',

  initialScale: 1,

  maximumScale: 1,

  themeColor: '#534AB7',

}


export default function RootLayout({

  children,

}: {

  children: React.ReactNode

}) {

  return (

    <html lang="en">

      <body>

        <div className="app-shell">

          {children}

        </div>

      </body>

    </html>

  )

}


