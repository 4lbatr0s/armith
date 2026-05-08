import React from 'react';

export function ThresholdSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  defaultValue,
  format,
  suffix = '',
  inverse,
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = format === 'percent' ? `${Math.round(value * 100)}%` : `${value}${suffix}`;
  const defaultDisplay = format === 'percent' ? `${Math.round(defaultValue * 100)}%` : `${defaultValue}${suffix}`;

  const isGood = inverse ? value <= defaultValue : value >= defaultValue;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-pm-ink dark:text-pm-ink-soft">{label}</label>
        <span
          className={`text-sm font-semibold ${isGood ? 'text-pm-accent-alt dark:text-pm-accent-alt' : 'text-amber-600 dark:text-amber-400'}`}
        >
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-pm-wash dark:bg-white/10 rounded-sm appearance-none cursor-pointer slider border border-pm-ink/15 dark:border-white/15"
        style={{
          background: `linear-gradient(to right, ${isGood ? '#4a8f86' : '#f59e0b'} 0%, ${isGood ? '#4a8f86' : '#f59e0b'} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
        }}
      />
      <p className="text-xs text-pm-muted">Default: {defaultDisplay}</p>
    </div>
  );
}
