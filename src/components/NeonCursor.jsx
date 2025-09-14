import React, { useState, useEffect } from "react";

const NeonCursor = () => {
  const [trails, setTrails] = useState([]);
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Thêm vệt sáng
      const newTrail = {
        x: e.clientX,
        y: e.clientY,
        id: Math.random(),
      };
      setTrails((prev) => [...prev.slice(-15), newTrail]);

      // Thêm lấp lánh
      const newSparkle = {
        x: e.clientX + (Math.random() * 20 - 10), // lệch nhẹ
        y: e.clientY + (Math.random() * 20 - 10),
        id: Math.random(),
      };
      setSparkles((prev) => [...prev.slice(-10), newSparkle]);

      // Xóa sparkle sau 600ms
      setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => s.id !== newSparkle.id));
      }, 600);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Vệt sáng */}
      {trails.map((t, i) => (
        <div
          key={t.id}
          className="absolute w-6 h-6 rounded-full bg-fuchsia-500 blur-xl"
          style={{
            left: t.x - 12,
            top: t.y - 12,
            opacity: (i + 1) / trails.length,
            transform: `scale(${1 - i * 0.05})`,
            transition: "all 0.15s linear",
          }}
        ></div>
      ))}

      {/* Lấp lánh */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute w-2 h-2 bg-white rounded-full blur-sm animate-ping"
          style={{
            left: s.x,
            top: s.y,
          }}
        ></div>
      ))}
    </div>
  );
};

export default NeonCursor;
