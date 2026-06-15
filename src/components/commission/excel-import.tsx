'use client';

import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatNumber, toPersianDigits, cn } from '@/lib/utils';
import { FileSpreadsheet, Upload, Trash2, CheckCircle2, AlertCircle, MapPin, ArrowLeft, FileDown } from 'lucide-react';

// ====== Column definition for mapping ======
export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number';
}

// ====== Parsed row from Excel ======
export interface ParsedRow {
  [key: string]: string | number;
}

// ====== Component props ======
export interface ExcelImportProps {
  /** Title shown in the import dialog */
  title: string;
  /** Column definitions for mapping */
  columns: ImportColumn[];
  /** Callback with mapped data when user confirms import */
  onImport: (rows: Record<string, string | number>[]) => void;
  /** Color theme for the import button */
  theme?: 'emerald' | 'violet' | 'blue' | 'amber' | 'indigo' | 'teal' | 'orange' | 'rose' | 'cyan' | 'sky';
}

const THEME_MAP: Record<string, { btn: string; btnHover: string; shadow: string; border: string; bg: string; headerBg: string; text: string; icon: string; outlineBtn: string }> = {
  emerald: { btn: 'from-emerald-600 to-emerald-500', btnHover: 'hover:from-emerald-700 hover:to-emerald-600', shadow: 'shadow-emerald-500/20', border: 'border-t-emerald-500', bg: 'from-emerald-50/80', headerBg: 'bg-emerald-50', text: 'text-emerald-800', icon: 'text-emerald-600', outlineBtn: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  violet: { btn: 'from-violet-600 to-violet-500', btnHover: 'hover:from-violet-700 hover:to-violet-600', shadow: 'shadow-violet-500/20', border: 'border-t-violet-500', bg: 'from-violet-50/80', headerBg: 'bg-violet-50', text: 'text-violet-800', icon: 'text-violet-600', outlineBtn: 'border-violet-300 text-violet-700 hover:bg-violet-50' },
  blue: { btn: 'from-blue-600 to-blue-500', btnHover: 'hover:from-blue-700 hover:to-blue-600', shadow: 'shadow-blue-500/20', border: 'border-t-blue-500', bg: 'from-blue-50/80', headerBg: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-600', outlineBtn: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  amber: { btn: 'from-amber-600 to-amber-500', btnHover: 'hover:from-amber-700 hover:to-amber-600', shadow: 'shadow-amber-500/20', border: 'border-t-amber-500', bg: 'from-amber-50/80', headerBg: 'bg-amber-50', text: 'text-amber-800', icon: 'text-amber-600', outlineBtn: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  indigo: { btn: 'from-indigo-600 to-indigo-500', btnHover: 'hover:from-indigo-700 hover:to-indigo-600', shadow: 'shadow-indigo-500/20', border: 'border-t-indigo-500', bg: 'from-indigo-50/80', headerBg: 'bg-indigo-50', text: 'text-indigo-800', icon: 'text-indigo-600', outlineBtn: 'border-indigo-300 text-indigo-700 hover:bg-indigo-50' },
  teal: { btn: 'from-teal-600 to-teal-500', btnHover: 'hover:from-teal-700 hover:to-teal-600', shadow: 'shadow-teal-500/20', border: 'border-t-teal-500', bg: 'from-teal-50/80', headerBg: 'bg-teal-50', text: 'text-teal-800', icon: 'text-teal-600', outlineBtn: 'border-teal-300 text-teal-700 hover:bg-teal-50' },
  orange: { btn: 'from-orange-600 to-orange-500', btnHover: 'hover:from-orange-700 hover:to-orange-600', shadow: 'shadow-orange-500/20', border: 'border-t-orange-500', bg: 'from-orange-50/80', headerBg: 'bg-orange-50', text: 'text-orange-800', icon: 'text-orange-600', outlineBtn: 'border-orange-300 text-orange-700 hover:bg-orange-50' },
  rose: { btn: 'from-rose-600 to-rose-500', btnHover: 'hover:from-rose-700 hover:to-rose-600', shadow: 'shadow-rose-500/20', border: 'border-t-rose-500', bg: 'from-rose-50/80', headerBg: 'bg-rose-50', text: 'text-rose-800', icon: 'text-rose-600', outlineBtn: 'border-rose-300 text-rose-700 hover:bg-rose-50' },
  cyan: { btn: 'from-cyan-600 to-cyan-500', btnHover: 'hover:from-cyan-700 hover:to-cyan-600', shadow: 'shadow-cyan-500/20', border: 'border-t-cyan-500', bg: 'from-cyan-50/80', headerBg: 'bg-cyan-50', text: 'text-cyan-800', icon: 'text-cyan-600', outlineBtn: 'border-cyan-300 text-cyan-700 hover:bg-cyan-50' },
  sky: { btn: 'from-sky-600 to-sky-500', btnHover: 'hover:from-sky-700 hover:to-sky-600', shadow: 'shadow-sky-500/20', border: 'border-t-sky-500', bg: 'from-sky-50/80', headerBg: 'bg-sky-50', text: 'text-sky-800', icon: 'text-sky-600', outlineBtn: 'border-sky-300 text-sky-700 hover:bg-sky-50' },
};

export function ExcelImport({ title, columns, onImport, theme = 'emerald' }: ExcelImportProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = THEME_MAP[theme] || THEME_MAP.emerald;

  // Parse Excel file
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { defval: '' });

      if (jsonData.length === 0) return;

      // Extract headers from first row
      const headers = Object.keys(jsonData[0]);
      setExcelHeaders(headers);
      setRawData(jsonData);

      // Auto-map: try to match by name
      const autoMapping: Record<string, string> = {};
      for (const col of columns) {
        const match = headers.find(h =>
          h.trim().includes(col.label) ||
          h.trim().includes(col.key) ||
          col.label.includes(h.trim())
        );
        if (match) autoMapping[col.key] = match;
      }
      setColumnMapping(autoMapping);
    };
    reader.readAsBinaryString(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [columns]);

  // Get mapped preview data
  const mappedPreview = rawData.slice(0, 10).map(row => {
    const mapped: Record<string, string | number> = {};
    for (const col of columns) {
      const excelCol = columnMapping[col.key];
      mapped[col.key] = excelCol ? row[excelCol] : '';
    }
    return mapped;
  });

  // Validate: count rows with all required fields
  const validRows = rawData.filter(row => {
    for (const col of columns) {
      if (!col.required) continue;
      const excelCol = columnMapping[col.key];
      if (!excelCol || !row[excelCol]) return false;
      if (col.type === 'number' && isNaN(Number(row[excelCol]))) return false;
    }
    return true;
  });

  const invalidCount = rawData.length - validRows.length;
  const allRequiredMapped = columns.filter(c => c.required).every(c => columnMapping[c.key]);

  const handleImport = () => {
    if (validRows.length === 0) return;
    setImporting(true);

    // Map and convert types
    const mappedData = validRows.map(row => {
      const mapped: Record<string, string | number> = {};
      for (const col of columns) {
        const excelCol = columnMapping[col.key];
        const val = excelCol ? row[excelCol] : '';
        if (col.type === 'number') {
          mapped[col.key] = Number(val) || 0;
        } else {
          mapped[col.key] = String(val);
        }
      }
      return mapped;
    });

    onImport(mappedData);
    setImporting(false);
    setDialogOpen(false);
    resetState();
  };

  const resetState = () => {
    setRawData([]);
    setExcelHeaders([]);
    setColumnMapping({});
    setFileName('');
  };

  // Generate a sample Excel template for download
  const handleDownloadTemplate = () => {
    const headers = columns.map(c => c.label + (c.required ? ' *' : ''));
    const sampleRow = columns.map(c => {
      if (c.type === 'number') return 0;
      return 'نمونه';
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'داده‌ها');
    XLSX.writeFile(wb, `template-${title.replace(/\s+/g, '-')}.xlsx`);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className={cn('gap-1.5 rounded-xl border-dashed', t.outlineBtn)}
      >
        <FileSpreadsheet className="h-4 w-4" />
        ایمپورت اکسل
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetState(); }}>
        <DialogContent dir="rtl" className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-t-4 p-0" style={{ borderTopColor: `var(--color-${theme}-500, #10b981)` }}>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="gradient-text flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              ایمپورت از اکسل — {title}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Step 1: Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full">۱</Badge>
                  انتخاب فایل اکسل
                </h3>
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <FileDown className="h-3.5 w-3.5" />
                  دانلود قالب نمونه
                </Button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                  fileName ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/30'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className={cn('h-10 w-10 mx-auto mb-3', fileName ? 'text-emerald-500' : 'text-gray-300')} />
                {fileName ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-700">{fileName}</p>
                    <p className="text-xs text-emerald-600">{toPersianDigits(rawData.length)} ردیف شناسایی شد</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-600">فایل اکسل را انتخاب کنید</p>
                    <p className="text-xs text-muted-foreground">فرمت‌های مجاز: xlsx, xls, csv</p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Column Mapping */}
            {rawData.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full">۲</Badge>
                  مپ‌کردن ستون‌ها
                </h3>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
                  <MapPin className="h-3.5 w-3.5 inline ml-1" />
                  ستون‌های فایل اکسل را به فیلدهای نرم‌افزار متصل کنید. ستون‌های اجباری با * مشخص شده‌اند.
                </div>
                <div className="space-y-2">
                  {columns.map(col => (
                    <div key={col.key} className="flex items-center gap-3 bg-white border rounded-lg p-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">
                          {col.label}
                          {col.required && <span className="text-red-500 mr-0.5">*</span>}
                        </span>
                      </div>
                      <Select
                        value={columnMapping[col.key] || '__none__'}
                        onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [col.key]: val === '__none__' ? '' : val }))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="انتخاب ستون اکسل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— بدون مپ —</SelectItem>
                          {excelHeaders.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {rawData.length > 0 && mappedPreview.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full">۳</Badge>
                  پیش‌نمایش داده‌ها
                </h3>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-emerald-700">{toPersianDigits(validRows.length)}</p>
                    <p className="text-[10px] text-emerald-600">ردیف معتبر</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-600">{toPersianDigits(invalidCount)}</p>
                    <p className="text-[10px] text-red-500">ردیف نامعتبر</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <FileSpreadsheet className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-700">{toPersianDigits(rawData.length)}</p>
                    <p className="text-[10px] text-blue-600">مجموع ردیف‌ها</p>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          {columns.map(col => (
                            <TableHead key={col.key} className="text-right text-[10px] font-semibold px-2 py-2">
                              {col.label}{col.required && '*'}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedPreview.map((row, idx) => (
                          <TableRow key={idx}>
                            {columns.map(col => {
                              const val = row[col.key];
                              const isEmpty = val === '' || val === undefined;
                              const isRequired = col.required && isEmpty;
                              return (
                                <TableCell key={col.key} className={cn('text-xs px-2 py-1.5', isRequired && 'bg-red-50 text-red-500', col.type === 'number' && 'font-mono tabular-nums text-left')} dir={col.type === 'number' ? 'ltr' : 'rtl'}>
                                  {col.type === 'number' && typeof val === 'number' ? formatNumber(val) : val || '—'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {rawData.length > 10 && (
                    <div className="bg-gray-50 text-center py-2 text-xs text-muted-foreground border-t">
                      و {toPersianDigits(rawData.length - 10)} ردیف دیگر...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {rawData.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => { setDialogOpen(false); resetState(); }} className="gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  انصراف
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || !allRequiredMapped || importing}
                  className={cn('gap-1.5 shadow-md rounded-xl active:scale-[0.98]', `bg-gradient-to-r ${t.btn} ${t.btnHover} ${t.shadow}`)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {importing ? 'در حال ایمپورت...' : `ایمپورت ${toPersianDigits(validRows.length)} ردیف`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
