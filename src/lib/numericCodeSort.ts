/**
 * Sorts an array of items numerically by their code field.
 * Handles codes like "1", "2", "10" and hierarchical codes like "1.1", "1.2", "1.10"
 * 
 * @param items Array of items with a code field (can be null/undefined)
 * @param codeField The field name to sort by (defaults to 'code')
 * @returns Sorted array with items without codes at the end
 */
export function numericCodeSort<T extends Record<string, any>>(
  items: T[],
  codeField: string = 'code'
): T[] {
  return [...items].sort((a, b) => {
    const codeA = a[codeField];
    const codeB = b[codeField];
    
    // Items without codes go to the end
    if (!codeA && !codeB) return 0;
    if (!codeA) return 1;
    if (!codeB) return -1;
    
    // Split by dots and compare each segment numerically
    const partsA = String(codeA).split('.');
    const partsB = String(codeB).split('.');
    
    const maxLength = Math.max(partsA.length, partsB.length);
    
    for (let i = 0; i < maxLength; i++) {
      const numA = parseFloat(partsA[i]) || 0;
      const numB = parseFloat(partsB[i]) || 0;
      
      if (numA !== numB) {
        return numA - numB;
      }
    }
    
    return 0;
  });
}
