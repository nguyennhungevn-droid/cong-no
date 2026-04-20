import React, { useState, useRef, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  LabelList,
} from 'recharts';
import { 
  FileSpreadsheet, 
  Upload, 
  BarChart3, 
  Table as TableIcon, 
  Info, 
  Download, 
  Filter,
  PlusCircle,
  X,
  ChevronRight,
  TrendingUp,
  Box,
  Users,
  DollarSign,
  PieChart as PieChartIcon,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface ColumnMetadata {
  name: string;
  type: 'number' | 'string' | 'date';
}

interface DashboardData {
  fileName: string;
  headers: string[];
  rows: any[];
  metadata: ColumnMetadata[];
  selectedX: string;
  selectedY: string;
}

// --- Constants ---

const COLORS = ['#1a1a1a', '#4a4a4a', '#8e8e8e', '#c1c1c1', '#f0f0f0', '#ff6b35', '#004e98', '#3a6ea5'];

// --- Components ---

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'data'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Example data to show on load
  const loadSampleData = useCallback(() => {
    const sampleRows = [
      { Month: 'Tháng 1', Sales: 4000, Profit: 2400, Region: 'North' },
      { Month: 'Tháng 2', Sales: 3000, Profit: 1398, Region: 'South' },
      { Month: 'Tháng 3', Sales: 2000, Profit: 9800, Region: 'North' },
      { Month: 'Tháng 4', Sales: 2780, Profit: 3908, Region: 'East' },
      { Month: 'Tháng 5', Sales: 1890, Profit: 4800, Region: 'West' },
      { Month: 'Tháng 6', Sales: 2390, Profit: 3800, Region: 'North' },
      { Month: 'Tháng 7', Sales: 3490, Profit: 4300, Region: 'South' },
    ];
    
    setData({
      fileName: 'sample_sales_data.xlsx',
      headers: ['Month', 'Sales', 'Profit', 'Region'],
      rows: sampleRows,
      metadata: [
        { name: 'Month', type: 'string' },
        { name: 'Sales', type: 'number' },
        { name: 'Profit', type: 'number' },
        { name: 'Region', type: 'string' },
      ],
      selectedX: 'Month',
      selectedY: 'Sales',
    });
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(worksheet);

      if (rawJson.length > 0) {
        // Data cleaning: filter out empty rows and force types
        const headers = Object.keys(rawJson[0] as object);
        const metadata: ColumnMetadata[] = headers.map(header => {
          // Check types across multiple rows for better accuracy
          const sampleValues = rawJson.slice(0, 5).map(r => (r as any)[header]);
          const isNumeric = sampleValues.every(v => v === undefined || v === null || !isNaN(Number(v)));
          return { name: header, type: isNumeric ? 'number' : 'string' };
        });

        const rows = rawJson.map((row: any) => {
          const newRow: any = { ...row };
          metadata.forEach(meta => {
            if (meta.type === 'number' && row[meta.name] !== undefined) {
              const val = Number(row[meta.name]);
              newRow[meta.name] = isNaN(val) ? 0 : val;
            }
          });
          return newRow;
        });

        const numericCols = metadata.filter(m => m.type === 'number');
        const stringCols = metadata.filter(m => m.type === 'string');

        setData({
          fileName: file.name,
          headers,
          rows,
          metadata,
          selectedX: stringCols[0]?.name || headers[0],
          selectedY: numericCols[0]?.name || headers[1] || headers[0],
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // --- Data Analysis for Overview ---

  const metrics = useMemo(() => {
    if (!data) return null;
    
    // Helper to find column by name (case-insensitive and handling spaces)
    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const idHdonCol = findCol('id_hdon');
    const maKhangCol = findCol('ma_khang');
    const manhomKhCol = findCol('manhom_kh');
    const tongTienCol = findCol('tổng tiền');

    const result: { label: string; value: string; trend?: number; icon: any }[] = [];

    // 1. Tổng số hóa đơn (Record count)
    result.push({
      label: 'Tổng số hóa đơn',
      value: data.rows.length.toLocaleString(),
      icon: TableIcon
    });

    // 2. Tổng khách hàng (Unique ma_khang)
    if (maKhangCol) {
      const uniqueCustomers = new Set(data.rows.map(r => r[maKhangCol]?.toString()).filter(Boolean));
      result.push({
        label: 'Tổng khách hàng',
        value: uniqueCustomers.size.toLocaleString(),
        icon: Users
      });
    }

    // 3. Tổng Tiền (from tổng tiền)
    if (tongTienCol) {
      const sum = data.rows.reduce((acc, row) => acc + (Number(row[tongTienCol]) || 0), 0);
      result.push({
        label: 'Tổng Số Tiền',
        value: sum.toLocaleString() + ' đ',
        icon: DollarSign
      });
    }

    // Fallback if specific columns not found
    if (result.length === 0) {
      const numericCols = data.metadata.filter(m => m.type === 'number');
      numericCols.slice(0, 3).forEach((col, idx) => {
        const sum = data.rows.reduce((acc, row) => acc + (Number(row[col.name]) || 0), 0);
        result.push({
          label: `Tổng ${col.name}`,
          value: sum.toLocaleString(),
          icon: Box
        });
      });
    }

    return result;
  }, [data]);

  const khDistribution = useMemo(() => {
    if (!data) return [];
    const col = data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === 'manhom_kh');
    if (!col) return [];

    const counts: Record<string, number> = {};
    data.rows.forEach(row => {
      const val = row[col]?.toString() || 'Khác';
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  // --- Rendering Functions ---

  const renderSidebar = () => (
    <div className="w-64 border-r border-slate-200 bg-white h-screen flex flex-col pt-8 sticky top-0">
      <div className="px-6 mb-8 flex items-center gap-2">
        <div className="bg-brand-primary p-2 rounded-lg">
          <FileSpreadsheet className="text-white w-5 h-5" />
        </div>
        <h1 className="font-bold text-xl tracking-tight">XcelReport</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'charts', label: 'Analytics', icon: TrendingUp },
          { id: 'data', label: 'Raw Data', icon: TableIcon },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-left",
              activeTab === item.id 
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500 mb-3">Try our sample data to explore features.</p>
          <button 
            onClick={loadSampleData}
            className="text-xs font-semibold bg-white border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-100 transition shadow-sm w-full"
          >
            Load Sample
          </button>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div 
      className={cn(
        "flex-1 flex flex-col items-center justify-center min-h-[80vh] transition-all p-8",
        isDragging ? "bg-slate-100 scale-[0.99]" : "bg-transparent"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="relative mx-auto w-24 h-24 mb-4">
          <div className="absolute inset-0 bg-brand-primary opacity-5 rounded-full animate-pulse" />
          <div className="relative z-10 w-full h-full flex items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-full shadow-inner">
            <Upload className="w-8 h-8 text-slate-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Giao Diện Báo Cáo Thông Minh</h2>
          <p className="text-slate-500">Kéo thả tệp Excel của bạn hoặc chọn tệp để bắt đầu trực quan hóa dữ liệu.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-brand-primary text-white font-semibold py-3 px-8 rounded-2xl hover:bg-slate-800 transition shadow-lg shadow-brand-primary/10 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Chọn Tệp Excel</span>
          </button>
          <p className="text-sm text-slate-400">Định dạng hỗ trợ: XLSX, XLS, CSV</p>
        </div>

        <div className="pt-8 flex items-center justify-center gap-4 text-slate-300">
          <div className="h-px w-12 bg-slate-200" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Bắt đầu nhanh</span>
          <div className="h-px w-12 bg-slate-200" />
        </div>

        <button 
          onClick={loadSampleData}
          className="text-slate-600 font-medium hover:text-brand-primary transition flex items-center justify-center gap-1 mx-auto"
        >
          Sử dụng dữ liệu mẫu
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />
    </div>
  );

  const exportTermData = (term: number) => {
    if (!data) return;

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const maKhangCol = findCol('ma_khang');
    if (!maKhangCol) {
      alert("Không tìm thấy cột ma_khang để lọc dữ liệu.");
      return;
    }

    // 1. Identify customers with this term count
    const customerCounts: Record<string, number> = {};
    data.rows.forEach(row => {
      const id = row[maKhangCol]?.toString();
      if (id) customerCounts[id] = (customerCounts[id] || 0) + 1;
    });

    const targetCustomerIds = new Set(Object.keys(customerCounts).filter(id => customerCounts[id] === term));

    // 2. Filter original data for these customers
    const filteredRows = data.rows.filter(row => targetCustomerIds.has(row[maKhangCol]?.toString()));

    if (filteredRows.length === 0) {
      alert("Không có dữ liệu cho kỳ này.");
      return;
    }

    // 3. Export to Excel
    const worksheet = XLSX.utils.json_to_sheet(filteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Chi tiết ${term} kỳ`);
    XLSX.writeFile(workbook, `khach_hang_no_${term}_ky.xlsx`);
  };

  const exportThoaiHoanData = () => {
    if (!data) return;

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const tongTienCol = findCol('tổng tiền');
    if (!tongTienCol) {
      alert("Không tìm thấy cột tổng tiền để lọc dữ liệu.");
      return;
    }

    const filteredRows = data.rows.filter(row => (Number(row[tongTienCol]) || 0) < 0);

    if (filteredRows.length === 0) {
      alert("Không có khách hàng nào cần thoái hoàn (tiền âm).");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Khach hang thoai hoan");
    XLSX.writeFile(workbook, "khach_hang_thoai_hoan.xlsx");
  };

  const parseDateValue = (val: any) => {
    if (!val) return null;
    if (val instanceof Date) return val;

    if (typeof val === 'number') {
      const d = new Date((val - 25569) * 86400 * 1000);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    const str = String(val).trim();
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) return dateObj;
    }

    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) {
      return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
    }
    return null;
  };

  const exportNoKhoDoiData = () => {
    if (!data) return;

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const ngayPhCol = findCol('ngay_phanh') || findCol('ngay_ph_hdon') || findCol('ngay_hd') || findCol('ngay_ct') || findCol('invoice_date') || findCol('ngày phát hành');
    const tongTienCol = findCol('tổng tiền');

    if (!ngayPhCol || !tongTienCol) {
      alert("Không tìm thấy cột ngày phát hành (NGAY_PHANH) hoặc tổng tiền để lọc dữ liệu.");
      return;
    }

    const now = new Date();
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const resultWithDays = data.rows.map(row => {
      const date = parseDateValue(row[ngayPhCol]);
      if (!date) return { row, diffDays: -1 };
      
      const diffMs = d1.getTime() - date.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return { row, diffDays };
    });

    const filteredData = resultWithDays
      .filter(item => {
        const amount = Number(item.row[tongTienCol]) || 0;
        return item.diffDays > 177 && amount >= 0;
      })
      .map(item => ({
        ...item.row,
        'Số ngày nợ': item.diffDays
      }));

    if (filteredData.length === 0) {
      alert("Không có nợ khó đòi theo điều kiện (> 177 ngày).");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "No Kho Doi");
    XLSX.writeFile(workbook, "khach_hang_no_kho_doi.xlsx");
  };

  const renderOverview = () => {
    if (!data || !metrics) return null;
    
    const numericCols = data.metadata.filter(m => m.type === 'number');
    const stringCols = data.metadata.filter(m => m.type === 'string');

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tổng Quan Báo Cáo</h2>
            <p className="text-slate-500 mt-1">Found {data.rows.length} records in <span className="font-medium text-slate-900">{data.fileName}</span></p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-1">Trục X (Nhãn)</span>
              <select 
                value={data.selectedX}
                onChange={(e) => setData({...data, selectedX: e.target.value})}
                className="text-sm font-semibold bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-brand-primary/20 py-1"
              >
                {data.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-1">Trục Y (Giá trị)</span>
              <select 
                value={data.selectedY}
                onChange={(e) => setData({...data, selectedY: e.target.value})}
                className="text-sm font-semibold bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-brand-primary/20 py-1"
              >
                {numericCols.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
              </select>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
            
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-sm h-fit self-end">
               <Download className="w-4 h-4" />
               Xuất PDF
             </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                <m.icon className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <m.icon className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{m.value}</span>
                {m.trend && (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    +{m.trend}%
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bảng Nợ Phiên */}
        {phienData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <TableIcon className="w-6 h-6 text-brand-primary" />
              Bảng Nợ Phiên
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">Phiên 20</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">1 Phiên</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">2 Phiên</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">3 Phiên</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700 bg-slate-100 italic">Tổng</th>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">HD</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">Tiền</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">HD</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">Tiền</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">HD</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">Tiền</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">HD</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">Tiền</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-brand-primary font-black bg-slate-100">HD</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-brand-primary font-black bg-slate-100">Tổng Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-200 px-4 py-3 text-center tabular-nums">{phienData.phien20.hd.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right tabular-nums">{phienData.phien20.tien.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center tabular-nums">{phienData.phien1.hd.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right tabular-nums">{phienData.phien1.tien.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center tabular-nums">{phienData.phien2.hd.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right tabular-nums">{phienData.phien2.tien.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center tabular-nums">{phienData.phien3.hd.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right tabular-nums">{phienData.phien3.tien.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center tabular-nums font-black bg-slate-100 text-brand-primary">{phienData.tong.hd.toLocaleString()}</td>
                    <td className="border border-slate-200 px-4 py-3 text-right tabular-nums font-black bg-slate-100 text-brand-primary">{phienData.tong.tien.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Users className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-red-400">Khách hàng cần thoái hoàn</p>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-lg font-black text-slate-900">{phienData.thoaiHoan.customers.toLocaleString()} <span className="text-xs font-medium text-slate-500 uppercase ml-1">Mã khách hàng</span></p>
                  <div className="w-px h-4 bg-red-200" />
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-black text-red-600">{phienData.thoaiHoan.tien.toLocaleString()} <span className="text-xs font-medium text-red-400 uppercase ml-1">Tổng tiền âm</span></p>
                    <button 
                      onClick={exportThoaiHoanData}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      Tải danh sách
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Khách hàng nợ khó đòi */}
            <div className="mt-4 flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase font-bold tracking-wider text-orange-400">Khách hàng nợ khó đòi</p>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-lg font-black text-slate-900">{phienData.noKhoDoi.hd.toLocaleString()} <span className="text-xs font-medium text-slate-500 uppercase ml-1">Số hóa đơn</span></p>
                  <div className="w-px h-4 bg-orange-200" />
                  <div className="flex items-center justify-between flex-1">
                    <p className="text-lg font-black text-orange-600">{phienData.noKhoDoi.tien.toLocaleString()} <span className="text-xs font-medium text-orange-400 uppercase ml-1">Tổng tiền</span></p>
                    <button 
                      onClick={exportNoKhoDoiData}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-xl text-[10px] font-bold uppercase hover:bg-orange-600 hover:text-white transition shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      Tải danh sách
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderDataView = () => {
    if (!data) return null;
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dữ Liệu Thô</h2>
            <p className="text-sm text-slate-500">Xem trước 50 dòng đầu tiên</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" />
              Lọc Dữ Liệu
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-bottom border-slate-100">
                <tr>
                  {data.headers.map((h, i) => (
                    <th key={i} className="px-6 py-4 font-bold text-slate-900 border-r border-slate-200 last:border-0 uppercase tracking-wider text-[11px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-bottom border-slate-50 hover:bg-slate-50 transition-colors">
                    {data.headers.map((h, j) => (
                      <td key={j} className="px-6 py-4 text-slate-600 border-r border-slate-100 last:border-0 font-mono text-xs">
                        {row[h]?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- Data Analysis for Grouped View (Phân tích Số Kỳ Nợ) ---

  const groupedData = useMemo(() => {
    if (!data) return [];

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const maKhangCol = findCol('ma_khang');
    const tongTienCol = findCol('tổng tiền');
    const manhomKhCol = findCol('manhom_kh');
    const loaiKhCol = findCol('loại_khang') || findCol('loaikh') || findCol('loai_khang');

    if (!maKhangCol || !tongTienCol) {
      return [];
    }

    // 1. Đếm số lần xuất hiện của mỗi khách hàng (Số kỳ nợ)
    const customerStats: Record<string, { count: number; totalAmount: number; notes: Set<string>; loaiKhang: string }> = {};
    data.rows.forEach(row => {
      const id = row[maKhangCol]?.toString();
      if (!id) return;
      const amount = Number(row[tongTienCol]) || 0;
      const note = manhomKhCol ? row[manhomKhCol]?.toString() : '';
      const loai = loaiKhCol ? row[loaiKhCol]?.toString() : '';
      
      if (!customerStats[id]) {
        customerStats[id] = { count: 0, totalAmount: 0, notes: new Set(), loaiKhang: loai };
      }
      customerStats[id].count += 1;
      customerStats[id].totalAmount += amount;
      if (note) customerStats[id].notes.add(note);
    });

    // 2. Gom nhóm theo số kỳ (1 kỳ, 2 kỳ, ...)
    const termGroups: Record<number, { label: string; amount: number; customers: number; invoices: number; notes: string[]; term: number; toChuc: number; caNhan: number }> = {};
    Object.values(customerStats).forEach(stat => {
      const termCount = stat.count;
      if (!termGroups[termCount]) {
        termGroups[termCount] = { 
          label: `${termCount} Kỳ`, 
          term: termCount,
          amount: 0, 
          customers: 0, 
          invoices: 0, 
          notes: [],
          toChuc: 0,
          caNhan: 0
        };
      }
      const g = termGroups[termCount];
      g.amount += stat.totalAmount;
      g.customers += 1;
      g.invoices += termCount;
      
      if (stat.loaiKhang === '1') g.toChuc += 1;
      else if (stat.loaiKhang === '0') g.caNhan += 1;

      stat.notes.forEach(n => {
        if (!g.notes.includes(n)) g.notes.push(n);
      });
    });

    return Object.values(termGroups).sort((a, b) => b.term - a.term);
  }, [data]);

  const badDebtMonthlyData = useMemo(() => {
    if (!data) return [];

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const ngayPhCol = findCol('ngay_phanh') || findCol('ngay_ph_hdon') || findCol('ngay_hd') || findCol('ngay_ct') || findCol('invoice_date') || findCol('ngày phát hành');
    const tongTienCol = findCol('tổng tiền');
    const idHdonCol = findCol('id_hdon') || 'id_hdon';

    if (!ngayPhCol || !tongTienCol) return [];

    const now = new Date();
    const monthlyGroups: Record<string, { month: string; count: number; totalAmount: number; sortKey: number }> = {};

    data.rows.forEach(row => {
      const amount = Number(row[tongTienCol]) || 0;
      const date = parseDateValue(row[ngayPhCol]);
      
      if (date) {
        const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffMs = d1.getTime() - d2.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 177 && amount >= 0) {
          const m = date.getMonth() + 1;
          const y = date.getFullYear();
          const monthLabel = `Tháng ${m}/${y}`;
          const sortKey = y * 100 + m;

          if (!monthlyGroups[monthLabel]) {
            monthlyGroups[monthLabel] = { month: monthLabel, count: 0, totalAmount: 0, sortKey };
          }
          monthlyGroups[monthLabel].count += 1;
          monthlyGroups[monthLabel].totalAmount += amount;
        }
      }
    });

    return Object.values(monthlyGroups).sort((a, b) => b.sortKey - a.sortKey);
  }, [data]);

  const badDebtTypeStats = useMemo(() => {
    if (!data) return [];

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const ngayPhCol = findCol('ngay_phanh') || findCol('ngay_ph_hdon') || findCol('ngay_hd') || findCol('ngay_ct') || findCol('invoice_date') || findCol('ngày phát hành');
    const tongTienCol = findCol('tổng tiền');
    const loaiKhCol = findCol('loai_khang') || findCol('loaikh') || findCol('loại_khang');

    if (!ngayPhCol || !tongTienCol) return [];

    const now = new Date();
    let toChucAmount = 0;
    let caNhanAmount = 0;
    let toChucInvoices = 0;
    let caNhanInvoices = 0;

    data.rows.forEach(row => {
      const amount = Number(row[tongTienCol]) || 0;
      const date = parseDateValue(row[ngayPhCol]);
      const loai = loaiKhCol ? row[loaiKhCol]?.toString() : '';
      
      if (date) {
        const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffMs = d1.getTime() - d2.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 177 && amount >= 0) {
          if (loai === '1') {
            toChucAmount += amount;
            toChucInvoices += 1;
          } else {
            caNhanAmount += amount;
            caNhanInvoices += 1;
          }
        }
      }
    });

    return [
      { name: 'Cá Nhân', value: caNhanAmount, invoices: caNhanInvoices, color: '#ef4444' }, // Red-500
      { name: 'Tổ Chức', value: toChucAmount, invoices: toChucInvoices, color: '#3b82f6' }  // Blue-500
    ].filter(i => i.invoices > 0);
  }, [data]);

  const phienData = useMemo(() => {
    if (!data) return null;

    const findCol = (name: string) => {
      const lower = name.toLowerCase().replace(/\s/g, '');
      return data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
    };

    const maSoCol = findCol('ma_sogcs') || findCol('mã sổ') || findCol('maso') || findCol('ma_so');
    const tongTienCol = findCol('tổng tiền');
    const maKhangCol = findCol('ma_khang');

    if (!maSoCol || !tongTienCol) return null;

    const stats = {
      phien20: { hd: 0, tien: 0 },
      phien1: { hd: 0, tien: 0 },
      phien2: { hd: 0, tien: 0 },
      phien3: { hd: 0, tien: 0 },
      tong: { hd: 0, tien: 0 },
      thoaiHoan: { customers: 0, tien: 0 },
      noKhoDoi: { hd: 0, tien: 0 }
    };

    const thoaiHoanCustomerIds = new Set<string>();
    const ngayPhCol = findCol('ngay_phanh') || findCol('ngay_ph_hdon') || findCol('ngay_hd') || findCol('ngay_ct') || findCol('invoice_date') || findCol('ngày phát hành');
    
    const now = new Date();
    
    data.rows.forEach(row => {
      const maSo = row[maSoCol]?.toString() || '';
      const amount = Number(row[tongTienCol]) || 0;
      const maKhang = maKhangCol ? row[maKhangCol]?.toString() : null;
      const idHdon = row[findCol('id_hdon') || 'id_hdon']?.toString();

      if (maSo.startsWith('20')) {
        stats.phien20.hd += 1;
        stats.phien20.tien += amount;
      } else if (maSo.startsWith('B2')) {
        stats.phien2.hd += 1;
        stats.phien2.tien += amount;
      } else if (maSo.startsWith('B3')) {
        stats.phien3.hd += 1;
        stats.phien3.tien += amount;
      } else {
        // Tất cả các mã khác (không bắt đầu bằng 20, B2, B3) thì gom hết vào B1
        stats.phien1.hd += 1;
        stats.phien1.tien += amount;
      }
      
      if (amount < 0 && maKhang) {
        thoaiHoanCustomerIds.add(maKhang);
        stats.thoaiHoan.tien += amount;
      }

      // Nợ khó đòi logic: (Ngày hiện tại - NGAY_PHANH) > 177 ngày
      if (ngayPhCol) {
        const date = parseDateValue(row[ngayPhCol]);
        if (date) {
          const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          
          const diffMs = d1.getTime() - d2.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          
          if (diffDays > 177 && amount >= 0) {
            stats.noKhoDoi.hd += 1;
            stats.noKhoDoi.tien += amount;
          }
        }
      }

      stats.tong.hd += 1;
      stats.tong.tien += amount;
    });

    stats.thoaiHoan.customers = thoaiHoanCustomerIds.size;

    return stats;
  }, [data]);

  const renderChartsView = () => {
    if (!data || !phienData) return null;

    return (
      <div className="space-y-8 pb-12 animate-in fade-in duration-500">
        {/* Debt Term Analysis Table (Matching requested style) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md overflow-hidden">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
             <TrendingUp className="w-6 h-6 text-brand-primary" />
             Phân Tích Số Kỳ Nợ Chi Tiết
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-left font-bold text-slate-800">Số kỳ nợ</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-800">Số KH</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-800">Số HĐ</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-800">Tổng Tiền (đ)</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800">Ghi Chú & Danh Sách</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 border-b border-slate-50">
                      <span className="font-medium text-slate-600 underline decoration-slate-200 underline-offset-4 decoration-2">
                        {row.term || row.label} Kỳ
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-slate-50 text-right tabular-nums text-slate-500 font-medium whitespace-nowrap">
                      {row.customers.toLocaleString()} KH
                    </td>
                    <td className="px-6 py-4 border-b border-slate-50 text-right tabular-nums text-slate-500 font-medium whitespace-nowrap">
                      {row.invoices.toLocaleString()} HĐ
                    </td>
                    <td className="px-6 py-4 border-b border-slate-50 text-right tabular-nums font-bold text-red-600">
                      {(row.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 border-b border-slate-50">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          {(row.toChuc > 0 || row.caNhan > 0) && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded">Tổ chức: {row.toChuc}</span>
                              <span className="text-[10px] font-bold text-orange-600 px-1.5 py-0.5 bg-orange-50 rounded">Cá nhân: {row.caNhan}</span>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 italic">
                            Tỉ lệ Tổ chức: {((row.toChuc / row.customers) * 100).toFixed(1)}%
                          </span>
                        </div>
                        {row.term > 0 && (
                          <button 
                            onClick={() => exportTermData(row.term)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-xl hover:bg-black transition-all shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            File DS
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {groupedData.length > 0 && (
                  <tr className="bg-red-50/30 font-bold">
                    <td className="px-6 py-5 text-left text-red-900 uppercase text-[10px] tracking-widest">Tổng cộng</td>
                    <td className="px-6 py-5 text-right tabular-nums text-red-900/80 whitespace-nowrap">
                      {groupedData.reduce((acc, curr) => acc + curr.customers, 0).toLocaleString()} KH
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums text-red-900/80 whitespace-nowrap">
                      {groupedData.reduce((acc, curr) => acc + curr.invoices, 0).toLocaleString()} HĐ
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums text-red-700 text-lg decoration-2 underline decoration-red-200 underline-offset-4">
                      {groupedData.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 border-l border-red-100/50"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bad Debt Monthly Analysis */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3">
               <AlertCircle className="w-6 h-6 text-red-500" />
               Phân Tích Nợ Khó Đòi Theo Tháng (&gt; 177 ngày)
            </h3>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100 italic">
                Điều kiện: Nợ &gt; 177 ngày &amp; Tiền ≥ 0
              </div>
              <button 
                onClick={exportNoKhoDoiData}
                className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-sm"
                title="Tải danh sách nợ khó đòi"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <div className="h-[350px] w-full bg-slate-50/30 rounded-3xl p-4 border border-dashed border-slate-200">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={badDebtTypeStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {badDebtTypeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: any, name: string, props: any) => {
                        const invoices = props.payload.invoices;
                        return [
                         <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-900">{Number(value).toLocaleString()} đ</span>
                            <span className="text-xs text-slate-500 italic">Số hóa đơn: {invoices}</span>
                         </div>,
                         `${name}`
                        ];
                      }}
                    />
                    <Legend 
                       verticalAlign="bottom" 
                       height={60}
                       formatter={(value, entry: any) => {
                         const payload = entry.payload;
                         const totalAmount = badDebtTypeStats.reduce((a, b) => a + b.value, 0);
                         const percent = ((payload.value / totalAmount) * 100).toFixed(1);
                         return (
                           <span className="text-[11px] font-bold text-slate-700 ml-1 inline-flex flex-col">
                             <span>{value}: {percent}%</span>
                             <span className="font-normal text-slate-400 text-[10px]">
                               {payload.invoices.toLocaleString()} HĐ | {payload.value.toLocaleString()} đ
                             </span>
                           </span>
                         );
                       }}
                    />
                  </PieChart>
                </ResponsiveContainer>
             </div>

             <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-700 border-b border-slate-100">Tháng</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700 border-b border-slate-100">Số HĐ</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700 border-b border-slate-100">Tổng Tiền (đ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {badDebtMonthlyData.map((group, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 border-b border-slate-50 font-medium text-slate-600">{group.month}</td>
                        <td className="px-4 py-3 border-b border-slate-50 text-right tabular-nums">{group.count.toLocaleString()}</td>
                        <td className="px-4 py-3 border-b border-slate-50 text-right tabular-nums font-bold text-red-600">{group.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {badDebtMonthlyData.length > 0 && (
                      <tr className="bg-red-50/30 font-bold border-t-2 border-red-100">
                        <td className="px-4 py-4 text-left text-red-900 uppercase text-[10px] tracking-wider">Tổng cộng</td>
                        <td className="px-4 py-4 text-right tabular-nums text-red-900 border-l border-white/50">
                          {badDebtMonthlyData.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-red-700 text-base border-l border-white/50">
                          {badDebtMonthlyData.reduce((acc, curr) => acc + curr.totalAmount, 0).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {badDebtMonthlyData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Không có dữ liệu thỏa mãn điều kiện</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans">
      {data && renderSidebar()}
      
      <main className="flex-1 flex flex-col">
        {data ? (
          <div className="p-8 max-w-6xl mx-auto w-full">
            <header className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100 overflow-hidden">
                   <img src={`https://api.dicebear.com/7.x/initials/svg?seed=User`} alt="User avatar" className="w-10 h-10" />
                 </div>
                 <div>
                   <h4 className="font-bold text-sm">Chào mừng quay lại</h4>
                   <p className="text-xs text-slate-500">nguyennhungevn@gmail.com</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button 
                  onClick={() => setData(null)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Xóa dữ liệu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'charts' && renderChartsView()}
                {activeTab === 'data' && renderDataView()}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          renderEmptyState()
        )}
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden drop-shadow-2xl">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
