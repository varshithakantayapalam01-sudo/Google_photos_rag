import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`mx-auto w-full max-w-7xl px-6 py-6 ${className}`}>
      {children}
    </main>
  );
}
