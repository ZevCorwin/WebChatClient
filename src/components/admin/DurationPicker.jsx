import React, { useEffect, useMemo, useState } from "react";

/**
 * Props:
 * - valueSeconds: number (giây) hiện tại
 * - onChange: (seconds:number) => void
 * - disabled?: boolean
 */
export default function DurationPicker({ valueSeconds = 60, onChange, disabled }) {
  const [h, setH] = useState(0);
  const [m, setM] = useState(1);
  const [s, setS] = useState(0);

  // đồng bộ từ valueSeconds -> H/M/S lúc mount/đổi preset ngoài
  useEffect(() => {
    const hh = Math.floor(valueSeconds / 3600);
    const mm = Math.floor((valueSeconds % 3600) / 60);
    const ss = valueSeconds % 60;
    setH(hh); setM(mm); setS(ss);
  }, [valueSeconds]);

  // khi người dùng gõ H/M/S
  useEffect(() => {
    const secs = Math.max(0, h * 3600 + m * 60 + s);
    onChange?.(secs);
    // eslint-disable-next-line
  }, [h, m, s]);

  // thời điểm mở khóa & countdown text
  const unlockAt = useMemo(() => new Date(Date.now() + (valueSeconds * 1000)), [valueSeconds]);
  const [remain, setRemain] = useState(valueSeconds);
  useEffect(() => {
    setRemain(valueSeconds);
    const id = setInterval(() => setRemain(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [valueSeconds]);

  const fmt = (n) => n.toString().padStart(2, "0");
  const presetBtns = [
    { k: 30,  label: "30 giây" },
    { k: 60,  label: "1 phút" },
    { k: 300, label: "5 phút" },
    { k: 900, label: "15 phút" },
    { k: 3600, label: "1 giờ" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presetBtns.map(p => (
          <button
            key={p.k}
            type="button"
            className="px-3 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-60"
            onClick={() => onChange?.(p.k)}
            disabled={disabled}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <NumberBox label="Giờ" value={h} onChange={setH} min={0} max={23} disabled={disabled}/>
        <span className="text-gray-400">:</span>
        <NumberBox label="Phút" value={m} onChange={setM} min={0} max={59} disabled={disabled}/>
        <span className="text-gray-400">:</span>
        <NumberBox label="Giây" value={s} onChange={setS} min={0} max={59} disabled={disabled}/>
      </div>

      <div className="text-sm text-gray-600">
        Sẽ mở khoá lúc: <b>{unlockAt.toLocaleString()}</b>
        <br/>
        Còn lại: <b>{fmt(Math.floor(remain/3600))}:{fmt(Math.floor((remain%3600)/60))}:{fmt(remain%60)}</b>
      </div>
    </div>
  );
}

function NumberBox({ label, value, onChange, min=0, max=59, disabled }) {
  const clamp = (n) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
  return (
    <label className="text-sm">
      <div className="text-gray-600">{label}</div>
      <input
        type="number"
        className="w-20 rounded border px-2 py-1"
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
        min={min}
        max={max}
        disabled={disabled}
      />
    </label>
  );
}
