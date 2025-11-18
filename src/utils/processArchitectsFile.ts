import * as XLSX from 'xlsx';

export async function processArchitectsFromFile(filePath: string) {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    
    const architects = data.map((row: any) => {
      // Processar data de nascimento
      let birthday = null;
      if (row['Data de Nascimento']) {
        const dateStr = String(row['Data de Nascimento']);
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      return {
        name: row['Arquiteto'] || '',
        email: row['Email'] || '',
        phone: String(row['Telefone'] || '').replace(/\D/g, ''),
        birthday,
        categoria: (row['Categoria'] || 'metropolitano').toLowerCase(),
      };
    });

    return architects.filter(a => a.name && a.phone);
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}
