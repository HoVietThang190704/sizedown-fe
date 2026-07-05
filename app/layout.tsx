import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SizeDown - Giảm kích thước tài liệu",
  description: "Upload và nén PDF, ảnh, DOCX, PPTX trực tuyến."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
