import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIOMOV AI - Performance & Recovery",
  description: "Entrenamiento Inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="bg-[#102218] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
