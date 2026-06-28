import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/providers/app-providers";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Manage your projects and tasks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
