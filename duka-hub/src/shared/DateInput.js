import React, { useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDisplayDate, toISODate } from '../utils/date';

const DateInput = ({ name, value, onChange, className, disabled, ...rest }) => {
  const isoValue = useMemo(() => (value ? toISODate(value) : ''), [value]);
  const displayValue = useMemo(() => (isoValue ? formatDisplayDate(isoValue) : ''), [isoValue]);
  const inputRef = useRef(null);
  const openPicker = () => {
    const el = inputRef.current;
    if (!el || disabled) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
      return;
    }
    el.focus();
    el.click();
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        className={`${className || ''} pointer-events-none pr-10`}
        disabled={disabled}
        readOnly
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 z-10"
      >
        <Calendar className="w-4 h-4" />
      </button>
      <input
        type="date"
        ref={inputRef}
        name={name}
        value={isoValue}
        onChange={(e) => onChange && onChange({ target: { name: e.target.name, value: e.target.value } })}
        className="absolute inset-0 opacity-0 z-0"
        disabled={disabled}
        {...rest}
      />
    </div>
  );
};

export default DateInput;
