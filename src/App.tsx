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
  List,
  PlusCircle,
  X,
  ChevronRight,
  TrendingUp,
  Box,
  Users,
  DollarSign,
  PieChart as PieChartIcon,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import localforage from 'localforage';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'data' | 'segmentation' | 'bad_debt'>('overview');
  const [selectedPhien, setSelectedPhien] = useState<string>('20');
  const [rawSelectedPhien, setRawSelectedPhien] = useState<string>('all'); // Independent session filter for Raw Data
  const [detailSearch, setDetailSearch] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>(''); // For manual search execution
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic'); // Toggle for search logic
  const [isLoadingPersisted, setIsLoadingPersisted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted data on mount
  React.useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await localforage.getItem<DashboardData>('xcel_report_data');
        if (savedData) {
          setData(savedData);
        }
      } catch (err) {
        console.error("Error loading saved data:", err);
      } finally {
        setIsLoadingPersisted(false);
      }
    };
    loadSavedData();
  }, []);

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
    reader.onload = async (e) => {
      try {
        const dataArr = e.target?.result;
        const workbook = XLSX.read(dataArr, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length > 0) {
          const headers = Object.keys(rawJson[0] as object);
          const metadata: ColumnMetadata[] = headers.map(header => {
            const sampleValues = rawJson.slice(0, 5).map(r => (r as any)[header]);
            const isNumeric = sampleValues.every(v => v === undefined || v === null || v === '' || !isNaN(Number(v)));
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

          const newData: DashboardData = {
            fileName: file.name,
            headers,
            rows,
            metadata,
            selectedX: stringCols[0]?.name || headers[0],
            selectedY: numericCols[0]?.name || headers[1] || headers[0],
          };

          setData(newData);
          // Save to local storage
          try {
            await localforage.setItem('xcel_report_data', newData);
          } catch (err) {
            console.error("Error saving data to local storage", err);
          }
        }
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.");
      }
    };
    reader.readAsArrayBuffer(file);
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

  // --- Helper for Robust Column Detection ---
  const findColumn = useCallback((targets: string[]) => {
    if (!data) return null;
    
    // Chuẩn hóa chuỗi: viết thường, bỏ dấu tiếng Việt, bỏ khoảng trắng/kí tự đặc biệt
    const normalize = (s: string) => 
      s.toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
       .replace(/[\s\-_/\\\(\)\[\]\.]/g, "");

    const cleanTargets = targets.map(normalize);
    
    // Tìm khớp tuyệt đối trước
    for (const target of cleanTargets) {
      const found = data.headers.find(h => normalize(h) === target);
      if (found) return found;
    }
    
    // Nếu không thấy tuyệt đối, tìm khớp theo kiểu chứa chuỗi (contains)
    for (const target of cleanTargets) {
      const found = data.headers.find(h => normalize(h).includes(target) || target.includes(normalize(h)));
      if (found) return found;
    }

    return null;
  }, [data]);

  // --- Data Analysis for Overview ---

  const metrics = useMemo(() => {
    if (!data) return null;
    
    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'mã khách hàng']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'sotien', 'thành tiền']);

    const result: { label: string; value: string; trend?: number; icon: any }[] = [];

    // 1. Tổng số hóa đơn
    result.push({
      label: 'Tổng số hóa đơn',
      value: data.rows.length.toLocaleString(),
      icon: TableIcon
    });

    // 2. Tổng khách hàng
    if (maKhangCol) {
      const uniqueCustomers = new Set(data.rows.map(r => r[maKhangCol]?.toString()).filter(Boolean));
      result.push({
        label: 'Tổng khách hàng',
        value: uniqueCustomers.size.toLocaleString(),
        icon: Users
      });
    }

    // 3. Tổng Tiền
    if (tongTienCol) {
      const sum = data.rows.reduce((acc, row) => acc + (Number(row[tongTienCol]) || 0), 0);
      result.push({
        label: 'Tổng Số Tiền',
        value: sum.toLocaleString() + ' đ',
        icon: DollarSign
      });
    }

    // Fallback if specific columns not found
    if (result.length <= 1) {
      const numericCols = data.metadata.filter(m => m.type === 'number');
      numericCols.slice(0, 3).forEach((col) => {
        const sum = data.rows.reduce((acc, row) => acc + (Number(row[col.name]) || 0), 0);
        result.push({
          label: `Tổng ${col.name}`,
          value: sum.toLocaleString(),
          icon: Box
        });
      });
    }

    return result;
  }, [data, findColumn]);

  const khDistribution = useMemo(() => {
    if (!data) return [];
    const col = findColumn(['manhom_kh', 'nhóm kh', 'nhomkh', 'mã nhóm']);
    if (!col) return [];

    const counts: Record<string, number> = {};
    data.rows.forEach(row => {
      const val = row[col]?.toString() || 'Khác';
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data, findColumn]);

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
          { id: 'overview', label: 'Tổng Quát', icon: BarChart3 },
          { id: 'segmentation', label: 'Phân Tích Phiên', icon: Layers },
          { id: 'bad_debt', label: 'Nợ Khó Đòi', icon: AlertCircle },
          { id: 'data', label: 'Dữ Liệu Thô', icon: TableIcon },
          { id: 'charts', label: 'Biểu Đồ Khác', icon: PieChartIcon },
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
    </div>
  );


  const renderEmptyState = () => (
    <div className="flex-1 flex min-h-screen">
      {/* Left side: Blue accent section */}
      <div className="hidden lg:flex w-1/2 bg-brand-primary items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-black/20 rounded-full blur-2xl" />
        
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10 space-y-8 max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            PC VŨNG TÀU
          </div>
          
          <div className="space-y-4">
            <h2 className="text-6xl font-black tracking-tighter leading-none uppercase italic">
              Phân Tích <br />
              <span className="text-white/70">Dữ Liệu</span> <br />
              Công Nợ
            </h2>
            <div className="h-1.5 w-20 bg-white rounded-full" />
          </div>

          <p className="text-blue-50 text-xl font-medium leading-relaxed opacity-90">
            Hệ thống tự động hóa việc phân tách số kỳ nợ, lọc khách hàng thoái hoàn và cảnh báo nợ khó đòi.
          </p>
          
          <div className="flex flex-col gap-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 bg-white/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Tự động phân nhóm</h4>
                <p className="text-blue-200/80 text-sm">Phân tách nợ theo Phiên 20, B2, B3 và B1 tức.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 bg-white/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Xuất danh sách mẫu</h4>
                <p className="text-blue-200/80 text-sm">Hỗ trợ xuất biểu mẫu thu hồi nợ và thoái hoàn.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side: Compact Upload Card */}
      <div 
        className={cn(
          "flex-1 flex flex-col items-center justify-center transition-all p-8 md:p-12 bg-slate-50 relative",
          isDragging ? "bg-slate-100 scale-[0.99]" : ""
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="max-w-sm w-full text-center space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-10"
        >
          <div className="relative mx-auto w-24 h-24 mb-2">
            <div className="absolute inset-0 bg-brand-primary opacity-10 rounded-full animate-bounce duration-[3000ms]" />
            <div className="relative z-10 w-full h-full flex items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-full shadow-inner group-hover:border-brand-primary transition-colors">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Tải Báo Cáo</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">Kéo thả tệp Excel của bạn hoặc chọn tệp để bắt đầu phân tích dữ liệu.</p>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group relative overflow-hidden bg-brand-primary text-white font-bold py-5 px-8 rounded-2xl hover:bg-blue-700 transition-all duration-300 shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3"
            >
              <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              <span>Bắt đầu ngay</span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform" />
            </button>
            
            <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <FileSpreadsheet className="w-3 h-3" />
                  .XLSX
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <FileSpreadsheet className="w-3 h-3" />
                  .CSV
                </div>
            </div>
          </div>
        </motion.div>

        {/* Decorative elements for the right side */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-slate-200/40 rounded-full blur-3xl -z-0" />
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
        />
      </div>
    </div>
  );

  const saveAsExcel = (workbook: XLSX.WorkBook, fileName: string) => {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  };

  const exportTermData = (term: number) => {
    if (!data) return;

    const findCol = (targets: string[]) => {
      for (const t of targets) {
        const lowerT = t.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
        const found = data.headers.find(h => h.toLowerCase().replace(/\s/g, '').replace(/_/g, '') === lowerT);
        if (found) return found;
      }
      return null;
    };

    const maKhangCol = findCol(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'mã khách hàng']);
    const sogcsCol = findCol(['ma_sogcs', 'sogcs', 'mã sổ', 'maso_gcs', 'masogcs']);
    
    if (!maKhangCol) {
      alert("Không tìm thấy cột thông tin Mã khách hàng để lọc dữ liệu.");
      return;
    }

    // Filter rows by selected session
    const sessionRows = data.rows.filter(row => {
      if (selectedPhien === 'all') return true;
      const sogcs = row[sogcsCol || '']?.toString() || '';
      const isB2 = sogcs.startsWith('B2');
      const isB3 = sogcs.startsWith('B3');
      const is20 = sogcs.startsWith('20');
      
      if (selectedPhien === '20') return is20;
      if (selectedPhien === 'B2') return isB2;
      if (selectedPhien === 'B3') return isB3;
      if (selectedPhien === 'B1') return !isB2 && !isB3 && !is20;
      if (selectedPhien === 'KH110') return sogcs === 'B3AD004ZA'; // Keeping special case
      return true;
    });

    // Count terms within this session
    const customerCounts: Record<string, number> = {};
    sessionRows.forEach(row => {
      const id = row[maKhangCol]?.toString();
      if (id) customerCounts[id] = (customerCounts[id] || 0) + 1;
    });

    const targetCustomerIds = new Set(Object.keys(customerCounts).filter(id => customerCounts[id] === term));
    const finalFilteredRows = sessionRows.filter(row => targetCustomerIds.has(row[maKhangCol]?.toString()));

    if (finalFilteredRows.length === 0) {
      alert("Không có dữ liệu cho số kỳ này trong phiên đã chọn.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(finalFilteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Chi tiết ${term} kỳ`);
    saveAsExcel(workbook, `khach_hang_no_${term}_ky_phien_${selectedPhien.toUpperCase()}.xlsx`);
  };

  const exportThoaiHoanData = () => {
    if (!data) return;

    const findCol = (targets: string[]) => {
      for (const t of targets) {
        const lowerT = t.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
        const found = data.headers.find(h => h.toLowerCase().replace(/\s/g, '').replace(/_/g, '') === lowerT);
        if (found) return found;
      }
      return null;
    };

    const tongTienCol = findCol(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'sotien']);
    if (!tongTienCol) {
      alert("Không tìm thấy cột Tổng tiền để lọc dữ liệu.");
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
    saveAsExcel(workbook, "khach_hang_thoai_hoan.xlsx");
  };

  const exportCurrentSessionData = () => {
    if (!data || baseFilteredRows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(baseFilteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Toan Bo Phien ${selectedPhien}`);
    saveAsExcel(workbook, `danh_sach_no_toan_bo_phien_${selectedPhien.toUpperCase()}.xlsx`);
  };

  const parseDateValue = (val: any) => {
    if (!val) return null;
    if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate());

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
      if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === y && dateObj.getMonth() === m - 1) {
        return dateObj;
      }
    }

    const nativeDate = new Date(str);
    if (!isNaN(nativeDate.getTime())) {
      return new Date(nativeDate.getFullYear(), nativeDate.getMonth(), nativeDate.getDate());
    }
    
    return null;
  };

  const exportNoKhoDoiData = () => {
    if (!data) return;

    const findCol = (targets: string[]) => {
      for (const t of targets) {
        const lowerT = t.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
        const found = data.headers.find(h => h.toLowerCase().replace(/\s/g, '').replace(/_/g, '') === lowerT);
        if (found) return found;
      }
      return null;
    };

    const ngayPhCol = findCol(['ngay_phanh', 'ngayphanh', 'ngay_ph_hdon', 'ngay_hd', 'ngày phát hành', 'ngày hd']);
    const tongTienCol = findCol(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'sotien']);

    if (!ngayPhCol || !tongTienCol) {
      alert("Không tìm thấy cột Ngày phát hành hoặc Tổng tiền để lọc dữ liệu.");
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
        return item.diffDays > 177 && amount > 0;
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
    saveAsExcel(workbook, "khach_hang_no_kho_doi.xlsx");
  };

  const handleExport = () => {
    if (!data) return;
    const worksheet = XLSX.utils.json_to_sheet(data.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Báo cáo tổng hợp");
    saveAsExcel(workbook, "bao_cao_tong_hop.xlsx");
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
            <p className="text-slate-500 mt-1">Tìm thấy {data.rows.length} bản ghi trong <span className="font-medium text-slate-900">{data.fileName}</span></p>
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
            
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm h-fit self-end">
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
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">Phiên B1</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">Phiên B2</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700">Phiên B3</th>
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
                      <Download className="w-3 h-3" />                Tải DS                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-10 border-t border-slate-100">
              <div className="flex items-center justify-between w-full mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase">Phân Tích Nợ Chi Tiết</h3>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!data) return;
                    
                    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'ma kh', 'mã khách hàng']);
                    const tenKhangCol = findColumn(['ten_khang', 'tenkhang', 'tên khách hàng', 'ten khang', 'tên kh']);
                    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'tien_no', 'so tien', 'tong_no']);
                    const maKhttCol = findColumn(['ma_khtt', 'makhtt', 'mã khtt', 'ma khtt']);
                    const maSoCol = findColumn(['ma_sogcs', 'mã sổ', 'maso', 'ma_so', 'sổ gcs']);

                    if (!maKhangCol) {
                      alert("Không tìm thấy cột Mã khách hàng để xử lý");
                      return;
                    }

                    // Group by Customer ID
                    const customersMap = new Map<string, any>();
                    data.rows.forEach(row => {
                      const makh = row[maKhangCol]?.toString() || '';
                      if (!makh) return;
                      
                      if (!customersMap.has(makh)) {
                        customersMap.set(makh, {
                          'Mã Khách Hàng': makh,
                          'Tên Khách Hàng': row[tenKhangCol || ''] || '',
                          'Mã KHTT': row[maKhttCol || ''] || '',
                          'Mã Sổ GCS': row[maSoCol || ''] || '',
                          'Số Kỳ Nợ': 0,
                          'Tổng Tiền Nợ': 0,
                          'Số Hóa Đơn': 0
                        });
                      }
                      
                      const cur = customersMap.get(makh);
                      cur['Số Kỳ Nợ'] += 1;
                      cur['Tổng Tiền Nợ'] += (Number(row[tongTienCol || '']) || 0);
                      cur['Số Hóa Đơn'] += 1;
                    });

                    // Sort by debt cycles descending
                    const sortedData = Array.from(customersMap.values()).sort((a, b) => b['Số Kỳ Nợ'] - a['Số Kỳ Nợ']);

                    const worksheet = XLSX.utils.json_to_sheet(sortedData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Phan_Tich_No_Khach_Hang");
                    XLSX.writeFile(workbook, `Phan_Tich_No_Toan_Bo_${new Date().getTime()}.xlsx`);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Tải DS Toàn Bộ
                </button>
              </div>

              <div className="bg-slate-50/50 rounded-[2.5rem] p-4 border border-slate-100 shadow-inner">
                <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-900">
                          <th className="px-8 py-5 text-left font-black text-white uppercase text-[10px] tracking-[0.2em] italic border-r border-white/10">Số Kỳ</th>
                          <th className="px-6 py-5 text-right font-black text-white uppercase text-[10px] tracking-[0.2em] italic border-r border-white/10">Khách Hàng</th>
                          <th className="px-6 py-5 text-right font-black text-white uppercase text-[10px] tracking-[0.2em] italic border-r border-white/10">Hóa Đơn</th>
                          <th className="px-6 py-5 text-right font-black text-white uppercase text-[10px] tracking-[0.2em] italic border-r border-white/10">Tiền Nợ</th>
                          <th className="px-6 py-5 text-center font-black text-white uppercase text-[10px] tracking-[0.2em] italic border-r border-white/10">Cơ Cấu TC/CN</th>
                          <th className="px-6 py-5 text-right font-black text-white uppercase text-[10px] tracking-[0.2em] italic">Dữ Liệu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fullGroupedData.map((row, idx) => {
                          const total = row.toChuc + row.caNhan;
                          const pTC = total > 0 ? (row.toChuc / total) * 100 : 0;
                          
                          return (
                            <tr key={idx} className="group hover:bg-indigo-50/40 transition-all duration-300">
                              <td className="px-8 py-6 font-black text-slate-900 border-r border-slate-50">
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">{row.term}</span>
                                  <span className="uppercase italic tracking-tight">{row.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-right tabular-nums font-bold text-slate-600 border-r border-slate-50">
                                {row.customers.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium"></span>
                              </td>
                              <td className="px-6 py-6 text-right tabular-nums font-bold text-slate-600 border-r border-slate-50">
                                {row.invoices.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium"></span>
                              </td>
                              <td className="px-6 py-6 text-right tabular-nums font-black text-indigo-700 text-base border-r border-slate-50">
                                {row.amount.toLocaleString()} 
                              </td>
                              <td className="px-6 py-6 border-r border-slate-50">
                                <div className="flex items-center justify-center gap-4">
                                  <div className="flex flex-col items-end min-w-[60px]">
                                    <span className="text-[10px] font-bold text-blue-600">TC: {row.toChuc}</span>
                                    <span className="text-[10px] font-black text-slate-400">{pTC.toFixed(0)}%</span>
                                  </div>
                                  <div 
                                    className="w-10 h-10 rounded-full shadow-sm relative overflow-hidden flex-shrink-0 border-2 border-white" 
                                    style={{
                                      background: `conic-gradient(#2563eb 0% ${pTC}%, #f97316 ${pTC}% 100%)`
                                    }}
                                  />
                                  <div className="flex flex-col items-start min-w-[60px]">
                                    <span className="text-[10px] font-bold text-orange-600">CN: {row.caNhan}</span>
                                    <span className="text-[10px] font-black text-slate-400">{(100 - pTC).toFixed(0)}%</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <button 
                                  onClick={() => exportTermData(row.term)}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                >
                                  <Download className="w-3.5 h-3.5" />    Tải DS
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {fullGroupedData.length > 0 && (
                          <tr className="bg-indigo-600 text-white">
                            <td className="px-8 py-6 font-black uppercase text-[11px] tracking-[0.2em] italic">Tổng Cộng</td>
                            <td className="px-6 py-6 text-right tabular-nums font-bold">
                              {fullGroupedData.reduce((acc, curr) => acc + curr.customers, 0).toLocaleString()} 
                            </td>
                            <td className="px-6 py-6 text-right tabular-nums font-bold">
                              {fullGroupedData.reduce((acc, curr) => acc + curr.invoices, 0).toLocaleString()} 
                            </td>
                            <td className="px-6 py-6 text-right tabular-nums font-black text-xl">
                              {fullGroupedData.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()} 
                            </td>
                            <td className="px-6 py-6"></td>
                            <td className="px-6 py-6"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderBadDebtView = () => {
    if (!data) return null;

    const ngayPhCol = findColumn(['ngay_phanh', 'ngay ph anh', 'ngày phát hành', 'ngay_ph', 'ngay ph']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'sotien']);
    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'mã khách hàng']);
    const tenKhangCol = findColumn(['ten_khang', 'tenkhang', 'tên khách hàng', 'ten khang', 'tên kh']);

    const loaiKhCol = findColumn(['loại_khang', 'loaikh', 'loai_kh', 'loai', 'phan_loai', 'tc_cn', 'dt_kh', 'loai kh', 'loai khang']);

    if (!ngayPhCol || !tongTienCol) {
      return (
        <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl text-center">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-orange-900">Không tìm thấy cột dữ liệu thời gian</h3>
          <p className="text-orange-600 mt-2">Vui lòng kiểm tra lại file Excel (Cần cột "Ngày phát hành" hoặc "Ngay_PHanh")</p>
        </div>
      );
    }

    const today = new Date(2026, 3, 23); // Standard comparison date
    const badDebtRows = data.rows.filter(row => {
      const date = parseDateValue(row[ngayPhCol]);
      if (!date) return false;
      const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(row[tongTienCol]) || 0;
      return diffDays > 177 && amount > 0;
    }).map(row => {
      const date = parseDateValue(row[ngayPhCol]);
      const diffDays = date ? Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const loaiRaw = loaiKhCol ? row[loaiKhCol]?.toString().toLowerCase().trim() || '' : '';
      const isToChuc = loaiRaw === '1' || 
                       loaiRaw.includes('tc') || 
                       loaiRaw.includes('to chuc') || 
                       loaiRaw.includes('tong cong ty') ||
                       loaiRaw.includes('doanh nghiep');
      
      return { ...row, _diffDays: diffDays, _isToChuc: isToChuc };
    });

    // Thống kê theo tháng phát hành
    const monthlyStats: Record<string, { month: string; amount: number; count: number; toChuc: number; caNhan: number }> = {};
    badDebtRows.forEach(row => {
       const date = parseDateValue(row[ngayPhCol]);
       if (date) {
         const m = (date.getMonth() + 1).toString().padStart(2, '0');
         const y = date.getFullYear();
         const key = `${m}/${y}`;
         if (!monthlyStats[key]) monthlyStats[key] = { month: key, amount: 0, count: 0, toChuc: 0, caNhan: 0 };
         monthlyStats[key].amount += (Number(row[tongTienCol]) || 0);
         monthlyStats[key].count += 1;
         if (row._isToChuc) monthlyStats[key].toChuc += 1;
         else monthlyStats[key].caNhan += 1;
       }
    });

    const chartData = Object.values(monthlyStats).sort((a,b) => {
      const [m1, y1] = a.month.split('/').map(Number);
      const [m2, y2] = b.month.split('/').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
    });

    const totalAmount = badDebtRows.reduce((acc, r) => acc + (Number(r[tongTienCol]) || 0), 0);

    // Grouping bad debt by customer
    const customerBadDebt: Record<string, { id: string; name: string; count: number; amount: number }> = {};
    badDebtRows.forEach(row => {
      const id = row[maKhangCol || '']?.toString();
      if (!id) return;
      if (!customerBadDebt[id]) {
        customerBadDebt[id] = { id, name: row[tenKhangCol || '']?.toString() || '', count: 0, amount: 0 };
      }
      customerBadDebt[id].count += 1;
      customerBadDebt[id].amount += (Number(row[tongTienCol]) || 0);
    });

    const groupedCustomerData = Object.values(customerBadDebt).sort((a,b) => b.amount - a.amount);

    const exportToExcel = () => {
      const exportData = groupedCustomerData.map(row => ({
        'Mã KH': row.id,
        'Tên Khách Hàng': row.name,
        'Số Hóa Đơn': row.count,
        'Tổng Tiền Nợ': row.amount
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tong_Hop_No_KH");
      XLSX.writeFile(wb, `Bao_Cao_No_Kho_Doi_KH_${new Date().toLocaleDateString('vi-VN')}.xlsx`);
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200">
               <AlertCircle className="w-8 h-8 text-white" />
             </div>
             <div>
               <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Phân Tích Nợ Khó Đòi</h2>
               <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1.5 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                 Danh sách hóa đơn {'>'} 177 ngày chưa thanh toán
               </p>
             </div>
           </div>
           
           <button 
             onClick={exportToExcel}
             className="h-12 px-8 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-emerald-600 transition-all shadow-lg active:scale-95 flex items-center gap-2"
           >
             <FileSpreadsheet className="w-4 h-4" />
             Xuất File Excel
           </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng tiền nợ</p>
              <h3 className="text-3xl font-black text-red-600 tabular-nums">{totalAmount.toLocaleString()} đ</h3>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                 <DollarSign className="w-3.5 h-3.5" />
                 Bao gồm {badDebtRows.length.toLocaleString()} hóa đơn
              </div>
           </div>

           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số KH bị ảnh hưởng</p>
              <h3 className="text-3xl font-black text-slate-900 tabular-nums">
                {new Set(badDebtRows.map(r => r[maKhangCol || ''])).size.toLocaleString()}
              </h3>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                 <Users className="w-3.5 h-3.5" />
                 Mã khách hàng duy nhất
              </div>
           </div>
        </div>

        {/* Summary Table by Month */}
        <div className="bg-white p-0 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="p-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                 <TableIcon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 uppercase italic">Tổng hợp nợ theo tháng phát hành</h4>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                 <thead>
                    <tr className="bg-slate-50/50">
                       <th className="px-8 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Tháng</th>
                       <th className="px-8 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Số HĐ</th>
                       <th className="px-8 py-4 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Tổng Tiền (đ)</th>
                       <th className="px-8 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Phân Loại</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {chartData.sort((a,b) => {
                      const [m1, y1] = a.month.split('/').map(Number);
                      const [m2, y2] = b.month.split('/').map(Number);
                      return y2 !== y1 ? y2 - y1 : m2 - m1;
                    }).map((row, idx) => {
                      const totalKH = row.toChuc + row.caNhan;
                      const tcPercent = totalKH > 0 ? (row.toChuc / totalKH) * 100 : 0;
                      const cnPercent = totalKH > 0 ? (row.caNhan / totalKH) * 100 : 0;

                      return (
                       <tr key={idx} className="hover:bg-red-50/20 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-600">Tháng {row.month}</td>
                          <td className="px-8 py-4 text-center font-bold text-slate-900 tabular-nums">{row.count.toLocaleString()}</td>
                          <td className="px-8 py-4 text-right font-black text-red-600 tabular-nums">{row.amount.toLocaleString()}</td>
                          <td className="px-8 py-4">
                             <div className="flex flex-col gap-1.5 min-w-[120px]">
                                <div className="flex justify-between text-[9px] font-black uppercase">
                                   <span className="text-emerald-600">TC: {row.toChuc}</span>
                                   <span className="text-orange-600">CN: {row.caNhan}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                   <div style={{ width: `${tcPercent}%` }} className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                   <div style={{ width: `${cnPercent}%` }} className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
                                </div>
                             </div>
                          </td>
                       </tr>
                      );
                    })}
                    <tr className="bg-red-50/30 border-t-2 border-red-100 font-black">
                       <td className="px-8 py-5 text-red-900 uppercase text-[10px] tracking-[0.2em] italic">TỔNG CỘNG</td>
                       <td className="px-8 py-5 text-center text-red-900 text-base tabular-nums">
                          {chartData.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()}
                       </td>
                       <td className="px-8 py-5 text-right text-red-700 text-lg tabular-nums">
                          {chartData.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                       </td>
                       <td className="px-8 py-5">
                          {(() => {
                             const totalTC = chartData.reduce((acc, curr) => acc + curr.toChuc, 0);
                             const totalCN = chartData.reduce((acc, curr) => acc + curr.caNhan, 0);
                             const totalAll = totalTC + totalCN;
                             const tcP = totalAll > 0 ? (totalTC / totalAll) * 100 : 0;
                             const cnP = totalAll > 0 ? (totalCN / totalAll) * 100 : 0;
                             
                             return (
                                <div className="flex flex-col gap-1.5">
                                   <div className="flex justify-between text-[9px] font-black uppercase">
                                      <span className="text-emerald-700">Tổ chức: {totalTC}</span>
                                      <span className="text-orange-700">Cá nhân: {totalCN}</span>
                                   </div>
                                   <div className="h-3 w-full bg-white/50 rounded-full overflow-hidden flex border border-red-200">
                                      <div style={{ width: `${tcP}%` }} className="h-full bg-emerald-600" />
                                      <div style={{ width: `${cnP}%` }} className="h-full bg-orange-600" />
                                   </div>
                                </div>
                             );
                          })()}
                       </td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Danh sách chi tiết hóa đơn quá hạn</h4>
              <div className="px-4 py-1.5 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase">
                Hiện có {badDebtRows.length} hóa đơn
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                 <thead>
                    <tr className="bg-white">
                       <th className="px-6 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Mã KH</th>
                       <th className="px-6 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Tên Khách Hàng</th>
                       <th className="px-6 py-5 text-center font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Ngày PH</th>
                       <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Tiền Nợ</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {badDebtRows.sort((a,b) => b._diffDays - a._diffDays).slice(0, 50).map((row, idx) => (
                       <tr key={idx} className="hover:bg-red-50/30 transition-all group">
                          <td className="px-6 py-5 font-bold text-slate-900">{row[maKhangCol || '']?.toString()}</td>
                          <td className="px-6 py-5 font-bold text-slate-600 uppercase italic opacity-80">{row[tenKhangCol || '']?.toString()}</td>
                          <td className="px-6 py-5 text-center font-bold text-slate-400 tabular-nums">{row[ngayPhCol]?.toString()}</td>
                          <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">{(Number(row[tongTienCol]) || 0).toLocaleString()} đ</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           {badDebtRows.length > 50 && (
             <div className="p-6 bg-slate-50 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang hiển thị 50 kết quả có số ngày nợ cao nhất</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderSegmentationView = () => {
    if (!data) return null;
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-none">CHỌN PHIÊN CẦN XEM</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Lọc dữ liệu theo Mã Sổ GCS (3 ký tự đầu)</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <span className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Chọn Loại Phiên</span>
                <div className="relative group">
                  <select 
                    value={selectedPhien}
                    onChange={(e) => setSelectedPhien(e.target.value)}
                    className="w-full h-11 pl-4 pr-10 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all appearance-none cursor-pointer"
                  >
                    <option value="20">Phiên 20</option>
                    <option value="B2">Phiên B2</option>
                    <option value="B3">Phiên B3</option>
                    <option value="KH110">KH 110 (Sổ B3AD004ZA)</option>
                    <option value="B1">Phiên B1 (Loại khác)</option>
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-brand-primary transition-colors" />
                </div>
              </div>
            </div>

            

            {/* Dashboard Chart and Table for Filtered Data */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            
            </div>

            {/* Phân tích nợ theo phiên đã chọn (Now at the top) */}
            {selectedPhien !== 'all' && groupedData.length > 0 && (
              <div className="mt-12 space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-none">Phân Tích Nợ Theo (Phiên {selectedPhien})</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Tổng hợp thống kê chi tiết theo từng nhóm kỳ</p>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-12">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead className="bg-[#0f172a]">
                        <tr>
                          <th className="px-6 py-5 text-left font-black text-white uppercase text-[10px] tracking-widest">SỐ KỲ</th>
                          <th className="px-6 py-3 text-right font-black text-white uppercase text-[10px] tracking-widest">KHÁCH HÀNG</th>
                          <th className="px-6 py-3 text-right font-black text-white uppercase text-[10px] tracking-widest">HÓA ĐƠN</th>
                          <th className="px-6 py-3 text-right font-black text-white uppercase text-[10px] tracking-widest">TIỀN NỢ</th>
                          <th className="px-6 py-3 text-center font-black text-white uppercase text-[10px] tracking-widest">DỮ LIỆU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {groupedData.map((row, idx) => {
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-all">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <span className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100">
                                    {row.term}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right font-bold text-slate-700 text-lg tabular-nums">
                                {row.customers.toLocaleString()}
                              </td>
                              <td className="px-6 py-5 text-right font-bold text-slate-500 tabular-nums">
                                {row.invoices.toLocaleString()}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <span className="font-black text-indigo-700 text-xl tabular-nums">
                                  {row.amount.toLocaleString()} đ
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <button 
                                  onClick={() => exportTermData(row.term)}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black uppercase hover:bg-[#0f172a] hover:text-white transition-all shadow-sm active:scale-95"
                                >
                                  <Download className="w-4 h-4" /> TẢI DS
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {groupedData.length > 0 && (
                          <tr className="bg-slate-900 font-black text-white">
                            <td className="px-6 py-5 rounded-bl-2xl">
                              <span className="italic uppercase text-base tracking-widest">TỔNG CỘNG</span>
                            </td>
                            <td className="px-6 py-5 text-right text-lg tabular-nums">
                              {groupedData.reduce((acc, curr) => acc + curr.customers, 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-5 text-right text-slate-300 tabular-nums">
                              {groupedData.reduce((acc, curr) => acc + curr.invoices, 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-5 text-right text-indigo-400 text-xl tabular-nums">
                              {groupedData.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} đ
                            </td>
                            <td className="px-6 py-5 rounded-br-2xl text-center">
                              <div className="flex flex-col items-center gap-2">
                                <button 
                                  onClick={exportCurrentSessionData}
                                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-indigo-700 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                                >
                                  <Download className="w-3.5 h-3.5" /> Tải DS TOÀN PHIÊN
                                </button>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none font-bold">Toàn phiên {selectedPhien}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Danh sách chi tiết (Now below) */}
            {selectedPhien !== 'all' && (
              <div className="mt-12 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                      <List className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 leading-none">Danh sách chi tiết</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Trực quan danh sách hóa đơn theo tiêu chí đã lọc</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Đang hiển thị {Math.min(baseFilteredRows.length, 100).toLocaleString()} / {baseFilteredRows.length.toLocaleString()} dòng
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden border-t-4 border-t-indigo-500">
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-xs border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 shadow-sm">
                          <th className="px-5 py-4 text-left font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Mã KH</th>
                          <th className="px-5 py-4 text-left font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Tên Khách Hàng</th>
                          <th className="px-5 py-4 text-center font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Kỳ</th>
                          <th className="px-5 py-4 text-center font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Tháng</th>
                          <th className="px-5 py-4 text-center font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Năm</th>
                          <th className="px-5 py-4 text-right font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Tổng Tiền</th>
                          <th className="px-5 py-4 text-left font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 whitespace-nowrap">Ngày PH</th>
                          <th className="px-5 py-4 text-center font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 whitespace-nowrap">Số Ngày Quá Hạn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {baseFilteredRows.slice(0, 100).map((row, i) => {
                          const find = (name: string) => {
                            const lower = name.toLowerCase().replace(/\s/g, '');
                            const col = data.headers.find(h => h.toLowerCase().replace(/\s/g, '') === lower);
                            return col ? row[col] : null;
                          };

                          return (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                               <td className="px-5 py-3.5 font-bold text-slate-900">{find('ma_khang')?.toString() || '-'}</td>
                              <td className="px-5 py-3.5 font-medium text-slate-600 max-w-[200px] truncate">{find('ten_khang')?.toString() || '-'}</td>
                              <td className="px-5 py-3.5 text-center font-bold text-slate-700 bg-slate-50/50">{find('ky')?.toString() || '-'}</td>
                              <td className="px-5 py-3.5 text-center font-bold text-slate-700">{find('thang')?.toString() || '-'}</td>
                              <td className="px-5 py-3.5 text-center font-bold text-slate-700">{find('nam')?.toString() || '-'}</td>
                              <td className="px-5 py-3.5 text-right font-black text-indigo-700 tabular-nums">
                                {Number(find('tổng tiền') || find('tong_tien') || 0).toLocaleString()}
                              </td>
                              <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                                {find('ngay_phanh')?.toString() || '-'}
                              </td>
                              <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                {(() => {
                                  const maKH = find('ma_khang')?.toString();
                                  const date = maKH ? customerOldestDateMap.get(maKH) : null;
                                  
                                  if (!date) return <span className="text-slate-300">-</span>;
                                  
                                  const today = new Date(2026, 3, 22); // 22/04/2026
                                  const diffTime = today.getTime() - date.getTime();
                                  const diffDaysReal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  const diffDays = diffDaysReal - 5;
                                  
                                  if (diffDays > 0) {
                                    return (
                                      <div className="flex flex-col items-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-100">
                                          {diffDays} ngày
                                        </span>
                                        
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        chưa tới hạn
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                        {baseFilteredRows.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                              Không có dữ liệu chi tiết phù hợp tiêu chí lọc
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  // --- Helper for Customer Oldest Date ---
  const customerOldestDateMap = useMemo(() => {
    if (!data) return new Map<string, Date>();
    const map = new Map<string, Date>();
    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'ma kh']);
    const ngayPhCol = findColumn(['ngay_phanh', 'ngày phát hành', 'ngay_hd']);
    
    if (!maKhangCol || !ngayPhCol) return map;

    data.rows.forEach(row => {
      const maKH = row[maKhangCol]?.toString();
      const date = parseDateValue(row[ngayPhCol]);
      if (maKH && date) {
        const currentOldest = map.get(maKH);
        if (!currentOldest || date < currentOldest) {
          map.set(maKH, date);
        }
      }
    });
    return map;
  }, [data, findColumn]);

  const renderDataView = () => {
    if (!data) return null;

    // Helper to find actual header keys for the requested display columns
    const getTargetHeader = (targets: string[]) => {
      for (const target of targets) {
        const normalizedTarget = target.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
        const found = data.headers.find(h => {
          const normalizedHeader = h.toLowerCase().replace(/\s/g, '').replace(/_/g, '');
          return normalizedHeader === normalizedTarget;
        });
        if (found) return found;
      }
      return null;
    };

    const requestedCols = [
      { label: 'ID HĐ', targets: ['id_hdon', 'idhdon', 'id hóa đơn', 'id_hd'] },
      { label: 'Mã KH', targets: ['ma_khang', 'makhang', 'ma_kh', 'mã khách hàng'] },
      { label: 'Mã KHTT', targets: ['ma_khtt', 'makhtt', 'mã khtt'] },
      { label: 'Tên Khách Hàng', targets: ['ten_khang', 'tenkhang', 'tên khách hàng', 'ten_kh'] },
      { label: 'Mã Khu Vực', targets: ['ma_kvuc', 'makvuc', 'mã khu vực'] },
      { label: 'STT', targets: ['stt', 'số thứ tự'] },
      { label: 'Kỳ', targets: ['ky', 'kỳ'] },
      { label: 'Tháng', targets: ['thang', 'tháng'] },
      { label: 'Năm', targets: ['nam', 'năm'] },
      { label: 'Tổng Tiền', targets: ['tong_tien', 'tongtien', 'tổng tiền', 'tiền'] },
      { label: 'ĐT Dịch Vụ', targets: ['dthoaij_dvu', 'dthoai_dvu', 'điện thoại', 'dthoai'] },
      { label: 'Số Thiết Bị', targets: ['so_tbi', 'sotbi', 'số thiết bị'] },
      { label: 'Ngày Phát Hành', targets: ['ngay_phanh', 'ngayphanh', 'ngày phát hành', 'ngay_hd'] },
      { label: 'Mã Sổ', targets: ['ma_sogcs', 'maso', 'ma_so', 'sổ gcs'] },
    ];

    const activeCols = requestedCols.map(c => ({
      label: c.label,
      key: getTargetHeader(c.targets)
    })).filter(c => c.key !== null);

    // Calculate totals for the filtered results
    const tongTienKey = getTargetHeader(['tong_tien', 'tongtien', 'tổng tiền', 'tiền']);
    const stats = {
      totalRows: rawFilteredRows.length,
      totalAmount: rawFilteredRows.reduce((acc, row) => acc + (Number(row[tongTienKey || '']) || 0), 0)
    };

    const hasFilter = rawSelectedPhien !== 'all' || appliedSearch.trim() !== '' || searchMode === 'advanced';

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shadow-lg">
              <TableIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dữ Liệu Thô</h2>
              <p className="text-sm text-slate-500">Đối soát thông tin chi tiết từng hóa đơn</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row items-center gap-3">
            {/* Local Session Selector for Raw Data */}
            <div className="w-full md:w-48">
              <select 
                value={rawSelectedPhien}
                onChange={(e) => setRawSelectedPhien(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm appearance-none cursor-pointer"
              >
                <option value="all">Tất cả Phiên</option>
                <option value="20">Phiên 20</option>
                <option value="B2">2 Phiên (B2)</option>
                <option value="B3">3 Phiên (B3)</option>
                <option value="B1">1 Phiên</option>
                <option value="KH110">KH 110</option>
              </select>
            </div>

            <div className="relative flex-1 group w-full">
              <input 
                type="text"
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchMode('basic');
                    setAppliedSearch(detailSearch);
                  }
                }}
                placeholder="Mã KH, Tên, ID HĐ, Số tiền, Mã Sổ..."
                className="w-full h-11 pl-12 pr-10 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              {detailSearch && (
                <button 
                  onClick={() => {
                    setDetailSearch('');
                    setAppliedSearch('');
                    setSearchMode('basic');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <button 
              onClick={() => {
                setSearchMode('basic');
                setAppliedSearch(detailSearch);
              }}
              className="h-11 px-6 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center"
            >
              <TrendingUp className="w-4 h-4" />
              Lấy danh sách
            </button>
          </div>
        </div>

        {/* Advanced Search Section Placeholder */}
        <div className={`p-6 rounded-[2rem] border-2 transition-all duration-300 ${searchMode === 'advanced' ? 'bg-indigo-50 border-indigo-200 shadow-md ring-4 ring-indigo-500/5' : 'bg-slate-50/50 border-dashed border-slate-200'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${searchMode === 'advanced' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-100 text-indigo-600'}`}>
                 <ShieldCheck className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tìm kiếm nâng cao (Kế toán)</h4>
                  <p className="text-[10px] font-bold text-slate-400 italic">Tìm KH nợ {'>'} 2 HĐ & có ít nhất 2 tên khác nhau</p>
               </div>
             </div>
             
             <div className="flex items-center gap-2 w-full md:w-auto">
               {searchMode === 'advanced' && (
                 <button 
                    onClick={() => {
                      setSearchMode('basic');
                      setAppliedSearch('');
                    }}
                    className="h-10 px-4 bg-white border border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-50 transition-all"
                 >
                   <X className="w-3.5 h-3.5" />
                   Hủy
                 </button>
               )}
               <button 
                 onClick={() => {
                   setSearchMode('advanced');
                   setAppliedSearch('ADVANCED_QUERY'); // Flag to trigger view
                 }}
                 className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95 ${searchMode === 'advanced' ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-indigo-100'}`}
               >
                 <Layers className="w-3.5 h-3.5" />
                 Lấy danh sách nâng cao
               </button>

               <button 
                 onClick={() => {
                   // Ensure we're exporting the CURRENTLY filtered raw data
                   const exportData = rawFilteredRows.length > 0 ? rawFilteredRows : [];
                   if (exportData.length === 0) {
                     alert("Không có dữ liệu để tải. Vui lòng lấy danh sách trước.");
                     return;
                   }
                   const worksheet = XLSX.utils.json_to_sheet(exportData);
                   const workbook = XLSX.utils.book_new();
                   XLSX.utils.book_append_sheet(workbook, worksheet, "Raw_Data_Export");
                   XLSX.writeFile(workbook, `Bao_Cao_Truy_Van_${new Date().getTime()}.xlsx`);
                 }}
                 className="h-10 px-6 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100 active:scale-95"
               >
                 <Download className="w-3.5 h-3.5" />
                 Tải DS
               </button>
             </div>
          </div>
        </div>

        {hasFilter || searchMode === 'advanced' ? (
          <div className="space-y-6">
            {/* Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Tổng Số Dòng</p>
                  <p className="text-xl font-black text-slate-900 tabular-nums">{stats.totalRows.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Tổng Số Tiền</p>
                  <p className="text-xl font-black text-slate-900 tabular-nums">{stats.totalAmount.toLocaleString()} đ</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden min-h-[400px] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className="bg-[#0f172a]">
                    <tr>
                      <th className="px-6 py-5 font-black text-white uppercase tracking-[0.2em] text-[10px] border-r border-white/10 italic">
                        STT
                      </th>
                      {activeCols.map((col, i) => (
                        <th key={i} className="px-6 py-5 font-black text-white uppercase tracking-[0.2em] text-[10px] border-r border-white/10 last:border-0 italic whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawFilteredRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-400 border-r border-slate-50 font-bold tabular-nums">
                          {i + 1}
                        </td>
                        {activeCols.map((col, j) => (
                          <td key={j} className="px-6 py-4 text-slate-600 border-r border-slate-50 last:border-0 font-medium tabular-nums whitespace-nowrap">
                            {row[col.key!]?.toString() || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rawFilteredRows.length === 0 && (
                      <tr>
                        <td colSpan={activeCols.length + 1} className="px-6 py-20 text-center text-slate-400 font-bold italic">
                          Không tìm thấy bản ghi nào khớp với điều kiện tìm kiếm
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {rawFilteredRows.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                  <p className="text-xs font-bold text-slate-400 italic uppercase">Đã tải tất cả dữ liệu theo điều kiện lọc</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center shadow-sm">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Sẵn sàng tra cứu dữ liệu</h3>
                <p className="text-slate-500 text-sm font-medium">Để tối ưu hiệu suất, vui lòng nhập từ khóa tìm kiếm hoặc chọn một phiên cụ thể để xem chi tiết danh sách hóa đơn.</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">Chọn Phiên (Thoát)</span>
                <span className="text-slate-300">hoặc</span>
                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">Tìm kiếm KH</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Base Filtering logic shared between views ---
  // --- Base Filtering logic shared between Analysis/Segmentation views ---
  const baseFilteredRows = useMemo(() => {
    if (!data) return [];

    const maSoCol = findColumn(['ma_sogcs', 'mã sổ', 'maso', 'ma_so', 'sổ gcs']);
    
    return data.rows.filter(row => {
      // 1. Session Filter (Global for Analysis)
      if (selectedPhien !== 'all') {
        const maSo = row[maSoCol || '']?.toString() || '';
        const prefix2 = maSo.substring(0, 2);

        const is20 = prefix2 === '20';
        const isB2 = prefix2 === 'B2';
        const isB3 = prefix2 === 'B3';

        if (selectedPhien === '20' && !is20) return false;
        if (selectedPhien === 'B2' && !isB2) return false;
        if (selectedPhien === 'B3' && (maSo === 'B3AD004ZA' || !isB3)) return false;
        if (selectedPhien === 'KH110' && maSo !== 'B3AD004ZA') return false;
        if (selectedPhien === 'B1' && (is20 || isB2 || isB3)) return false;
      }

      return true;
    });
  }, [data, selectedPhien, findColumn]);

  // --- Specialized Filtering logic for Raw Data Tab ---
  const rawFilteredRows = useMemo(() => {
    if (!data) return [];

    const maSoCol = findColumn(['ma_sogcs', 'mã sổ', 'maso', 'ma_so', 'sổ gcs']);
    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'ma kh', 'mã khách hàng']);
    const tenKhangCol = findColumn(['ten_khang', 'tenkhang', 'tên khách hàng', 'ten khang', 'tên kh']);
    const maKhttCol = findColumn(['ma_khtt', 'makhtt', 'mã khtt', 'ma khtt']);
    const idHdonCol = findColumn(['id_hdon', 'idhdon', 'id hóa đơn', 'id hd', 'ma_hdon']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'tien_no', 'so tien', 'tong_no']);

    if (searchMode === 'advanced') {
      // ADVANCED SEARCH LOGIC: Group by MA_KHANG, find > 2 invoices with different TEN_KHANG
      if (!maKhangCol || !tenKhangCol) return [];

      const customerGroups = new Map<string, any[]>();
      
      data.rows.forEach(row => {
        const maKH = row[maKhangCol]?.toString() || '';
        if (maKH) {
          if (!customerGroups.has(maKH)) customerGroups.set(maKH, []);
          customerGroups.get(maKH)!.push(row);
        }
      });

      const suspiciousRows: any[] = [];
      customerGroups.forEach((rows, maKH) => {
        const uniqueNames = new Set(rows.map(r => r[tenKhangCol]?.toString() || ''));
        // Criteria: > 2 invoices AND >= 2 different names
        if (rows.length > 2 && uniqueNames.size >= 2) {
          suspiciousRows.push(...rows);
        }
      });

      return suspiciousRows;
    }
    
    return data.rows.filter(row => {
      // 1. Session Filter (Local for Raw Data)
      if (rawSelectedPhien !== 'all') {
        const maSo = row[maSoCol || '']?.toString() || '';
        const prefix2 = maSo.substring(0, 2);

        const is20 = prefix2 === '20';
        const isB2 = prefix2 === 'B2';
        const isB3 = prefix2 === 'B3';

        if (rawSelectedPhien === '20' && !is20) return false;
        if (rawSelectedPhien === 'B2' && !isB2) return false;
        if (rawSelectedPhien === 'B3' && (maSo === 'B3AD004ZA' || !isB3)) return false;
        if (rawSelectedPhien === 'KH110' && maSo !== 'B3AD004ZA') return false;
        if (rawSelectedPhien === 'B1' && (is20 || isB2 || isB3)) return false;
      }

      // 2. Search Filter (Manual for Raw Data)
      if (appliedSearch.trim()) {
        const s = appliedSearch.toLowerCase().trim();
        const makh = row[maKhangCol || '']?.toString().toLowerCase() || '';
        const ten = row[tenKhangCol || '']?.toString().toLowerCase() || '';
        const khtt = row[maKhttCol || '']?.toString().toLowerCase() || '';
        const idhd = row[idHdonCol || '']?.toString().toLowerCase() || '';
        const money = row[tongTienCol || '']?.toString().toLowerCase() || '';
        const masoValue = row[maSoCol || '']?.toString().toLowerCase() || '';

        const match = makh.includes(s) || 
                      ten.includes(s) || 
                      khtt.includes(s) || 
                      idhd.includes(s) || 
                      money.includes(s) ||
                      masoValue.includes(s);
        
        if (!match) return false;
      }

      return true;
    });
  }, [data, rawSelectedPhien, appliedSearch, findColumn]);

  // --- Data Analysis for Grouped View (Phân tích Số Kỳ Nợ) ---

  const groupedData = useMemo(() => {
    if (!data || baseFilteredRows.length === 0) return [];

    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'ma kh']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'tien_no', 'so tien', 'tong_no']);
    const manhomKhCol = findColumn(['manhom_kh', 'mã nhóm', 'nhomkh', 'ma_nhom_kh', 'nhom kh']);
    const loaiKhCol = findColumn(['loại_khang', 'loaikh', 'loai_kh', 'loai', 'phan_loai', 'tc_cn', 'dt_kh', 'loai kh', 'loai khang']);

    if (!maKhangCol || !tongTienCol) return [];

    const customerStats: Record<string, { count: number; totalAmount: number; notes: Set<string>; loaiKhang: string }> = {};
    baseFilteredRows.forEach(row => {
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

    const termGroups: Record<number, { label: string; amount: number; customers: number; invoices: number; notes: string[]; term: number; toChuc: number; caNhan: number }> = {};
    Object.values(customerStats).forEach(stat => {
      const termCount = stat.count;
      if (!termGroups[termCount]) {
        termGroups[termCount] = { 
          label: `${termCount}`, 
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
      
      const loaiRaw = stat.loaiKhang?.toString().toLowerCase().trim() || '';
      // Nhận diện cực rộng: Số 1, TC, Tổ chức, Tổng công ty, Doanh nghiệp...
      const isToChuc = loaiRaw === '1' || 
                       loaiRaw.includes('tc') || 
                       loaiRaw.includes('to chuc') || 
                       loaiRaw.includes('tong cong ty') ||
                       loaiRaw.includes('doanh nghiep');
                       
      if (isToChuc) g.toChuc += 1;
      else g.caNhan += 1;

      stat.notes.forEach(n => {
        if (!g.notes.includes(n)) g.notes.push(n);
      });
    });

    return Object.values(termGroups).sort((a, b) => b.term - a.term);
  }, [data, baseFilteredRows, findColumn]);

  const fullGroupedData = useMemo(() => {
    if (!data) return [];

    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'ma kh']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'tien_no', 'tong_no']);
    const manhomKhCol = findColumn(['manhom_kh', 'mã nhóm', 'nhomkh', 'ma_nhom_kh']);
    const loaiKhCol = findColumn(['loại_khang', 'loaikh', 'loai_kh', 'loai', 'phan_loai', 'tc_cn', 'dt_kh', 'loai kh', 'tc cn']);

    if (!maKhangCol || !tongTienCol) return [];

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

    const termGroups: Record<number, { label: string; amount: number; customers: number; invoices: number; notes: string[]; term: number; toChuc: number; caNhan: number }> = {};
    Object.values(customerStats).forEach(stat => {
      const termCount = stat.count;
      if (!termGroups[termCount]) {
        termGroups[termCount] = { 
          label: `${termCount}`, 
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
      
      const loaiRaw = stat.loaiKhang?.toString().toLowerCase().trim() || '';
      const isToChuc = loaiRaw === '1' || 
                       loaiRaw.includes('tc') || 
                       loaiRaw.includes('to chuc') || 
                       loaiRaw.includes('tong cong ty') ||
                       loaiRaw.includes('doanh nghiep');
                       
      if (isToChuc) g.toChuc += 1;
      else g.caNhan += 1;
    });

    return Object.values(termGroups).sort((a, b) => b.term - a.term);
  }, [data, findColumn]);

  const badDebtMonthlyData = useMemo(() => {
    if (!data) return [];

    const ngayPhCol = findColumn(['ngay_phanh', 'ngày phát hành', 'ngay_hd']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien']);

    if (!ngayPhCol || !tongTienCol) return [];

    const now = new Date(2026, 3, 20); 
    const monthlyGroups: Record<string, { month: string; count: number; totalAmount: number; sortKey: number }> = {};

    data.rows.forEach(row => {
      const amount = Number(row[tongTienCol]) || 0;
      const date = parseDateValue(row[ngayPhCol]);
      
      if (date) {
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 177 && amount > 0) {
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
  }, [data, findColumn]);

  const badDebtTypeStats = useMemo(() => {
    if (!data) return [];

    const ngayPhCol = findColumn(['ngay_phanh', 'ngày phát hành', 'ngay_hd']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien']);
    const loaiKhCol = findColumn(['loại_khang', 'loaikh', 'loai_kh']);

    if (!ngayPhCol || !tongTienCol) return [];

    const now = new Date(2026, 3, 20); 
    let toChucAmount = 0;
    let caNhanAmount = 0;
    let toChucInvoices = 0;
    let caNhanInvoices = 0;

    data.rows.forEach(row => {
      const amount = Number(row[tongTienCol]) || 0;
      const date = parseDateValue(row[ngayPhCol]);
      const loai = loaiKhCol ? row[loaiKhCol]?.toString() : '';
      
      if (date) {
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 177 && amount > 0) {
          if (loai === '1' || loai === 'tổ chức' || loai === 'tc') {
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
      { name: 'Cá Nhân', value: caNhanAmount, invoices: caNhanInvoices, color: '#ef4444' }, 
      { name: 'Tổ Chức', value: toChucAmount, invoices: toChucInvoices, color: '#3b82f6' }  
    ].filter(i => i.invoices > 0);
  }, [data, findColumn]);

  const phienData = useMemo(() => {
    if (!data) return null;

    const maSoCol = findColumn(['ma_sogcs', 'mã sổ', 'maso', 'ma_so', 'sổ gcs']);
    const tongTienCol = findColumn(['tổng tiền', 'tong_tien', 'tongtien', 'số tiền']);
    const maKhangCol = findColumn(['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh']);

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
    const ngayPhCol = findColumn(['ngay_phanh', 'ngày phát hành', 'ngay_hd']);
    
    const now = new Date(2026, 3, 20); 
    
    data.rows.forEach(row => {
      const maSo = row[maSoCol]?.toString() || '';
      const amount = Number(row[tongTienCol]) || 0;
      const maKhang = maKhangCol ? row[maKhangCol]?.toString() : null;

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
        stats.phien1.hd += 1;
        stats.phien1.tien += amount;
      }
      
      if (amount < 0 && maKhang) {
        thoaiHoanCustomerIds.add(maKhang);
        stats.thoaiHoan.tien += amount;
      }

      if (ngayPhCol) {
        const date = parseDateValue(row[ngayPhCol]);
        if (date) {
          const diffMs = now.getTime() - date.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          if (diffDays > 177 && amount > 0) {
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
  }, [data, findColumn]);

  const renderChartsView = () => {
    if (!data || !phienData) return null;

    return (
      <div className="space-y-8 pb-12 animate-in fade-in duration-500">
        {/* Debt Term Analysis Table (Matching requested style) */}
        

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
                  onClick={async () => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa dữ liệu cũ? Mọi báo cáo sẽ bị xóa khỏi bộ nhớ trình duyệt.")) {
                      await localforage.removeItem('xcel_report_data');
                      setData(null);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
                  title="Xóa dữ liệu cũ"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Xóa dữ liệu cũ</span>
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
                {activeTab === 'segmentation' && renderSegmentationView()}
                {activeTab === 'bad_debt' && renderBadDebtView()}
                {activeTab === 'charts' && renderChartsView()}
                {activeTab === 'data' && renderDataView()}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : isLoadingPersisted ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
             <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
             <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-widest animate-pulse">Đang khôi phục dữ liệu...</h3>
             <p className="text-slate-400 text-sm mt-2 font-bold uppercase tracking-tighter">Vui lòng chờ trong giây lát</p>
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
