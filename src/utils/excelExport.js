/*Утиліти для експорту даних в Excel*/

import * as XLSX from 'xlsx';

/*Експорт списку об'єктів в Excel*/
export function exportItemsListToExcel(items = [], fileName = 'inventory_list.xlsx') {
  const rows = items.map((it) => ({
    'Найменування': it.name || '',
    'Номенклатурний №': it.nomenclatureNumber || '',
    'Од. виміру': it.unitOfMeasure || '',
    'Поточний залишок': Number(it.currentBalance || 0),
  }));
  const wb = XLSX.utils.book_new();
  
  // Завжди додаємо аркуш, навіть якщо даних немає
  if (rows.length === 0) {
    const emptySheet = XLSX.utils.json_to_sheet([{
      'Повідомлення': 'Немає даних для експорту'
    }]);
    XLSX.utils.book_append_sheet(wb, emptySheet, 'Порожній');
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Список');
  }
  
  XLSX.writeFile(wb, fileName);
}

/*Експорт повної книги обліку в Excel*/
export async function exportFullBookToExcel(items = [], getTransactions, fileName = 'inventory_book.xlsx') {
  const wb = XLSX.utils.book_new();

  for (const item of items) {
    const headerSheet = [[
      'Найменування', 'Номенклатурний №', 'Од. виміру', 'Марка', 'Ґатунок', 'Профіль', 'Розмір', 'Норма запасу', 'Поточний залишок'
    ], [
      item?.name || '',
      item?.nomenclatureNumber || '',
      item?.unitOfMeasure || '',
      item?.brand || '',
      item?.grade || '',
      item?.profile || '',
      item?.size || '',
      item?.stockNorm || '',
      item?.currentBalance || 0,
    ]];

    const wsHeader = XLSX.utils.aoa_to_sheet(headerSheet);
    const sheetName = (item?.name || 'Об\'єкт').slice(0, 28);
    XLSX.utils.book_append_sheet(wb, wsHeader, sheetName);

    let tx = [];
    try {
      tx = await getTransactions(item.id);
    } catch (e) {
      tx = [];
    }
    const txRows = tx.map((t) => ({
      'Дата запису': new Date(t.date?.seconds ? t.date.seconds * 1000 : t.date).toLocaleDateString(),
      '№ документа': t.documentNumber,
      'Порядковий №': t.recordNumber,
      'Від кого/Кому': t.sourceOrDestination,
      'Надходження': t.income,
      'Видаток': t.expense,
      'Залишок': t.balance,
      'Контроль': t.controlInfo,
    }));
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    // Додаємо аркуш транзакцій
    XLSX.utils.book_append_sheet(wb, wsTx, `${sheetName}-транз`);
  }

  // Запобігаємо помилці порожньої книги
  if (wb.SheetNames.length === 0) {
    // Додаємо мінімальний аркуш якщо немає даних
    const emptySheet = XLSX.utils.json_to_sheet([{
      'Повідомлення': 'Немає даних для експорту'
    }]);
    XLSX.utils.book_append_sheet(wb, emptySheet, 'Порожній');
  }

  XLSX.writeFile(wb, fileName);
}


