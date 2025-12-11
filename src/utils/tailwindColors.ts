// Mapa de conversão de classes Tailwind para cores hex
export const tailwindToHex: Record<string, string> = {
  // Purple
  'bg-purple-500': '#a855f7',
  'bg-purple-600': '#9333ea',
  // Yellow
  'bg-yellow-500': '#eab308',
  'bg-yellow-600': '#ca8a04',
  // Orange
  'bg-orange-500': '#f97316',
  'bg-orange-600': '#ea580c',
  // Cyan
  'bg-cyan-500': '#06b6d4',
  'bg-cyan-600': '#0891b2',
  // Red
  'bg-red-500': '#ef4444',
  'bg-red-600': '#dc2626',
  // Pink
  'bg-pink-500': '#ec4899',
  'bg-pink-600': '#db2777',
  // Indigo
  'bg-indigo-500': '#6366f1',
  'bg-indigo-600': '#4f46e5',
  // Teal
  'bg-teal-500': '#14b8a6',
  'bg-teal-600': '#0d9488',
  // Green
  'bg-green-500': '#22c55e',
  'bg-green-600': '#16a34a',
  // Blue
  'bg-blue-500': '#3b82f6',
  'bg-blue-600': '#2563eb',
  // Amber
  'bg-amber-500': '#f59e0b',
  'bg-amber-600': '#d97706',
  // Slate
  'bg-slate-500': '#64748b',
  'bg-slate-600': '#475569',
  // Gray
  'bg-gray-500': '#6b7280',
  'bg-gray-600': '#4b5563',
  // Emerald
  'bg-emerald-500': '#10b981',
  'bg-emerald-600': '#059669',
  // Lime
  'bg-lime-500': '#84cc16',
  'bg-lime-600': '#65a30d',
  // Rose
  'bg-rose-500': '#f43f5e',
  'bg-rose-600': '#e11d48',
  // Violet
  'bg-violet-500': '#8b5cf6',
  'bg-violet-600': '#7c3aed',
  // Sky
  'bg-sky-500': '#0ea5e9',
  'bg-sky-600': '#0284c7',
  // Fuchsia
  'bg-fuchsia-500': '#d946ef',
  'bg-fuchsia-600': '#c026d3',
};

/**
 * Converte uma classe Tailwind de cor para hex
 * Se a string já for um código hex ou não for encontrada, retorna como está ou fallback
 */
export function getTailwindColor(colorValue: string | undefined | null, fallback: string = '#6b7280'): string {
  if (!colorValue) return fallback;
  
  // Se já é um código hex, retorna
  if (colorValue.startsWith('#')) return colorValue;
  
  // Se é rgb/rgba/hsl, retorna
  if (colorValue.startsWith('rgb') || colorValue.startsWith('hsl')) return colorValue;
  
  // Tenta encontrar no mapa
  const hexColor = tailwindToHex[colorValue];
  if (hexColor) return hexColor;
  
  // Se é uma classe com "bg-", tenta extrair a cor
  if (colorValue.startsWith('bg-')) {
    const mapped = tailwindToHex[colorValue];
    if (mapped) return mapped;
  }
  
  // Última tentativa: adiciona "bg-" e procura
  const withBg = `bg-${colorValue}`;
  if (tailwindToHex[withBg]) return tailwindToHex[withBg];
  
  return fallback;
}
