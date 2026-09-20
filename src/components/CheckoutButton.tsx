"use client";


interface CheckoutButtonProps {
  planId: string;
  className?: string;
  children: React.ReactNode;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export function CheckoutButton({
  className = "",
  children,
}: CheckoutButtonProps) {
  return (
    <div className="w-full space-y-2">
      <button disabled className={`w-full cursor-not-allowed opacity-60 ${className}`}>{children}</button>
      <p className="text-xs text-amber-200 text-center">Live purchases unavailable. Paid features are not all implemented. <a href="/capabilities" className="underline">View status</a></p>
    </div>
  );
}
