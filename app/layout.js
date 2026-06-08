import "./globals.css";

export const metadata = {
  title: "Meridian",
  description: "AI-powered investment memo generator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
