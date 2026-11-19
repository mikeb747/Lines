import React, { useState, useEffect } from 'react';

interface DeferredNumberInputProps {
  id?: string;
  value: number;
  onCommit: (nextValue: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}

export const DeferredNumberInput: React.FC<DeferredNumberInputProps> = ({
  id,
  value,
  onCommit,
  min,
  max,
  integer = false,
  className = '',
  ariaLabel,
  placeholder,
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      setDraft(String(value));
      return;
    }

    const parsed = integer ? parseInt(trimmed, 10) : parseFloat(trimmed);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }

    let clamped = integer ? Math.round(parsed) : parsed;
    if (min !== undefined) {
      clamped = Math.max(min, clamped);
    }
    if (max !== undefined) {
      clamped = Math.min(max, clamped);
    }

    setDraft(String(clamped));
    if (clamped !== value) {
      onCommit(clamped);
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={draft}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setIsFocused(false);
        commitDraft();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commitDraft();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
};
