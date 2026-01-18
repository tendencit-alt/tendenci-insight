/**
 * Simple OFX Parser for Brazilian bank statements
 * Parses OFX files and extracts transaction data
 */

export interface OFXTransaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  date: string;
  amount: number;
  description: string;
  fitid?: string;
}

export interface OFXParseResult {
  transactions: OFXTransaction[];
  bankId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Parse OFX file content and extract transactions
 */
export function parseOFX(content: string): OFXParseResult {
  const transactions: OFXTransaction[] = [];
  
  // Extract bank and account info
  const bankIdMatch = content.match(/<BANKID>([^<\n]+)/);
  const accountIdMatch = content.match(/<ACCTID>([^<\n]+)/);
  const bankId = bankIdMatch?.[1]?.trim();
  const accountId = accountIdMatch?.[1]?.trim();
  
  // Extract date range
  const startDateMatch = content.match(/<DTSTART>(\d{8})/);
  const endDateMatch = content.match(/<DTEND>(\d{8})/);
  
  const startDate = startDateMatch ? formatOFXDate(startDateMatch[1]) : undefined;
  const endDate = endDateMatch ? formatOFXDate(endDateMatch[1]) : undefined;
  
  // Find all transaction blocks
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  let index = 0;
  
  while ((match = transactionRegex.exec(content)) !== null) {
    const txBlock = match[1];
    
    // Extract transaction fields
    const trnType = extractField(txBlock, 'TRNTYPE');
    const dtPosted = extractField(txBlock, 'DTPOSTED');
    const trnAmt = extractField(txBlock, 'TRNAMT');
    const fitid = extractField(txBlock, 'FITID');
    const memo = extractField(txBlock, 'MEMO') || extractField(txBlock, 'NAME');
    
    if (dtPosted && trnAmt) {
      const amount = parseFloat(trnAmt.replace(',', '.'));
      
      transactions.push({
        id: fitid || `tx-${index}`,
        type: amount < 0 ? 'DEBIT' : 'CREDIT',
        date: formatOFXDate(dtPosted.substring(0, 8)),
        amount: Math.abs(amount),
        description: memo || 'Transação OFX',
        fitid,
      });
      
      index++;
    }
  }
  
  return {
    transactions,
    bankId,
    accountId,
    startDate,
    endDate,
  };
}

/**
 * Extract a field value from OFX block
 */
function extractField(block: string, fieldName: string): string | undefined {
  const regex = new RegExp(`<${fieldName}>([^<\\n]+)`, 'i');
  const match = block.match(regex);
  return match?.[1]?.trim();
}

/**
 * Convert OFX date format (YYYYMMDD) to ISO format (YYYY-MM-DD)
 */
function formatOFXDate(ofxDate: string): string {
  if (ofxDate.length < 8) return ofxDate;
  return `${ofxDate.substring(0, 4)}-${ofxDate.substring(4, 6)}-${ofxDate.substring(6, 8)}`;
}

/**
 * Format amount to Brazilian currency display
 */
export function formatAmountForForm(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
