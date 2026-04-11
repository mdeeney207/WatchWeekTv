import React from "react";

export default function PageWrap({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1840px] px-5 sm:px-8 lg:px-12 xl:px-14 2xl:px-16 ${className}`}
    >
      {children}
    </div>
  );
}