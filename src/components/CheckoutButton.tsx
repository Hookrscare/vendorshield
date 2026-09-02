"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface CheckoutButtonProps {
  planId: string;
  className?: string;
  children: React.ReactNode;
  customerEmail?: string;
}

export function CheckoutButton({
  planId,
  className = "",
  children,
  customerEmail,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          customerEmail,
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting to Checkout...</span>
          </>
        ) : (
          children
        )}
      </button>
      {error && (
        <p className="text-[11px] text-rose-400 text-center mt-1.5 font-mono">
          {error}
        </p>
      )}
    </div>
  );
}
