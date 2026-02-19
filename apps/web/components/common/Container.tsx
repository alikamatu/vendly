import React from "react";

export default function Container({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`mx-auto max-w-7xl px-4 ${className}`}>{children}</div>;
}
