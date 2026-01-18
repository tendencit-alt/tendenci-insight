import ExcelJS from "exceljs";

/**
 * Reads an Excel file and returns the data as an array of objects.
 * Each row becomes an object with column headers as keys.
 */
export async function readExcelFile(file: File | ArrayBuffer): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
  } else {
    await workbook.xlsx.load(file);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in the Excel file");
  }

  const data: any[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row contains headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
      });
    } else {
      // Data rows
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          // Handle different cell value types
          let value = cell.value;
          
          // Handle rich text objects
          if (value && typeof value === 'object' && 'richText' in value) {
            value = (value as ExcelJS.CellRichTextValue).richText
              .map(rt => rt.text)
              .join('');
          }
          
          // Handle formula results
          if (value && typeof value === 'object' && 'result' in value) {
            value = (value as ExcelJS.CellFormulaValue).result;
          }
          
          // Handle dates
          if (value instanceof Date) {
            value = value.toISOString();
          }
          
          rowData[header] = value;
        }
      });
      
      // Only add row if it has at least one non-empty value
      if (Object.values(rowData).some(v => v !== null && v !== undefined && v !== '')) {
        data.push(rowData);
      }
    }
  });

  return data;
}

/**
 * Fetches and reads an Excel file from a URL
 */
export async function readExcelFromUrl(url: string): Promise<any[]> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return readExcelFile(arrayBuffer);
}
