import { useMemo, useState, useEffect } from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography, Card, CardContent, Tooltip, Switch, FormControlLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DomainIcon from '@mui/icons-material/Domain';
// removed unused icons
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SettingsIcon from '@mui/icons-material/Settings';
import FieldConfigModal from './FieldConfigModal';
import useFieldConfig from '../hooks/useFieldConfig';

/*Компонент таблиці інвентарю з можливістю редагування*/
export default function InventoryTable({ 
  inventory = [], 
  onSelectItem, 
  onAddItem, 
  onEditItem,
  onDeleteItem,
  onUpdateItem,
  canEdit = false,
  canDelete = false,
  userProfile = null,
  emptyMessage = "Немає матеріальних засобів для відображення."
}) {
  const [search, setSearch] = useState('');
  const [isLocked, setIsLocked] = useState(true); // Стан блокування таблиці
  
  const isAdmin = userProfile?.role === 'admin';
  
  /*Конфігурація полів з синхронізацією Firestore*/
  const { fields: tableFields, loading: fieldsLoading, saveFieldConfiguration, resetFieldConfiguration } = useFieldConfig(isAdmin);

  /*Стан таблиці з збереженням у localStorage*/
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() => {
    try {
      const saved = localStorage.getItem('inventory_table_column_visibility');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const [rowHeight, setRowHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('inventory_table_row_height');
      return saved ? parseInt(saved, 10) : 52;
    } catch {
      return 52;
    }
  });

  /*Збереження змін стану в localStorage*/
  useEffect(() => {
    try {
      localStorage.setItem('inventory_table_column_visibility', JSON.stringify(columnVisibilityModel));
    } catch (error) {
    }
  }, [columnVisibilityModel]);

  useEffect(() => {
    try {
      localStorage.setItem('inventory_table_row_height', rowHeight.toString());
    } catch (error) {

    }
  }, [rowHeight]);



  /*Автоматична нумерація об'єктів*/
  const numberedInventory = useMemo(() => {
    let itemCounter = 0;
    return inventory.map((item) => {
      if (item.isHeader) {
        return item;
      }
      itemCounter++;
      return {
        ...item,
        autoNumber: itemCounter
      };
    });
  }, [inventory]);

  /*Кастомне сортування з збереженням структури груп*/
  const [sortModel, setSortModel] = useState(() => {
    try {
      const saved = localStorage.getItem('inventory_table_sort_model');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  /*Збереження моделі сортування*/
  useEffect(() => {
    try {
      localStorage.setItem('inventory_table_sort_model', JSON.stringify(sortModel));
    } catch (error) {
      // Обробка помилок localStorage мовчки
    }
  }, [sortModel]);
  
  const sortedInventory = useMemo(() => {
    if (!sortModel || sortModel.length === 0) {
      return numberedInventory;
    }

    const { field, sort } = sortModel[0];
    if (!field || !sort) return numberedInventory;

    const result = [];
    let currentGroup = [];
    let currentHeader = null;

    /*Групування об'єктів по заголовкам*/
    numberedInventory.forEach(item => {
      if (item.isHeader) {
        /*Якщо є попередня група, сортуємо і додаємо*/
        if (currentHeader && currentGroup.length > 0) {
          const sortedGroup = [...currentGroup].sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            
            /*Обробка різних типів даних*/
            let comparison = 0;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              comparison = aVal.localeCompare(bVal, 'uk-UA');
            } else if (typeof aVal === 'number' && typeof bVal === 'number') {
              comparison = aVal - bVal;
            } else {
              comparison = String(aVal || '').localeCompare(String(bVal || ''), 'uk-UA');
            }
            
            return sort === 'desc' ? -comparison : comparison;
          });
          
          result.push(currentHeader, ...sortedGroup);
        }
        
        /*Початок нової групи*/
        currentHeader = item;
        currentGroup = [];
      } else {
        currentGroup.push(item);
      }
    });

    /*Не забути останню групу*/
    if (currentHeader && currentGroup.length > 0) {
      const sortedGroup = [...currentGroup].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal, 'uk-UA');
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal || '').localeCompare(String(bVal || ''), 'uk-UA');
        }
        
        return sort === 'desc' ? -comparison : comparison;
      });
      
      result.push(currentHeader, ...sortedGroup);
    }

    return result;
  }, [numberedInventory, sortModel]);

  const filteredRows = useMemo(() => {
    if (!search) return sortedInventory;
    const s = search.toLowerCase();
    
    // Логіка фільтрації, що зберігає структуру заголовків
    const filtered = [];
    let currentHeader = null;
    let headerHasResults = false;
    
    sortedInventory.forEach((item) => {
      if (item.isHeader) {
        if (currentHeader && headerHasResults) {
        }
        currentHeader = item;
        headerHasResults = false;
      } else {
        const matches = Object.values(item)
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s));
        
        if (matches) {
          if (currentHeader && !headerHasResults) {
            filtered.push(currentHeader);
            headerHasResults = true;
          }
          filtered.push(item);
        }
      }
    });
    
    return filtered;
  }, [search, sortedInventory]);

  // Отримання активних полів для стовпців, відсортованих за порядком
  const enabledFields = tableFields
    .filter(field => field.enabled)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Генерація стовпців на основі конфігурації полів
  const columns = useMemo(() => {
    const cols = enabledFields.map((field, fieldIndex) => {
      const baseColumn = {
        field: field.id,
        headerName: field.name,
        width: field.width || 150,
        editable: field.editable && !isLocked && canEdit,
        sortable: true,
        filterable: true,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          if (params.row.isHeader) {
            if (fieldIndex === 0) {
              return (
                <>
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      fontWeight: 'bold', 
                      color: 'primary.main',
                      zIndex: 10,
                      whiteSpace: 'nowrap',
                      minWidth: 'max-content'
                    }}
                  >
                    {params.row.headerIcon === 'unit' ? (
                      <DomainIcon sx={{ mr: 1, flexShrink: 0 }} />
                    ) : (
                      <ApartmentRoundedIcon sx={{ mr: 1, flexShrink: 0 }} />
                    )}
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: 'primary.main',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {params.row.headerTitle}
                    </Typography>
                  </Box>
                </>
              );
            }
            return <div style={{ width: '100%', height: '100%' }} />;
          }
          // Звичайне відображення комірки з переносом тексту
          if (params.value != null) {
            return (
              <Typography 
                variant="body2"
                sx={{ 
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  lineHeight: 1.2,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {params.value}
              </Typography>
            );
          }
          return params.value;
        }
      };

      if (field.type === 'number') {
        baseColumn.type = 'number';
        baseColumn.cellClassName = 'number-cell';
        baseColumn.align = 'left';
        baseColumn.headerAlign = 'left';
        if (field.id === 'price' || field.id === 'wearingPrice' || field.id === 'priceByBalance') {
          const originalRenderCell = baseColumn.renderCell;
          baseColumn.renderCell = (params) => {
            if (params.row.isHeader) return originalRenderCell(params);
            if (!params || params.value == null) return '';
            return `${Number(params.value).toFixed(2)}`;
          };
        }
      }

      if (field.type === 'date') {
        baseColumn.type = 'date';
        const originalRenderCell = baseColumn.renderCell;
        baseColumn.renderCell = (params) => {
          if (params.row.isHeader) return originalRenderCell(params);
          if (!params || !params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString('uk-UA');
        };
      }

      if (field.id === 'autoNumber') {
        baseColumn.editable = false;
        baseColumn.headerName = '№';
        baseColumn.sortable = false;
      }

      return baseColumn;
    });

    // Додати стовпець дій
    cols.push({
      field: 'actions',
      headerName: 'Дії',
      width: 100,
      sortable: false,
      filterable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        // Приховати дії для рядків заголовків
        if (params.row.isHeader) {
          return <div style={{ width: '100%', height: '100%' }} />;
        }
        
        return (
          <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
            {canEdit && (
              <Tooltip title="Редагувати">
                <IconButton 
                  size="small" 
                  onClick={() => onEditItem?.(params.row)}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Видалити">
                <IconButton 
                  size="small" 
                  onClick={() => {
                    // Подвійна перевірка - не рядок заголовка
                    if (!params.row.isHeader) {
                      handleDeleteClick(params.row);
                    }
                  }}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    });

    return cols;
  }, [enabledFields, isLocked, canEdit, canDelete, onSelectItem, onEditItem, onDeleteItem, inventory]);

  const [backupData, setBackupData] = useState(new Map());
  
  // Стан модального вікна конфігурації полів
  const [configModalOpen, setConfigModalOpen] = useState(false);
  
  const handleCellEditCommit = async (newRow, oldRow) => {
    if (!onUpdateItem) return oldRow;
    
    // Створення резервної копії перед редагуванням
    const backupKey = `${oldRow.id}_${Date.now()}`;
    setBackupData(prev => new Map(prev.set(backupKey, oldRow)));
    
    
    try {
      const { autoNumber, ...itemData } = newRow;
      await onUpdateItem(newRow.id, itemData);
      
      // Очистити резервну копію після успішного оновлення
      setTimeout(() => {
        setBackupData(prev => {
          const newMap = new Map(prev);
          newMap.delete(backupKey);
          return newMap;
        });
      }, 5000);
      
      return newRow;
    } catch (error) {
      // Показати зрозуміле повідомлення про помилку
      const errorMessage = error.message || 'Невідома помилка';
      alert(`Помилка при збереженні: ${errorMessage}\n\nЗміни не збережено. Таблиця повернеться до попереднього стану.`);
      return oldRow;
    }
  };

  const handleProcessRowUpdateError = (error) => {
    const errorMessage = error.message || 'Невідома помилка обробки';
    alert(`Помилка при збереженні змін: ${errorMessage}\n\nСпробуйте ще раз або оновіть сторінку.`);
  };

  const handleColumnVisibilityChange = (newModel) => {
    const visibleColumns = Object.keys(newModel).filter(key => newModel[key] !== false);
    const totalColumns = enabledFields.length + 1; // +1 для стовпця дій
    
    if (visibleColumns.length === 0 || (totalColumns - Object.keys(newModel).length <= 1)) {
      alert('Не можна приховати всі стовпці. Повинен залишитися хоча б один видимий стовпець.');
      return;
    }
    
    const essentialColumns = ['autoNumber', 'name'];
    const protectedModel = { ...newModel };
    
    essentialColumns.forEach(colId => {
      if (protectedModel[colId] === false) {
        delete protectedModel[colId];
      }
    });
    
    setColumnVisibilityModel(protectedModel);
  };
  
  // Безпечне скидання стовпців з підтвердженням
  const handleShowAllColumns = () => {
    if (Object.keys(columnVisibilityModel).length > 0) {
      if (window.confirm('Показати всі стовпці? Це скине поточні налаштування видимості.')) {
        setColumnVisibilityModel({});
      }
    }
  };

  // Пряме видалення без підтвердження
  const handleDeleteClick = async (item) => {
    if (item.isHeader) {
      return;
    }
    
    if (onDeleteItem && item && item.id) {
      try {
        await onDeleteItem(item);
      } catch (error) {
        alert(`Помилка при видаленні: ${error.message}`);
      }
    } else {
      alert('Помилка: не вдається видалити запис');
    }
  };

  // Керування конфігурацією полів - використовує Firestore
  const handleFieldConfigSave = async (newFields) => {
    const success = await saveFieldConfiguration(newFields, 'admin');
    if (!success) {
      alert('Помилка збереження конфігурації полів. Спробуйте ще раз.');
    }
  };

  // Експорт Excel
  const handleExcelExport = () => {
    // Використовувати відфільтровані рядки
    const dataToExport = filteredRows;
    
    if (!dataToExport || dataToExport.length === 0) {
      alert('Немає даних для експорту');
      return;
    }

    const exportFields = enabledFields.filter(field => field.id !== 'autoNumber');
    
    // Створити дані Excel з заголовками і правильним форматуванням
    const excelData = [];
    
    // Додати заголовки стовпців
    const headers = exportFields.map(field => field.name);
    excelData.push(headers);
    
    // Додати рядки даних - обробити кожен рядок за його типом
    dataToExport.forEach(item => {
      if (item.isHeader) {
        const headerRow = new Array(exportFields.length).fill('');
        headerRow[0] = item.headerTitle || 'Розділ';
        excelData.push(headerRow);
      } else {
        const row = [];
        exportFields.forEach(field => {
          let value = item[field.id] || '';
          
          // Форматувати значення за типом поля
          if (field.type === 'number' && value) {
            value = Number(value);
            if (field.id === 'price' || field.id === 'wearingPrice' || field.id === 'priceByBalance') {
              value = value.toFixed(2);
            }
          } else if (field.type === 'date' && value) {
            value = new Date(value).toLocaleDateString('uk-UA');
          }
          
          row.push(value);
        });
        excelData.push(row);
      }
    });

    // Створити книгу і аркуш
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Стилізація рядків заголовків (жирний шрифт і фон)
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Знайти рядки заголовків і застосувати форматування
    for (let rowNum = 1; rowNum <= range.e.r; rowNum++) {
      const firstCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
      const firstCell = ws[firstCellAddr];
      
      if (firstCell && typeof firstCell.v === 'string') {
        if (firstCell.v.includes('(підрозділ)') || firstCell.v.includes('(відділ)') || firstCell.v === 'Розділ') {
          for (let colNum = 0; colNum <= range.e.c; colNum++) {
            const cellAddr = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
            if (!ws[cellAddr]) ws[cellAddr] = { t: 's', v: '' };
            if (!ws[cellAddr].s) ws[cellAddr].s = {};
            ws[cellAddr].s.font = { bold: true };
            ws[cellAddr].s.fill = { fgColor: { rgb: "E3F2FD" } };
          }
        }
      }
    }
    
    // Встановити ширину стовпців
    const colWidths = exportFields.map(field => ({ wch: field.width ? Math.max(field.width / 7, 10) : 15 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Матеріальні засоби');
    
    // Завантажити файл
    const fileName = `матеріальні_засоби_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Stack spacing={2} sx={{ height: '100%', width: '100%' }}>
      {fieldsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Завантаження конфігурації полів...</Typography>
        </Box>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          size="small"
          label="Пошук"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        
        {/* Контроль висоти рядків */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 'fit-content' }}>
          <Typography variant="body2" sx={{ minWidth: '30px', textAlign: 'center' }}>
            {rowHeight}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <IconButton 
              size="small"
              onClick={() => setRowHeight(prev => Math.min(prev + 4, 100))}
              sx={{ padding: '2px', height: '20px' }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small"
              onClick={() => setRowHeight(prev => Math.max(prev - 4, 32))}
              sx={{ padding: '2px', height: '20px' }}
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {canEdit && (
          <FormControlLabel
            control={
              <Switch
                checked={!isLocked}
                onChange={(e) => setIsLocked(!e.target.checked)}
                icon={<LockIcon />}
                checkedIcon={<LockOpenIcon />}
              />
            }
            label={isLocked ? "Заблоковано" : "Редагування"}
            sx={{ minWidth: 'fit-content' }}
          />
        )}
        
        <Tooltip title="Показати всі стовпці">
          <IconButton
            onClick={handleShowAllColumns}
            sx={{ minWidth: 'fit-content' }}
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
        
        {isAdmin && (
          <Tooltip title="Налаштувати поля">
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setConfigModalOpen(true)}
              sx={{ minWidth: 'fit-content' }}
            >
              Поля
            </Button>
          </Tooltip>
        )}
        
        {onAddItem && (
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={onAddItem}
            sx={{ minWidth: 'fit-content' }}
          >
            Додати
          </Button>
        )}
        
        <Button 
          variant="outlined" 
          startIcon={<FileDownloadIcon />}
          onClick={handleExcelExport}
          disabled={filteredRows.length === 0}
          sx={{ minWidth: 'fit-content' }}
        >
          Excel
        </Button>
      </Stack>

      {/* Інформація про статус таблиці */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Всього записів: {filteredRows.filter(row => !row.isHeader).length}
          {search && ` (знайдено: ${filteredRows.filter(row => !row.isHeader).length} з ${sortedInventory.filter(row => !row.isHeader).length})`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isLocked ? (
            <>
              <LockIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Таблиця заблокована для редагування
            </>
          ) : (
            <>
              <LockOpenIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Дозволено редагування в таблиці
            </>
          )}
        </Typography>
      </Box>

      {filteredRows.filter(row => !row.isHeader).length === 0 && inventory.filter(row => !row.isHeader).length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>
              {emptyMessage}
            </Typography>
            {onAddItem && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={onAddItem}
                sx={{ mt: 2 }}
              >
                Додати перший об'єкт
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ flex: 1, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ 
              pagination: { paginationModel: { pageSize: 25, page: 0 } } 
            }}
            autoHeight
            disableRowSelectionOnClick
            columnHeaderHeight={40}
            getRowHeight={(params) => {
            // Рядки заголовків отримують фіксовану висоту, звичайні - кастомну
              return params.model.isHeader ? 60 : rowHeight;
            }}
            density="comfortable"
            experimentalFeatures={{ newEditingApi: true }}
            processRowUpdate={handleCellEditCommit}
            onProcessRowUpdateError={handleProcessRowUpdateError}
            sortingMode="server"
            sortModel={sortModel}
            onSortModelChange={(newSortModel) => {
              // Не дозволяти сортування по рядках заголовків чи стовпцях дій
              if (newSortModel.length > 0 && newSortModel[0].field !== 'actions' && newSortModel[0].field !== 'autoNumber') {
                setSortModel(newSortModel);
              } else if (newSortModel.length === 0) {
                setSortModel([]);
              }
            }}
            disableColumnMenu={false}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={handleColumnVisibilityChange}
            isCellEditable={(params) => {
              if (params.row.isHeader) return false;
              return !isLocked && canEdit && params.field !== 'autoNumber' && params.field !== 'actions';
            }}
            isRowSelectable={(params) => {
              return !params.row.isHeader;
            }}
            getRowClassName={(params) => {
              return params.row.isHeader ? 'header-row' : '';
            }}
            sx={{
              '& .MuiDataGrid-cell--editable': {
                backgroundColor: isLocked ? 'inherit' : 'action.hover',
              },
              '& .MuiDataGrid-cell--editing': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
              },
              '& .number-cell': {
                color: 'text.primary',
                fontWeight: 500,
              },
              '& .MuiDataGrid-cell': {
                color: 'text.primary',
                whiteSpace: 'normal !important',
                wordWrap: 'break-word',
                lineHeight: 'unset !important',
                maxHeight: 'none !important',
                overflow: 'visible',
                display: 'flex !important',
                alignItems: 'center !important',
                padding: '8px 16px !important',
              },
              '& .MuiDataGrid-row': {
                maxHeight: 'none !important',
              },
              '& .header-row': {
                backgroundColor: '#f5f5f5 !important',
                position: 'relative',
                minHeight: '60px !important',
                '& .MuiDataGrid-cell': {
                  borderBottom: '2px solid #1976d2 !important',
                  borderRight: 'none !important',
                  backgroundColor: '#f5f5f5 !important',
                  overflow: 'visible !important',
                  minHeight: '60px !important',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiDataGrid-cell:first-of-type': {
                  position: 'relative',
                  overflow: 'visible !important',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: '-100vw',
                    bottom: 0,
                    backgroundColor: '#f5f5f5',
                    borderBottom: '2px solid #1976d2',
                    zIndex: 1,
                  },
                },
                '&:hover': {
                  backgroundColor: '#eeeeee !important',
                  '& .MuiDataGrid-cell': {
                    backgroundColor: '#eeeeee !important',
                  },
                  '& .MuiDataGrid-cell:first-of-type::before': {
                    backgroundColor: '#eeeeee',
                  }
                },
              },
            }}
            noRowsOverlay={() => (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">
                  {search ? 'Немає результатів за вашим запитом' : emptyMessage}
                </Typography>
              </Box>
            )}
          />
        </Box>
      )}
      
      <FieldConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        fields={tableFields}
        onSave={handleFieldConfigSave}
        isAdmin={isAdmin}
        userProfile={userProfile}
      />
        </>
      )}
    </Stack>
  );
}