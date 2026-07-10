"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: "0.5rem 1.25rem",
        background: "#1a6bbf",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 600,
      }}
    >
      Print / Save PDF
    </button>
  );
}
