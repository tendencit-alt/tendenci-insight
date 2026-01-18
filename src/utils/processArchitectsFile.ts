import { readExcelFromUrl } from './excelReader';

export async function processArchitectsFromFile(filePath: string) {
  try {
    const data = await readExcelFromUrl(filePath);
    
    const architects = data.map((row: any) => {
      // Processar data de nascimento
      let birthday = null;
      if (row['Data de Nascimento']) {
        const dateStr = String(row['Data de Nascimento']);
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (dateStr.includes('-') || dateStr.includes('T')) {
          // ISO format from Date object
          birthday = dateStr.split('T')[0];
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
