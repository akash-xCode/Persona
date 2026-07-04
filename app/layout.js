import "./globals.css";

export const metadata = {
  title: "Persona Chatbot",
  description: "A small Hinglish persona chatbot built from transcript files."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

