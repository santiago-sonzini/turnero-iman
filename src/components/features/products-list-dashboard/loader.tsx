
import { useState, useEffect } from "react";

export default function DashboardLoader({ color = "#e8503a" }: { color?: string }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  const phases = [ "Cargando..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = prev < 40 ? 3 : prev < 70 ? 1.5 : 0.5;
        return Math.min(prev + increment, 95);
      });
    }, 60);

    const phaseInterval = setInterval(() => {
      setPhase((prev) => (prev + 1) % phases.length);
    }, 900);

    return () => {
      clearInterval(interval);
      clearInterval(phaseInterval);
    };
  }, []);

  return (
    <div
      style={{
        width: "280px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* dangerouslySetInnerHTML: evita el mismatch de hidratación por el
          escape distinto de las comillas del @import en server vs cliente */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes fade-cycle {
          0%, 80% { opacity: 1; }
          90%, 100% { opacity: 0; }
        }

        .loader-shimmer { animation: shimmer 1.8s ease-in-out infinite; }
        .pulse-1 { animation: pulse-dot 1.2s ease-in-out infinite 0s; }
        .pulse-2 { animation: pulse-dot 1.2s ease-in-out infinite 0.2s; }
        .pulse-3 { animation: pulse-dot 1.2s ease-in-out infinite 0.4s; }
        .phase-text { animation: fade-cycle 0.9s ease-in-out; }
      `,
        }}
      />

      {/* Label superior */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="pulse-1" style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: color }} />
          <span className="pulse-2" style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: color }} />
          <span className="pulse-3" style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: color }} />
          <span
            key={phase}
            className="phase-text"
            style={{ fontSize: "12px", color: "#94a3b8", letterSpacing: "0.02em", fontWeight: 400 }}
          >
            {phases[phase]}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Barra de progreso */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "3px",
          background: "rgba(219, 24, 32, 0.12)",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0, left: 0,
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${color}, #df3e43)`,
            borderRadius: "999px",
            transition: "width 0.08s linear",
          }}
        />
        <div
          className="loader-shimmer"
          style={{
            position: "absolute",
            top: 0, left: 0,
            height: "100%",
            width: "25%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            borderRadius: "999px",
          }}
        />
      </div>
    </div>
  );
}