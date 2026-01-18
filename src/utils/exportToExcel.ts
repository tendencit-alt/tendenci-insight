import ExcelJS from "exceljs";

interface ExportConfig {
  filename: string;
  sheetName?: string;
  headers?: Record<string, string>;
}

export async function exportToExcel(
  data: Record<string, any>[],
  config: ExportConfig
) {
  if (!data || data.length === 0) {
    throw new Error("Nenhum dado para exportar");
  }

  // Map headers if provided
  let exportData: Record<string, any>[] = data;
  if (config.headers) {
    exportData = data.map((row) => {
      const newRow: Record<string, any> = {};
      Object.keys(config.headers!).forEach((key) => {
        newRow[config.headers![key]] = row[key];
      });
      return newRow;
    });
  }

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(config.sheetName || "Dados");

  // Add headers
  const headers = Object.keys(exportData[0] || {});
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data rows
  exportData.forEach((row) => {
    worksheet.addRow(headers.map((h) => row[h] ?? ""));
  });

  // Auto-size columns
  worksheet.columns.forEach((column, index) => {
    const headerLength = headers[index]?.length || 10;
    let maxLength = headerLength;
    
    exportData.forEach((row) => {
      const cellValue = String(row[headers[index]] || "");
      maxLength = Math.max(maxLength, cellValue.length);
    });
    
    column.width = Math.min(maxLength + 2, 50);
  });

  // Generate filename with date
  const date = new Date().toISOString().split("T")[0];
  const filename = `${config.filename}_${date}.xlsx`;

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Pre-configured exports
export const exportProducts = (products: any[]) => {
  exportToExcel(
    products.map((p) => ({
      code: p.code || "",
      name: p.name,
      category: p.category?.name || "",
      location: p.location?.name || "",
      current_stock: p.current_stock,
      unit: p.unit,
      min_stock: p.min_stock,
      max_stock: p.max_stock || "",
      cost_price: p.cost_price,
      sale_price: p.sale_price,
      average_cost: p.average_cost || "",
      reorder_point: p.reorder_point || "",
      barcode: p.barcode || "",
      active: p.active ? "Sim" : "Não"
    })),
    {
      filename: "produtos",
      sheetName: "Produtos",
      headers: {
        code: "Código",
        name: "Nome",
        category: "Categoria",
        location: "Local",
        current_stock: "Estoque Atual",
        unit: "Unidade",
        min_stock: "Est. Mínimo",
        max_stock: "Est. Máximo",
        cost_price: "Preço Custo",
        sale_price: "Preço Venda",
        average_cost: "Custo Médio",
        reorder_point: "Ponto Reposição",
        barcode: "Código de Barras",
        active: "Ativo"
      }
    }
  );
};

export const exportStockMovements = (movements: any[]) => {
  exportToExcel(
    movements.map((m) => ({
      created_at: new Date(m.created_at).toLocaleString("pt-BR"),
      product: m.product?.name || "",
      movement_type: m.movement_type,
      quantity: m.quantity,
      previous_stock: m.previous_stock,
      new_stock: m.new_stock,
      reference: m.reference || "",
      notes: m.notes || ""
    })),
    {
      filename: "movimentacoes",
      sheetName: "Movimentações",
      headers: {
        created_at: "Data/Hora",
        product: "Produto",
        movement_type: "Tipo",
        quantity: "Quantidade",
        previous_stock: "Estoque Anterior",
        new_stock: "Novo Estoque",
        reference: "Referência",
        notes: "Observações"
      }
    }
  );
};

export const exportPurchaseOrders = (orders: any[]) => {
  exportToExcel(
    orders.map((o) => ({
      order_number: o.order_number,
      created_at: new Date(o.created_at).toLocaleDateString("pt-BR"),
      supplier: o.supplier?.name || "",
      status: o.status,
      expected_date: o.expected_date ? new Date(o.expected_date).toLocaleDateString("pt-BR") : "",
      received_date: o.received_date ? new Date(o.received_date).toLocaleDateString("pt-BR") : "",
      total: o.total,
      payment_terms: o.payment_terms || "",
      notes: o.notes || ""
    })),
    {
      filename: "pedidos_compra",
      sheetName: "Pedidos de Compra",
      headers: {
        order_number: "Nº Pedido",
        created_at: "Data Criação",
        supplier: "Fornecedor",
        status: "Status",
        expected_date: "Previsão",
        received_date: "Recebido",
        total: "Total (R$)",
        payment_terms: "Cond. Pagamento",
        notes: "Observações"
      }
    }
  );
};

export const exportSuppliers = (suppliers: any[]) => {
  exportToExcel(
    suppliers.map((s) => ({
      name: s.name,
      cpf_cnpj: s.cpf_cnpj || "",
      email: s.email || "",
      phone: s.phone || "",
      city: s.city || "",
      state: s.state || "",
      active: s.active ? "Sim" : "Não",
      notes: s.notes || ""
    })),
    {
      filename: "fornecedores",
      sheetName: "Fornecedores",
      headers: {
        name: "Nome",
        cpf_cnpj: "CPF/CNPJ",
        email: "E-mail",
        phone: "Telefone",
        city: "Cidade",
        state: "Estado",
        active: "Ativo",
        notes: "Observações"
      }
    }
  );
};
