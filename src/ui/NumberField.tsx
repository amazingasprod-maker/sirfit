import { useState } from 'react';
import { fmtNombre, parseNombre } from '../domain/format';

interface Props {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  /** valeur reprise si le champ reste vide (dernière séance) */
  placeholder?: number | null;
  /** décimales autorisées : « 62,5 » pour une charge, entier pour des répétitions */
  decimal?: boolean;
  label: string;
  className?: string;
  max?: number;
}

/**
 * Champ numérique pensé pour le pouce : clavier numérique, virgule française
 * acceptée, texte sélectionné à la prise de focus pour remplacer d'une frappe.
 * Le texte tapé reste tel quel pendant la saisie (« 62, » ne saute pas).
 */
export function NumberField({ id, value, onChange, placeholder = null, decimal = false, label, className = 'num', max = 9999 }: Props) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? (value === null ? '' : fmtNombre(value).replace(/\s/g, ''));

  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder === null || placeholder === undefined ? '' : fmtNombre(placeholder).replace(/\s/g, '')}
      value={affiche}
      onFocus={(e) => {
        setBrouillon(affiche);
        e.currentTarget.select();
      }}
      onBlur={() => setBrouillon(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onChange={(e) => {
        const txt = e.currentTarget.value.replace(decimal ? /[^\d.,]/g : /\D/g, '');
        setBrouillon(txt);
        const n = parseNombre(txt);
        onChange(n === null ? null : Math.min(max, decimal ? n : Math.round(n)));
      }}
    />
  );
}
