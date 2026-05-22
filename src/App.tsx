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
  ChevronLeft,
  TrendingUp,
  Box,
  Users,
  User,
  Building2,
  DollarSign,
  PieChart as PieChartIcon,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Search,
  Calendar
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

const COLUMN_KEYWORDS = {
  MA_KHANG: ['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'ma kh', 'mã khách hàng'],
  TEN_KHANG: ['ten_khang', 'tenkhang', 'tên khách hàng', 'ten khang', 'tên kh', 'ten_kh'],
  TONG_TIEN: ['tổng tiền', 'tong_tien', 'tongtien', 'số tiền', 'sotien', 'thành tiền', 'so_tien', 'tien_no', 'tong_no', 'thuong_ky', 'tiền thường kỳ'],
  SO_SERY: ['so_sery', 'số sery', 'sery', 'seri', 'so_seri', 'số seri'],
  MA_SOGCS: ['ma_sogcs', 'mã sổ', 'maso', 'ma_so', 'sổ gcs', 'so_gcs', 'ma_so_gcs', 'mã gcs', 'số gcs', 'mã sổ gcs', 'ma sogcs'],
  NGAY_PHANH: ['ngay_phanh', 'ngày phát hành', 'ngay_hd', 'ngay_ph', 'ngayphanh', 'ngay phanh', 'ngay ph', 'ngay hdon'],
  LOAI_KHANG: ['loại_khang', 'loaikh', 'loai_kh', 'loai', 'phan_loai', 'tc_cn', 'dt_kh', 'loai kh', 'loai khang', 'tổ chức/cá nhân', 'tc cn'],
  MANHOM_KH: ['manhom_kh', 'mã nhóm', 'nhomkh', 'ma_nhom_kh', 'nhom kh', 'mã nhóm kh', 'manhom_khang', 'ma_nhom'],
  ID_HDON: ['id_hdon', 'idhdon', 'id hóa đơn', 'id hd', 'ma_hdon'],
  THANG: ['thang', 'tháng', 'tháng_hdon', 'thang_hd', 'thang_no', 'kỳ', 'ky'],
  NAM: ['nam', 'năm', 'nam_hdon', 'nam_hd', 'nam_no'],
};

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
  const [selectedComparisonDate, setSelectedComparisonDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [segSearch, setSegSearch] = useState<string>('');
  const [segPage, setSegPage] = useState<number>(1);
  const [segPageSize, setSegPageSize] = useState<number>(50);
  const [isLoadingPersisted, setIsLoadingPersisted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset segmentation page and search when session changes
  React.useEffect(() => {
    setSegPage(1);
    setSegSearch('');
  }, [selectedPhien]);

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
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let yStr = parts[2];
      let y = parseInt(yStr, 10);
      
      // Specifically handle dd/mm/yy as requested: dd/mm/20yy
      if (yStr.length === 2) {
        y = parseInt('20' + yStr, 10);
      } else if (y < 100) {
        y += 2000;
      }
      
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

  const getRowBillingMonthYear = useCallback((row: any, thangCol: string | null, namCol: string | null, ngayPhCol: string | null) => {
    let m = '';
    let y = '';
    
    if (thangCol && row[thangCol] !== undefined) {
      m = String(row[thangCol]).trim();
    }
    if (namCol && row[namCol] !== undefined) {
      y = String(row[namCol]).trim();
    }
    
    if (m && y) {
      let yearNum = parseInt(y, 10);
      if (!isNaN(yearNum) && yearNum < 100) {
        yearNum = 2000 + yearNum;
      }
      return { month: parseInt(m, 10), year: yearNum, label: `${m}/${yearNum}` };
    }
    
    if (ngayPhCol && row[ngayPhCol]) {
      const d = parseDateValue(row[ngayPhCol]);
      if (d) {
        return { month: d.getMonth() + 1, year: d.getFullYear(), label: `${d.getMonth() + 1}/${d.getFullYear()}` };
      }
    }
    
    return { month: 1, year: 2026, label: 'Chưa rõ' };
  }, [parseDateValue]);

  const classifyCustomerType = useCallback((row: any, loaiKhangCol: string | null, tenKhangCol: string | null) => {
    const isToChuc = (val: any) => {
      if (val === undefined || val === null) return false;
      const s = String(val).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return s === '1' || s === '1.0' || s.includes('to chuc') || s.includes('tc') || s.includes('doanh nghiep') || s.includes('dn');
    };

    const isCaNhan = (val: any) => {
      if (val === undefined || val === null) return false;
      const s = String(val).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return s === '0' || s === '0.0' || s.includes('ca nhan') || s.includes('cn') || s.includes('tu nhan') || s.includes('ho gia dinh') || s.includes('hgd');
    };

    if (loaiKhangCol && row[loaiKhangCol] !== undefined) {
      const val = String(row[loaiKhangCol]).trim();
      if (isToChuc(val)) return 'Tổ chức';
      if (isCaNhan(val)) return 'Cá nhân';
      return val;
    }
    
    if (tenKhangCol && row[tenKhangCol] !== undefined) {
      const name = String(row[tenKhangCol]).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const orgStart = ['cong ty', 'ubnd', 'truong', 'phong', 'ban', 'chi nhanh', 'xi nghiep', 'doanh nghiep', 'trung tam', 'co quan', 'so y te', 'benh vien', 'uy ban'];
      if (orgStart.some(prefix => name.startsWith(prefix))) {
        return 'Tổ chức';
      }
    }
    
    return 'Cá nhân';
  }, []);

  const phienData = useMemo(() => {
    if (!data) return null;

    const maSoCol = findColumn(COLUMN_KEYWORDS.MA_SOGCS);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const soSeryCol = findColumn(COLUMN_KEYWORDS.SO_SERY);
    const ngayPhCol = findColumn(COLUMN_KEYWORDS.NGAY_PHANH);
    
    if (maSoCol === null || tongTienCol === null || maKhangCol === null) return null;

    const stats: any = {
      phien20: { tien: 0, customers: new Map<string, { serySet: Set<string>, emptyCount: number }>() },
      phien1: { tien: 0, customers: new Map<string, { serySet: Set<string>, emptyCount: number }>() },
      phien2: { tien: 0, customers: new Map<string, { serySet: Set<string>, emptyCount: number }>() },
      phien3: { tien: 0, customers: new Map<string, { serySet: Set<string>, emptyCount: number }>() },
      kh110: { tien: 0, customers: new Map<string, { serySet: Set<string>, emptyCount: number }>() },
      thoaiHoan: { tien: 0, customers: new Map<string, { serySet: Set<string>, emptyCount: number }>() },
      noKhoDoi: { hd: 0, tien: 0 }
    };

    const badDebtCustomerMap = new Map<string, { serySet: Set<string>, emptyCount: number }>();
    let badDebtTotalAmount = 0;

    const baseDate = new Date(selectedComparisonDate);
    baseDate.setHours(0, 0, 0, 0); 
    
    data.rows.forEach(row => {
      const maSo = row[maSoCol]?.toString() || '';
      const amount = Number(row[tongTienCol]) || 0;
      const maKhang = row[maKhangCol]?.toString() || '';
      const sery = soSeryCol ? row[soSeryCol]?.toString().trim() : '';

      const prefix2 = maSo.substring(0, 2);
      let group: any = null;
      if (prefix2 === '20') {
        group = stats.phien20;
      } else if (prefix2 === 'B2') {
        group = stats.phien2;
      } else if (maSo === 'B3AD004ZA') {
        group = stats.kh110;
      } else if (prefix2 === 'B3') {
        group = stats.phien3;
      } else {
        group = stats.phien1;
      }

      if (group && maKhang) {
        group.tien += amount;
        if (!group.customers.has(maKhang)) {
          group.customers.set(maKhang, { serySet: new Set(), emptyCount: 0 });
        }
        const c = group.customers.get(maKhang);
        if (sery) c.serySet.add(sery);
        else c.emptyCount += 1;
      }

      if (amount < 0 && maKhang) {
        if (!stats.thoaiHoan.customers.has(maKhang)) {
          stats.thoaiHoan.customers.set(maKhang, { serySet: new Set(), emptyCount: 0 });
        }
        const c = stats.thoaiHoan.customers.get(maKhang);
        if (sery) c.serySet.add(sery);
        else c.emptyCount += 1;
        stats.thoaiHoan.tien += amount;
      }

      if (ngayPhCol && maKhang) {
        const date = parseDateValue(row[ngayPhCol]);
        if (date) {
          const diffMs = baseDate.getTime() - date.getTime();
          const diffDaysTotal = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffDays = diffDaysTotal - 5;
          
          if (diffDays > 177 && amount > 0) {
            badDebtTotalAmount += amount;
            if (!badDebtCustomerMap.has(maKhang)) {
              badDebtCustomerMap.set(maKhang, { serySet: new Set(), emptyCount: 0 });
            }
            const c = badDebtCustomerMap.get(maKhang);
            if (sery) c.serySet.add(sery);
            else c.emptyCount += 1;
          }
        }
      }
    });

    const reduceHD = (group: any) => {
      let total = 0;
      group.customers.forEach((c: any) => {
        total += (c.serySet.size + c.emptyCount || 1);
      });
      return total;
    };

    const phien20HD = reduceHD(stats.phien20);
    const phien1HD = reduceHD(stats.phien1);
    const phien2HD = reduceHD(stats.phien2);
    const phien3HD = reduceHD(stats.phien3);
    const kh110HD = reduceHD(stats.kh110);
    const thoaiHoanHD = reduceHD(stats.thoaiHoan);

    return {
      phien20: { hd: phien20HD, tien: stats.phien20.tien },
      phien1: { hd: phien1HD, tien: stats.phien1.tien },
      phien2: { hd: phien2HD, tien: stats.phien2.tien },
      phien3: { hd: phien3HD + kh110HD, tien: stats.phien3.tien + stats.kh110.tien },
      tong: { 
        hd: phien20HD + phien1HD + phien2HD + phien3HD + kh110HD, 
        tien: stats.phien20.tien + stats.phien1.tien + stats.phien2.tien + stats.phien3.tien + stats.kh110.tien 
      },
      thoaiHoan: { customers: stats.thoaiHoan.customers.size, hd: thoaiHoanHD, tien: stats.thoaiHoan.tien },
      noKhoDoi: { 
        hd: Array.from(badDebtCustomerMap.values()).reduce((acc, c) => acc + (c.serySet.size + c.emptyCount || 1), 0), 
        customers: badDebtCustomerMap.size,
        tien: badDebtTotalAmount 
      }
    };
  }, [data, findColumn, selectedComparisonDate]);

  // --- Data Analysis for Overview ---

  const metrics = useMemo(() => {
    if (!data) return null;
    
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    const soSeryCol = findColumn(COLUMN_KEYWORDS.SO_SERY);

    const result: { label: string; value: string; trend?: number; icon: any }[] = [];

    let totalInvoices = 0;
    if (phienData) {
      totalInvoices = phienData.tong.hd;
    } else if (soSeryCol) {
      const serySet = new Set<string>();
      let emptySeryCount = 0;
      data.rows.forEach(r => {
        const sery = r[soSeryCol]?.toString().trim();
        if (sery) serySet.add(sery);
        else emptySeryCount += 1;
      });
      totalInvoices = serySet.size + emptySeryCount;
    } else {
      totalInvoices = data.rows.length;
    }

    result.push({
      label: 'Tổng số hóa đơn',
      value: totalInvoices.toLocaleString(),
      icon: TableIcon
    });

    if (maKhangCol) {
      const uniqueCustomers = new Set(data.rows.map(r => r[maKhangCol]?.toString()).filter(Boolean));
      result.push({
        label: 'Tổng khách hàng',
        value: uniqueCustomers.size.toLocaleString(),
        icon: Users
      });
    }

    if (tongTienCol) {
      const sum = data.rows.reduce((acc, row) => acc + (Number(row[tongTienCol]) || 0), 0);
      result.push({
        label: 'Tổng Số Tiền',
        value: sum.toLocaleString(),
        icon: DollarSign
      });
    }
    
    return result;
  }, [data, findColumn, phienData]);

  const customerTypeStats = useMemo(() => {
    if (!data) return null;
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    const loaiKhangCol = findColumn(COLUMN_KEYWORDS.LOAI_KHANG);
    const tenKhangCol = findColumn(COLUMN_KEYWORDS.TEN_KHANG);
    const soSeryCol = findColumn(COLUMN_KEYWORDS.SO_SERY);

    let tcInvoices = 0;
    let cnInvoices = 0;
    let tcAmount = 0;
    let cnAmount = 0;
    const tcCustomersSet = new Set<string>();
    const cnCustomersSet = new Set<string>();

    const serySet = new Set<string>();

    data.rows.forEach(r => {
      const maKhang = String(r[maKhangCol] || '').trim();
      const sery = soSeryCol ? String(r[soSeryCol] || '').trim() : '';
      const amt = Number(r[tongTienCol]) || 0;
      const type = classifyCustomerType(r, loaiKhangCol, tenKhangCol);

      if (maKhang) {
        if (type === 'Tổ chức') {
          tcCustomersSet.add(maKhang);
        } else {
          cnCustomersSet.add(maKhang);
        }
      }

      let isUnique = true;
      if (soSeryCol && sery) {
        if (serySet.has(sery)) {
          isUnique = false;
        } else {
          serySet.add(sery);
        }
      }

      if (isUnique) {
        if (type === 'Tổ chức') {
          tcInvoices += 1;
          tcAmount += amt;
        } else {
          cnInvoices += 1;
          cnAmount += amt;
        }
      }
    });

    const totalInvoices = tcInvoices + cnInvoices;
    const totalAmount = tcAmount + cnAmount;

    return {
      tcInvoices,
      cnInvoices,
      tcAmount,
      cnAmount,
      tcCustomersCount: tcCustomersSet.size,
      cnCustomersCount: cnCustomersSet.size,
      totalInvoices,
      totalAmount,
    };
  }, [data, findColumn, classifyCustomerType]);

  const generalDebtAnalysis = useMemo(() => {
    if (!data) return null;
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    const loaiKhangCol = findColumn(COLUMN_KEYWORDS.LOAI_KHANG);
    const tenKhangCol = findColumn(COLUMN_KEYWORDS.TEN_KHANG);
    
    if (!maKhangCol || !tongTienCol) return null;

    // Group rows by customer (MA_KHANG)
    const customerGroups = new Map<string, {
      id: string;
      invoiceCount: number;
      totalAmount: number;
      customerType: string;
    }>();

    data.rows.forEach(row => {
      const makh = String(row[maKhangCol] || '').trim();
      if (!makh) return;
      
      const amt = Number(row[tongTienCol]) || 0;
      
      if (!customerGroups.has(makh)) {
        const customerType = classifyCustomerType(row, loaiKhangCol, tenKhangCol);
        customerGroups.set(makh, {
          id: makh,
          invoiceCount: 0,
          totalAmount: 0,
          customerType,
        });
      }
      
      const group = customerGroups.get(makh)!;
      group.invoiceCount += 1;
      group.totalAmount += amt;
    });

    const customers = Array.from(customerGroups.values());

    let organizationCount = 0;
    let organizationAmount = 0;
    let individualCount = 0;
    let individualAmount = 0;

    customers.forEach(c => {
      if (c.customerType === 'Tổ chức') {
        organizationCount += 1;
        organizationAmount += c.totalAmount;
      } else {
        individualCount += 1;
        individualAmount += c.totalAmount;
      }
    });

    const totalCustomers = organizationCount + individualCount;
    const totalAmountSum = organizationAmount + individualAmount;

    // Group customers by their number of invoices (Kỳ nợ)
    const termGroups: Record<number, {
      term: number;
      customerCount: number;
      totalInvoices: number;
      totalAmount: number;
      tcCount: number;
      cnCount: number;
      tcAmount: number;
      cnAmount: number;
    }> = {};

    customers.forEach(c => {
      const term = c.invoiceCount;
      if (!termGroups[term]) {
        termGroups[term] = {
          term,
          customerCount: 0,
          totalInvoices: 0,
          totalAmount: 0,
          tcCount: 0,
          cnCount: 0,
          tcAmount: 0,
          cnAmount: 0,
        };
      }
      
      const tGroup = termGroups[term];
      tGroup.customerCount += 1;
      tGroup.totalInvoices += c.invoiceCount;
      tGroup.totalAmount += c.totalAmount;
      if (c.customerType === 'Tổ chức') {
        tGroup.tcCount += 1;
        tGroup.tcAmount += c.totalAmount;
      } else {
        tGroup.cnCount += 1;
        tGroup.cnAmount += c.totalAmount;
      }
    });

    const sortedTerms = Object.values(termGroups).sort((a, b) => a.term - b.term);

    const pieChartData = [
      { name: 'Tổ chức', value: organizationCount, amount: organizationAmount },
      { name: 'Cá nhân', value: individualCount, amount: individualAmount },
    ];

    return {
      sortedTerms,
      pieChartData,
      organizationCount,
      organizationAmount,
      individualCount,
      individualAmount,
      totalCustomers,
      totalAmountSum,
    };
  }, [data, findColumn, classifyCustomerType]);

  // --- Rendering Functions ---
  const renderSidebar = () => (
    <div className="w-64 border-r border-slate-200 bg-white h-screen flex flex-col pt-8 sticky top-0">
      <div className="px-6 mb-8 flex items-center gap-2">
        <div className="bg-[#004e98] p-2 rounded-lg">
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
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const sogcsCol = findColumn(COLUMN_KEYWORDS.MA_SOGCS);
    if (!maKhangCol) return;

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
      if (selectedPhien === 'KH110') return sogcs === 'B3AD004ZA';
      return true;
    });

    const customerCounts: Record<string, number> = {};
    sessionRows.forEach(row => {
      const id = row[maKhangCol]?.toString();
      if (id) customerCounts[id] = (customerCounts[id] || 0) + 1;
    });

    const targetIds = new Set(Object.keys(customerCounts).filter(id => customerCounts[id] === term));
    const finalRows = sessionRows.filter(row => targetIds.has(row[maKhangCol]?.toString()));
    
    const ws = XLSX.utils.json_to_sheet(finalRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Chi_tiet_${term}_ky`);
    saveAsExcel(wb, `KH_No_${term}_ky_${selectedPhien}.xlsx`);
  };

  const exportThoaiHoanData = () => {
    if (!data) return;
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    if (!tongTienCol) return;
    const rows = data.rows.filter(r => (Number(r[tongTienCol]) || 0) < 0);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Thoai_Hoan');
    saveAsExcel(wb, 'DS_Thoai_Hoan.xlsx');
  };

  const exportNoKhoDoiData = () => {
    if (!badDebtData || !badDebtData.uniqueInvoices) return;
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG) || '';
    const tenKhangCol = findColumn(COLUMN_KEYWORDS.TEN_KHANG) || '';
    const ngayPhCol = findColumn(COLUMN_KEYWORDS.NGAY_PHANH) || '';
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN) || '';

    const exportRows = badDebtData.uniqueInvoices.map(inv => {
      return {
        'Số sery': inv._sery || 'N/A',
        'Mã khách hàng': inv[maKhangCol] || '',
        'Tên khách hàng': inv[tenKhangCol] || '',
        'Phân loại khách hàng': inv._customerType,
        'Tháng hóa đơn': inv._billingLabel,
        'Ngày phát hành': inv[ngayPhCol] || '',
        'Số ngày nợ': inv._diffDays,
        'Tiền nợ (đ)': inv[tongTienCol] || 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'No_Kho_Doi_Duy_Nhat');
    saveAsExcel(wb, `DS_No_Kho_Doi_Duy_Nhat_${selectedComparisonDate}.xlsx`);
  };

  const renderEmptyState = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div 
        className={cn(
          "max-w-xl w-full bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center transition-all",
          isDragging ? "border-[#004e98] bg-blue-50/50 scale-[1.02]" : "hover:border-slate-300"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Upload className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight italic uppercase">Tải lên File Công Nợ</h2>
        <p className="text-slate-500 mb-10 font-medium px-8 leading-relaxed">
          Kéo thả file Excel (.xlsx, .xls) vào đây hoặc nhấn nút bên dưới để bắt đầu phân tích công nợ theo phiên.
        </p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".xlsx, .xls"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-12 py-5 bg-[#004e98] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#003d7a] hover:-translate-y-1 transition-all active:scale-95"
        >
          Chọn tệp tin
        </button>
        <div className="mt-12 flex items-center justify-center gap-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
           <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Hỗ trợ XLSX/XLS</span>
           <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Bảo mật dữ liệu</span>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => {
    if (!data || !metrics) return null;
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{data.fileName}</h2>
              <p className="text-slate-500 mt-1">Tìm thấy {data.rows.length.toLocaleString()} bản ghi công nợ</p>
            </div>
            <div className="h-10 w-px bg-slate-200 mx-2 hidden lg:block" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1.5 px-1">
                <ShieldCheck className="w-3 h-3" />
                Tiêu chuẩn ngày
              </label>
              <input 
                type="date"
                value={selectedComparisonDate}
                onChange={(e) => setSelectedComparisonDate(e.target.value)}
                className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all shadow-sm"
              />
            </div>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-800 transition-all flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Thay đổi File
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 pb-6 mb-6 border-b border-slate-100">
            {metrics.map((m, i) => (
              <div key={i} className={`flex items-center gap-5 ${i === 0 ? 'pb-6 md:pb-0 md:pr-8' : i === 1 ? 'py-6 md:py-0 md:px-8' : 'pt-6 md:pt-0 md:pl-8'}`}>
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600">
                  <m.icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">{m.label}</span>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {customerTypeStats && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-slate-700 rounded-full" />
                  <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
                    Phân Tích Theo Đối Tượng Khách Hàng (Tổ chức vs Cá nhân)
                  </h4>
                </div>
                
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  Phân loại: 1 = Tổ chức | 0/Khác = Cá nhân
                </div>
              </div>

              {(() => {
                const totalAmt = customerTypeStats.tcAmount + customerTypeStats.cnAmount || 1;
                const tcAmtPct = (customerTypeStats.tcAmount / totalAmt) * 100;
                const cnAmtPct = (customerTypeStats.cnAmount / totalAmt) * 100;

                const totalInvs = customerTypeStats.tcInvoices + customerTypeStats.cnInvoices || 1;
                const tcInvPct = (customerTypeStats.tcInvoices / totalInvs) * 100;
                const cnInvPct = (customerTypeStats.cnInvoices / totalInvs) * 100;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ratio by amount */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>Tỉ lệ theo tổng số tiền</span>
                        <span className="text-indigo-950 font-black tabular-nums">{(customerTypeStats.tcAmount + customerTypeStats.cnAmount).toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        {customerTypeStats.tcAmount > 0 && (
                          <div style={{ width: `${tcAmtPct}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`Tổ chức: ${tcAmtPct.toFixed(1)}%`} />
                        )}
                        {customerTypeStats.cnAmount > 0 && (
                          <div style={{ width: `${cnAmtPct}%` }} className="bg-red-500 h-full transition-all duration-500" title={`Cá nhân: ${cnAmtPct.toFixed(1)}%`} />
                        )}
                      </div>
                      <div className="flex justify-between text-xs font-bold leading-none">
                        <span className="text-blue-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Tổ chức: {tcAmtPct.toFixed(1)}% ({customerTypeStats.tcAmount.toLocaleString()})
                        </span>
                        <span className="text-red-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Cá nhân: {cnAmtPct.toFixed(1)}% ({customerTypeStats.cnAmount.toLocaleString()})
                        </span>
                      </div>
                    </div>

                    {/* Ratio by invoices */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>Tỉ lệ theo tổng số hóa đơn</span>
                        <span className="text-indigo-950 font-black tabular-nums">{(customerTypeStats.tcInvoices + customerTypeStats.cnInvoices).toLocaleString()} HĐ</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        {customerTypeStats.tcInvoices > 0 && (
                          <div style={{ width: `${tcInvPct}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`Tổ chức: ${tcInvPct.toFixed(1)}%`} />
                        )}
                        {customerTypeStats.cnInvoices > 0 && (
                          <div style={{ width: `${cnInvPct}%` }} className="bg-red-500 h-full transition-all duration-500" title={`Cá nhân: ${cnInvPct.toFixed(1)}%`} />
                        )}
                      </div>
                      <div className="flex justify-between text-xs font-bold leading-none">
                        <span className="text-blue-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Tổ chức: {tcInvPct.toFixed(1)}% ({customerTypeStats.tcInvoices.toLocaleString()} HĐ)
                        </span>
                        <span className="text-red-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Cá nhân: {cnInvPct.toFixed(1)}% ({customerTypeStats.cnInvoices.toLocaleString()} HĐ)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {generalDebtAnalysis && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-500">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase italic">Phân Tích Chi Tiết Kỳ Nợ Theo Khách Hàng</h4>
                  <p className="text-xs text-slate-500 font-medium">Nhóm khách hàng có cùng số hóa đơn (kỳ nợ) và phân loại đối tượng</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">STT</th>
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Kỳ nợ (Số hóa đơn/KH)</th>
                      <th className="px-6 py-4 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Số khách hàng</th>
                      <th className="px-6 py-4 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Tổng hóa đơn</th>
                      <th className="px-6 py-4 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100">Tổng tiền nợ</th>
                      <th className="px-6 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100 min-w-[320px]">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {generalDebtAnalysis.sortedTerms.map((t, idx) => {
                      const tcPct = t.customerCount > 0 ? (t.tcCount / t.customerCount) * 100 : 0;
                      const cnPct = t.customerCount > 0 ? (t.cnCount / t.customerCount) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-indigo-50/15 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-6 py-4 text-slate-900 font-bold">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black">
                              {t.term} Kỳ Nợ
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold tabular-nums">{t.customerCount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-bold tabular-nums text-slate-600">{t.totalInvoices.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black tabular-nums text-[#004e98]">{t.totalAmount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 bg-slate-50/60 p-2 rounded-2xl border border-slate-100 max-w-[340px] mx-auto">
                              {/* Round circular donut representing percentages */}
                              <div 
                                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center relative shadow-sm border border-slate-200"
                                style={{
                                  background: `conic-gradient(#3B82F6 0% ${tcPct}%, #EF4444 ${tcPct}% 100%)`
                                }}
                              >
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[8px] font-black text-slate-500">
                                  {t.term}K
                                </div>
                              </div>
                              
                              <div className="flex-1 space-y-1 text-left">
                                <div className="flex items-center justify-between text-[11px] font-bold leading-none gap-2">
                                  <span className="text-blue-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    TC: {t.tcCount} KH ({tcPct.toFixed(1)}%)
                                  </span>
                                  <span className="font-extrabold text-[#004e98] tabular-nums">{t.tcAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold leading-none gap-2">
                                  <span className="text-red-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    CN: {t.cnCount} KH ({cnPct.toFixed(1)}%)
                                  </span>
                                  <span className="font-extrabold text-[#004e98] tabular-nums">{t.cnAmount.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {phienData && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><TableIcon className="w-6 h-6 text-[#004e98]" />Bảng Nợ Phiên</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold">Phiên 20</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold">Phiên B1</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold">Phiên B2</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold">Phiên B3</th>
                    <th colSpan={2} className="border border-slate-200 px-4 py-2 text-center font-bold bg-slate-100 italic text-[#004e98]">Tổng cộng</th>
                  </tr>
                  <tr className="bg-slate-50/50 text-[10px] uppercase text-slate-400">
                    <th className="border border-slate-200 p-2">HD</th><th className="border border-slate-200 p-2">Tiền</th>
                    <th className="border border-slate-200 p-2">HD</th><th className="border border-slate-200 p-2">Tiền</th>
                    <th className="border border-slate-200 p-2">HD</th><th className="border border-slate-200 p-2">Tiền</th>
                    <th className="border border-slate-200 p-2">HD</th><th className="border border-slate-200 p-2">Tiền</th>
                    <th className="border border-slate-200 p-2 bg-slate-100">HD</th><th className="border border-slate-200 p-2 bg-slate-100">Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-center font-bold text-slate-700">
                    <td className="border p-3">{phienData.phien20.hd.toLocaleString()}</td><td className="border p-3">{phienData.phien20.tien.toLocaleString()}</td>
                    <td className="border p-3">{phienData.phien1.hd.toLocaleString()}</td><td className="border p-3">{phienData.phien1.tien.toLocaleString()}</td>
                    <td className="border p-3">{phienData.phien2.hd.toLocaleString()}</td><td className="border p-3">{phienData.phien2.tien.toLocaleString()}</td>
                    <td className="border p-3">{phienData.phien3.hd.toLocaleString()}</td><td className="border p-3">{phienData.phien3.tien.toLocaleString()}</td>
                    <td className="border p-3 bg-slate-100 text-[#004e98]">{phienData.tong.hd.toLocaleString()}</td><td className="border p-3 bg-slate-100 text-[#004e98]">{phienData.tong.tien.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Session Debt Pie Chart Analysis */}
            {(() => {
              const totalSessionTien = (
                (phienData.phien20.tien > 0 ? phienData.phien20.tien : 0) +
                (phienData.phien1.tien > 0 ? phienData.phien1.tien : 0) +
                (phienData.phien2.tien > 0 ? phienData.phien2.tien : 0) +
                (phienData.phien3.tien > 0 ? phienData.phien3.tien : 0)
              ) || 1;

              const pieData = [
                { name: 'Phiên 20', value: Math.max(0, phienData.phien20.tien), actualValue: phienData.phien20.tien, hd: phienData.phien20.hd, color: '#3B82F6' },
                { name: 'Phiên B1', value: Math.max(0, phienData.phien1.tien), actualValue: phienData.phien1.tien, hd: phienData.phien1.hd, color: '#10B981' },
                { name: 'Phiên B2', value: Math.max(0, phienData.phien2.tien), actualValue: phienData.phien2.tien, hd: phienData.phien2.hd, color: '#F59E0B' },
                { name: 'Phiên B3', value: Math.max(0, phienData.phien3.tien), actualValue: phienData.phien3.tien, hd: phienData.phien3.hd, color: '#8B5CF6' },
              ];

              return (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="p-1.5 bg-slate-100 rounded-lg"><PieChartIcon className="w-4 h-4 text-slate-800" /></span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Tỷ Lệ Phân Bổ Nợ Theo Phiên
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-slate-50/40 p-6 rounded-[2rem] border border-slate-100/70">
                    {/* Pie Chart and inside count */}
                    <div className="lg:col-span-1 h-52 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name: any, props: any) => {
                              const actual = props.payload.actualValue;
                              const pct = ((actual / totalSessionTien) * 100).toFixed(1);
                              return [
                                `${actual.toLocaleString()}`,
                                `${name} (${pct}%)`
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-slate-800">
                          {phienData.tong.tien.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-0.5">
                          Tổng nợ
                        </span>
                      </div>
                    </div>

                    {/* legend list & stats breakdown */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pieData.map((p, idx) => {
                        const pct = ((p.actualValue / totalSessionTien) * 100).toFixed(1);
                        return (
                          <div 
                            key={idx} 
                            className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3.5 h-3.5 rounded-full block shadow-sm border border-white"
                                style={{ backgroundColor: p.color }}
                              />
                              <div>
                                <h5 className="text-sm font-black text-slate-800 leading-none mb-1">{p.name}</h5>
                                <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider">
                                  {p.hd.toLocaleString()} Hóa đơn
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900 leading-none mb-1">
                                {p.actualValue.toLocaleString()}
                              </p>
                              <span 
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block"
                                style={{ 
                                  backgroundColor: p.color + '15',
                                  color: p.color 
                                }}
                              >
                                {pct}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 flex items-center justify-between group transition-all hover:shadow-md hover:bg-red-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-red-400 tracking-widest italic">Khoản thoái hoàn</p>
                  <p className="text-xl font-black text-red-600 leading-none">
                    <span className="text-[11px] font-bold opacity-60">Số HĐ: {phienData.thoaiHoan.hd.toLocaleString()} (KH: {phienData.thoaiHoan.customers.toLocaleString()}) = </span>
                    {phienData.thoaiHoan.tien.toLocaleString()} đ
                  </p>
                </div>
                <button onClick={exportThoaiHoanData} className="px-6 py-3 bg-white text-red-600 rounded-2xl text-[11px] font-black uppercase border-2 border-red-100 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95">
                  Tải DS
                </button>
              </div>

              <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex items-center justify-between group transition-all hover:shadow-md hover:bg-orange-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-orange-400 tracking-widest italic">Nợ khó đòi ({'>'}177 ngày)</p>
                  <p className="text-xl font-black text-orange-600 leading-none">
                    <span className="text-[11px] font-bold opacity-60">Số HĐ: {phienData.noKhoDoi.hd.toLocaleString()} (KH: {phienData.noKhoDoi.customers.toLocaleString()}) = </span>
                    {phienData.noKhoDoi.tien.toLocaleString()} đ
                  </p>
                </div>
                <button onClick={() => setActiveTab('bad_debt')} className="px-6 py-3 bg-white text-orange-600 rounded-2xl text-[11px] font-black uppercase border-2 border-orange-100 shadow-sm hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all active:scale-95">
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const selectedPhienRows = useMemo(() => {
    if (!data) return [];
    const sogcsCol = findColumn(COLUMN_KEYWORDS.MA_SOGCS);
    if (!sogcsCol) return [];

    return data.rows.filter(row => {
      const sogcs = row[sogcsCol]?.toString() || '';
      if (selectedPhien === '20') return sogcs.startsWith('20');
      if (selectedPhien === 'B2') return sogcs.startsWith('B2');
      if (selectedPhien === 'B3') return sogcs.startsWith('B3');
      if (selectedPhien === 'KH110') return sogcs === 'B3AD004ZA';
      if (selectedPhien === 'B1') return !sogcs.startsWith('20') && !sogcs.startsWith('B2') && !sogcs.startsWith('B3');
      return true;
    });
  }, [data, findColumn, selectedPhien]);

  const sessionSummary = useMemo(() => {
    if (!data || !selectedPhienRows.length) return null;
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    if (!maKhangCol || !tongTienCol) return null;

    const makhCount: Record<string, number> = {};
    let totalTien = 0;
    selectedPhienRows.forEach(r => {
      const makh = r[maKhangCol]?.toString() || '';
      if (makh) makhCount[makh] = (makhCount[makh] || 0) + 1;
      totalTien += Number(r[tongTienCol]) || 0;
    });

    const terms: any[] = [];
    for (let i = 1; i <= 24; i++) {
      const ids = Object.keys(makhCount).filter(k => makhCount[k] === i);
      if (ids.length > 0) {
        let termTien = 0;
        const hdTotal = ids.length * i;
        selectedPhienRows.forEach(r => {
          if (ids.includes(r[maKhangCol]?.toString())) termTien += Number(r[tongTienCol]) || 0;
        });
        terms.push({ term: i, count: ids.length, invoices: hdTotal, amount: termTien });
      }
    }

    return { totalTien, totalKH: Object.keys(makhCount).length, totalHD: selectedPhienRows.length, terms };
  }, [data, findColumn, selectedPhienRows]);

  const renderSegmentationView = () => {
    if (!data || !sessionSummary) return null;
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-6">
            <select value={selectedPhien} onChange={(e) => setSelectedPhien(e.target.value)} className="h-14 px-6 bg-slate-900 text-white rounded-2xl text-lg font-black outline-none cursor-pointer hover:bg-slate-800 transition">
              <option value="20">PHIÊN 20</option>
              <option value="B1">PHIÊN B1</option>
              <option value="B2">PHIÊN B2</option>
              <option value="B3">PHIÊN B3</option>
              <option value="KH110">KH 110</option>
            </select>
            <div className="h-12 w-px bg-slate-100 mx-2" />
            <div>
              <h3 className="text-2xl font-black text-slate-900 italic uppercase">Phân Tích Phiên {selectedPhien}</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest px-1">Tiêu chuẩn ngày</label>
                  <input type="date" value={selectedComparisonDate} onChange={(e) => setSelectedComparisonDate(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(data.rows.filter(r => {
              const sogcs = r[findColumn(COLUMN_KEYWORDS.MA_SOGCS) || '']?.toString() || '';
              if (selectedPhien === '20') return sogcs.startsWith('20');
              if (selectedPhien === 'B1') return !sogcs.startsWith('20') && !sogcs.startsWith('B2') && !sogcs.startsWith('B3');
              return sogcs.startsWith(selectedPhien);
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Phien_${selectedPhien}`);
            saveAsExcel(wb, `DS_Phien_${selectedPhien}.xlsx`);
          }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2">
            <Download className="w-4 h-4" /> Tải DS Phiên
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-linear-to-b from-white to-slate-50/25">
          <div className="pb-4 md:pb-0 md:pr-6 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tổng khách hàng nợ</p>
            <p className="text-3xl font-black text-slate-900">{sessionSummary.totalKH.toLocaleString()} <span className="text-slate-400 text-sm font-bold uppercase">KH</span></p>
          </div>
          <div className="py-4 md:py-0 md:px-6 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tổng số hóa đơn nợ</p>
            <p className="text-3xl font-black text-slate-900">{sessionSummary.totalHD.toLocaleString()} <span className="text-slate-400 text-sm font-bold uppercase">HĐ</span></p>
          </div>
          <div className="pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Tổng số tiền nợ</p>
            <p className="text-3xl font-black text-indigo-600">{sessionSummary.totalTien.toLocaleString()} <span className="text-indigo-400 text-sm font-extrabold">đ</span></p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-8 py-5 text-left text-white uppercase text-[10px] font-black tracking-widest italic border-r border-white/10">Số kỳ nợ</th>
                <th className="px-6 py-5 text-right text-white uppercase text-[10px] font-black tracking-widest italic border-r border-white/10">Số KH</th>
                <th className="px-6 py-5 text-right text-white uppercase text-[10px] font-black tracking-widest italic border-r border-white/10">Số HĐ</th>
                <th className="px-6 py-5 text-right text-white uppercase text-[10px] font-black tracking-widest italic border-r border-white/10">Tổng Tiền Nợ</th>
                <th className="px-6 py-5 text-right text-white uppercase text-[10px] font-black tracking-widest italic">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 italic">
              {sessionSummary.terms.map((t, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-900 border-r border-slate-50"><span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs mr-3 inline-flex italic"> Kỳ {t.term}</span></td>
                  <td className="px-6 py-5 text-right font-bold text-slate-600 border-r border-slate-50">{t.count.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right font-bold text-slate-600 border-r border-slate-50">{t.invoices.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right font-black text-indigo-700 border-r border-slate-50">{t.amount.toLocaleString()} đ</td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => exportTermData(t.term)} className="p-2 text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-indigo-100 shadow-sm transition"><Download className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lưới toàn bộ danh sách chi tiết */}
        {(() => {
          const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
          const tenKhangCol = findColumn(COLUMN_KEYWORDS.TEN_KHANG);
          const thangCol = findColumn(COLUMN_KEYWORDS.THANG);
          const namCol = findColumn(COLUMN_KEYWORDS.NAM);
          const ngayPhCol = findColumn(COLUMN_KEYWORDS.NGAY_PHANH);
          const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
          const soSeryCol = findColumn(COLUMN_KEYWORDS.SO_SERY);
          const idHdonCol = findColumn(COLUMN_KEYWORDS.ID_HDON);

          const sttCol = data.headers.find(h => {
            const norm = h.toLowerCase().trim();
            return norm === 'stt' || norm === 'số tt' || norm === 'sott' || norm === 'stt_hd';
          }) || '';

          // Filter search query
          const filteredSegRows = selectedPhienRows.filter(r => {
            if (!segSearch.trim()) return true;
            const query = segSearch.trim().toLowerCase();
            const maKhang = maKhangCol ? String(r[maKhangCol] || '').toLowerCase() : '';
            const tenKhang = tenKhangCol ? String(r[tenKhangCol] || '').toLowerCase() : '';
            const codeSTT = sttCol 
              ? String(r[sttCol] || '').toLowerCase() 
              : (soSeryCol 
                  ? String(r[soSeryCol] || '').toLowerCase() 
                  : (idHdonCol ? String(r[idHdonCol] || '').toLowerCase() : ''));
            return maKhang.includes(query) || tenKhang.includes(query) || codeSTT.includes(query);
          });

          const totalItems = filteredSegRows.length;
          const totalTienSum = filteredSegRows.reduce((acc, r) => {
            const amt = tongTienCol ? (Number(r[tongTienCol]) || 0) : 0;
            return acc + amt;
          }, 0);

          const totalPages = Math.max(1, Math.ceil(totalItems / segPageSize));
          const safePage = Math.min(segPage, totalPages);
          const displayRows = filteredSegRows.slice((safePage - 1) * segPageSize, safePage * segPageSize);

          const targetBaseDate = new Date(selectedComparisonDate);
          targetBaseDate.setHours(0, 0, 0, 0);

          return (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <List className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-950 uppercase italic">Danh Sách Hóa Đơn Chi Tiết - Phiên {selectedPhien}</h4>
                    <p className="text-xs text-slate-500 font-bold whitespace-nowrap">
                      Hiện có <span className="text-indigo-600 font-extrabold">{totalItems.toLocaleString()}</span> hóa đơn 
                      <span className="mx-2 text-slate-300">|</span> 
                      Tổng tiền: <span className="text-indigo-950 font-black">{totalTienSum.toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Search bar */}
                  <div className="relative flex-1 sm:flex-initial min-w-[240px]">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã KH, tên KH, sery..."
                      value={segSearch}
                      onChange={(e) => {
                        setSegSearch(e.target.value);
                        setSegPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition"
                    />
                    {segSearch && (
                      <button 
                        onClick={() => { setSegSearch(''); setSegPage(1); }}
                        className="absolute right-2.5 top-2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 text-sm font-black"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Page size adjustment */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">Hiển thị:</span>
                    <select
                      value={segPageSize}
                      onChange={(e) => {
                        setSegPageSize(Number(e.target.value));
                        setSegPage(1);
                      }}
                      className="bg-slate-50 border border-slate-100 px-2 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer hover:bg-slate-100"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={500}>500</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid Table element */}
              <div className="overflow-x-auto rounded-3xl border border-slate-100">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100 w-16">STT</th>
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100">Mã KH</th>
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100">Tên Khách Hàng</th>
                      <th className="px-6 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100 w-20">Tháng</th>
                      <th className="px-6 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100 w-20">Năm</th>
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100 w-32">STT</th>
                      <th className="px-6 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100 w-32">Ngày Phát Hành</th>
                      <th className="px-6 py-4 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-r border-slate-100 w-40">Tổng Tiền</th>
                      <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100 w-48">Ngày quá hạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {displayRows.length > 0 ? (
                      displayRows.map((row, idx) => {
                        const globalIdx = (safePage - 1) * segPageSize + idx + 1;
                        const maKhang = maKhangCol ? String(row[maKhangCol] || '') : '';
                        const tenKhang = tenKhangCol ? String(row[tenKhangCol] || '') : '';
                        const thangVal = thangCol ? String(row[thangCol] || '') : '';
                        const namVal = namCol ? String(row[namCol] || '') : '';
                        const amt = tongTienCol ? (Number(row[tongTienCol]) || 0) : 0;

                        const codeSTT = sttCol 
                          ? String(row[sttCol] || '').trim() 
                          : (soSeryCol 
                              ? String(row[soSeryCol] || '').trim() 
                              : (idHdonCol ? String(row[idHdonCol] || '').trim() : ''));

                        const phDate = ngayPhCol ? parseDateValue(row[ngayPhCol]) : null;
                        const phDateFormatted = phDate 
                          ? `${phDate.getDate().toString().padStart(2, '0')}/${(phDate.getMonth() + 1).toString().padStart(2, '0')}/${phDate.getFullYear()}`
                          : (ngayPhCol && row[ngayPhCol] ? String(row[ngayPhCol]) : 'N/A');

                        let overdueHtml = null;

                        if (phDate) {
                          const diffTime = targetBaseDate.getTime() - phDate.getTime();
                          const dDays = Math.floor(diffTime / (1000 * 3600 * 24)) - 5;
                          if (dDays > 0) {
                            overdueHtml = (
                              <span className="text-red-500 font-extrabold whitespace-nowrap bg-red-50 px-2 py-0.5 rounded-md border border-red-100/50">
                                Quá hạn {dDays} ngày
                              </span>
                            );
                          } else {
                            overdueHtml = (
                              <span className="text-slate-500 group-hover:text-slate-700 font-semibold">
                                Chưa đến hạn
                              </span>
                            );
                          }
                        } else {
                          overdueHtml = <span className="text-slate-300 italic text-xs">N/A</span>;
                        }

                        return (
                          <tr key={idx} className="hover:bg-indigo-50/15 group transition-colors">
                            <td className="px-6 py-3.5 text-slate-400 font-semibold border-r border-slate-50/50">{globalIdx}</td>
                            <td className="px-6 py-3.5 font-bold text-slate-900 border-r border-slate-50/50">{maKhang}</td>
                            <td className="px-6 py-3.5 text-slate-800 font-bold border-r border-slate-50/50">{tenKhang}</td>
                            <td className="px-6 py-3.5 text-center text-slate-600 border-r border-slate-50/50">{thangVal}</td>
                            <td className="px-6 py-3.5 text-center text-slate-600 border-r border-slate-50/50">{namVal}</td>
                            <td className="px-6 py-3.5 text-slate-600 font-mono border-r border-slate-50/50 text-xs">{codeSTT}</td>
                            <td className="px-6 py-3.5 text-center text-slate-600 border-r border-slate-50/50 text-xs">{phDateFormatted}</td>
                            <td className="px-6 py-3.5 text-right font-black text-indigo-950 tabular-nums border-r border-slate-50/50">{amt.toLocaleString()}</td>
                            <td className="px-6 py-3.5">{overdueHtml}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">Không tìm thấy dữ liệu hóa đơn trùng khớp.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination elements */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                    Hiển thị dòng <span className="text-slate-800 font-extrabold">{((safePage - 1) * segPageSize + 1).toLocaleString()}</span> – <span className="text-slate-800 font-extrabold">{Math.min(safePage * segPageSize, totalItems).toLocaleString()}</span> trên tổng số <span className="text-slate-800 font-extrabold">{totalItems.toLocaleString()}</span> dòng
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSegPage(Math.max(1, safePage - 1))}
                      disabled={safePage === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:hover:bg-white disabled:pointer-events-none transition shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500">Trang</span>
                      <select
                        value={safePage}
                        onChange={(e) => setSegPage(Number(e.target.value))}
                        className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs font-extrabold outline-none cursor-pointer hover:bg-slate-50 shadow-sm"
                      >
                        {Array.from({ length: totalPages }).map((_, pIdx) => (
                          <option key={pIdx} value={pIdx + 1}>{pIdx + 1}</option>
                        ))}
                      </select>
                      <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
                    </div>

                    <button
                      onClick={() => setSegPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage === totalPages}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:hover:bg-white disabled:pointer-events-none transition shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const badDebtData = useMemo(() => {
    if (!data) return null;
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const tenKhangCol = findColumn(COLUMN_KEYWORDS.TEN_KHANG);
    const ngayPhCol = findColumn(COLUMN_KEYWORDS.NGAY_PHANH);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);
    const soSeryCol = findColumn(COLUMN_KEYWORDS.SO_SERY);
    const loaiKhangCol = findColumn(COLUMN_KEYWORDS.LOAI_KHANG);
    
    const thangCol = findColumn(COLUMN_KEYWORDS.THANG);
    const namCol = findColumn(COLUMN_KEYWORDS.NAM);

    if (!ngayPhCol || !tongTienCol) return null;

    const baseDate = new Date(selectedComparisonDate);
    baseDate.setHours(0, 0, 0, 0);

    const rawBadDebtRows = data.rows.map(r => {
      const phDate = parseDateValue(r[ngayPhCol]);
      if (!phDate) return null;
      const diffDays = Math.floor((baseDate.getTime() - phDate.getTime()) / (1000 * 3600 * 24)) - 5;
      const amt = Number(r[tongTienCol]) || 0;
      if (diffDays > 177 && amt > 0) {
        const billing = getRowBillingMonthYear(r, thangCol, namCol, ngayPhCol);
        const customerType = classifyCustomerType(r, loaiKhangCol, tenKhangCol);
        return { 
          ...r, 
          _diffDays: diffDays, 
          _phDate: phDate,
          _billingMonth: billing.month,
          _billingYear: billing.year,
          _billingLabel: billing.label,
          _customerType: customerType
        };
      }
      return null;
    }).filter(Boolean) as any[];

    const seryGroups = new Map<string, any[]>();
    const noSeryInvoices: any[] = [];

    rawBadDebtRows.forEach(r => {
      const sery = soSeryCol ? String(r[soSeryCol] || '').trim() : '';
      if (sery) {
        if (!seryGroups.has(sery)) {
          seryGroups.set(sery, []);
        }
        seryGroups.get(sery)!.push(r);
      } else {
        noSeryInvoices.push(r);
      }
    });

    const uniqueInvoices: any[] = [];

    seryGroups.forEach((groupRows, sery) => {
      const firstRow = groupRows[0];
      const totalAmt = groupRows.reduce((sum, row) => sum + (Number(row[tongTienCol]) || 0), 0);
      const maxDiffDays = groupRows.reduce((max, row) => Math.max(max, row._diffDays), 0);
      
      uniqueInvoices.push({
        ...firstRow,
        _isGrouped: true,
        _groupedCount: groupRows.length,
        _sery: sery,
        _originalAmount: firstRow[tongTienCol],
        [tongTienCol]: totalAmt,
        _diffDays: maxDiffDays
      });
    });

    noSeryInvoices.forEach(r => {
      uniqueInvoices.push({
        ...r,
        _isGrouped: false,
        _sery: '',
        _groupedCount: 1,
      });
    });

    uniqueInvoices.sort((a, b) => b._diffDays - a._diffDays);

    let totalAmount = 0;
    uniqueInvoices.forEach(inv => {
      totalAmount += Number(inv[tongTienCol]) || 0;
    });

    const monthMap: Record<string, {
      monthLabel: string,
      monthNum: number,
      yearNum: number,
      invoiceCount: number,
      totalAmount: number,
      tcCount: number,
      tcAmount: number,
      cnCount: number,
      cnAmount: number
    }> = {};

    let totalTcAmount = 0;
    let totalTcCount = 0;
    let totalCnAmount = 0;
    let totalCnCount = 0;

    uniqueInvoices.forEach(inv => {
      const key = inv._billingLabel;
      if (!monthMap[key]) {
        monthMap[key] = {
          monthLabel: key,
          monthNum: inv._billingMonth,
          yearNum: inv._billingYear,
          invoiceCount: 0,
          totalAmount: 0,
          tcCount: 0,
          tcAmount: 0,
          cnCount: 0,
          cnAmount: 0
        };
      }
      
      const mData = monthMap[key];
      mData.invoiceCount += 1;
      const amt = Number(inv[tongTienCol]) || 0;
      mData.totalAmount += amt;
      
      if (inv._customerType === 'Tổ chức') {
        mData.tcCount += 1;
        mData.tcAmount += amt;
        totalTcCount += 1;
        totalTcAmount += amt;
      } else {
        mData.cnCount += 1;
        mData.cnAmount += amt;
        totalCnCount += 1;
        totalCnAmount += amt;
      }
    });

    const rawMonthSummary = Object.values(monthMap).sort((a, b) => {
      if (a.yearNum !== b.yearNum) return a.yearNum - b.yearNum;
      return a.monthNum - b.monthNum;
    });

    const monthSummary = rawMonthSummary.map(m => {
      const percentageOfTotal = totalAmount > 0 ? (m.totalAmount / totalAmount) * 100 : 0;
      return {
        ...m,
        percentageOfTotal
      };
    });

    const totalTcPercentage = totalAmount > 0 ? (totalTcAmount / totalAmount) * 100 : 0;
    const totalCnPercentage = totalAmount > 0 ? (totalCnAmount / totalAmount) * 100 : 0;

    return { 
      rows: rawBadDebtRows, 
      uniqueInvoices, 
      totalAmount, 
      totalHD: uniqueInvoices.length, 
      monthSummary,
      totalTcAmount,
      totalTcCount,
      totalCnAmount,
      totalCnCount,
      totalTcPercentage,
      totalCnPercentage
    };
  }, [data, findColumn, selectedComparisonDate, getRowBillingMonthYear, classifyCustomerType]);

  const renderBadDebtView = () => {
    if (!data || !badDebtData) return null;
    const maKhangCol = findColumn(COLUMN_KEYWORDS.MA_KHANG);
    const tenKhangCol = findColumn(COLUMN_KEYWORDS.TEN_KHANG);
    const ngayPhCol = findColumn(COLUMN_KEYWORDS.NGAY_PHANH);
    const tongTienCol = findColumn(COLUMN_KEYWORDS.TONG_TIEN);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg"><AlertCircle className="w-7 h-7 text-white" /></div>
            <div>
              <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">Phân Tích Nợ Khó Đòi</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-red-500 tracking-widest px-1">Tiêu chuẩn ngày</label>
                  <input type="date" value={selectedComparisonDate} onChange={(e) => setSelectedComparisonDate(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={exportNoKhoDoiData} className="px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2"><Download className="w-4 h-4" /> Tải DS Khó Đòi</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-red-50 lg:col-span-2 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Tổng tiền nợ khó đòi</p>
              <p className="text-4xl font-black text-red-600">{badDebtData.totalAmount.toLocaleString()} đ</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500 italic"><TableIcon className="w-4 h-4" /> Bao gồm {badDebtData.totalHD.toLocaleString()} hóa đơn duy nhất (Khử trùng lắp theo sery)</div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tổ chức (TC)</span>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{badDebtData.totalTcPercentage.toFixed(1)}%</span>
                  </div>
                  <p className="text-xl font-black text-emerald-800">{badDebtData.totalTcAmount.toLocaleString()} đ</p>
                </div>
                <p className="text-xs font-bold text-emerald-600/80 mt-2">Tổng hóa đơn: {badDebtData.totalTcCount.toLocaleString()}</p>
              </div>
              
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Cá nhân (CN)</span>
                    <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">{badDebtData.totalCnPercentage.toFixed(1)}%</span>
                  </div>
                  <p className="text-xl font-black text-rose-800">{badDebtData.totalCnAmount.toLocaleString()} đ</p>
                </div>
                <p className="text-xs font-bold text-rose-600/80 mt-2">Tổng hóa đơn: {badDebtData.totalCnCount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Khách hàng bị ảnh hưởng</p>
              <p className="text-4xl font-black text-slate-900">{new Set(badDebtData.uniqueInvoices.map(r => r[maKhangCol || ''])).size.toLocaleString()} KH</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 italic"><Users className="w-4 h-4" /> Mã khách hàng duy nhất</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><TableIcon className="w-5 h-5"/></div>
                <h4 className="text-sm font-black text-slate-900 uppercase italic">Tổng hợp nợ theo tháng phát hành (Kỳ Hóa Đơn)</h4>
             </div>
             <div className="flex items-center gap-4 text-xs font-bold">
               <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tổ chức (TC)</span>
               <span className="flex items-center gap-1.5 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cá nhân (CN)</span>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
               <thead>
                  <tr className="bg-slate-50/50">
                     <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-white">Tháng/Năm</th>
                     <th className="px-6 py-4 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-white">Số hóa đơn</th>
                     <th className="px-6 py-4 text-right font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-white">Tổng tiền</th>
                     <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-white w-1/3">Tỷ lệ % (Biểu đồ ngang)</th>
                     <th className="px-6 py-4 text-left font-black text-slate-500 uppercase text-[10px] tracking-widest border-b border-white">Ghi chú (TC/CN)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                {badDebtData.monthSummary.map((d, i) => {
                  const tcPct = d.totalAmount > 0 ? (d.tcAmount / d.totalAmount) * 100 : 0;
                  const cnPct = d.totalAmount > 0 ? (d.cnAmount / d.totalAmount) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-red-50/10 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-900">Tháng {d.monthLabel}</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-700">{d.invoiceCount.toLocaleString()}</td>
                      <td className="px-6 py-5 text-right font-black text-red-600">{d.totalAmount.toLocaleString()}đ</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
                            {d.tcAmount > 0 && (
                              <div 
                                style={{ width: `${tcPct}%` }} 
                                className="bg-emerald-500 h-full transition-all" 
                                title={`Tổ chức: ${d.tcAmount.toLocaleString()}đ (${tcPct.toFixed(1)}%)`}
                              />
                            )}
                            {d.cnAmount > 0 && (
                              <div 
                                style={{ width: `${cnPct}%` }} 
                                className="bg-rose-500 h-full transition-all" 
                                title={`Cá nhân: ${d.cnAmount.toLocaleString()}đ (${cnPct.toFixed(1)}%)`}
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 italic">Tỷ lệ: TC {tcPct.toFixed(1)}% | CN {cnPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 text-[11px]">
                          {d.tcCount > 0 && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                              TC: {d.tcCount} HĐ ({d.tcAmount.toLocaleString()} đ)
                            </span>
                          )}
                          {d.cnCount > 0 && (
                            <span className="text-rose-700 font-bold flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                              CN: {d.cnCount} HĐ ({d.cnAmount.toLocaleString()} đ)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
               </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50"><h4 className="text-sm font-black uppercase text-slate-900 tracking-widest italic">Chi tiết hóa đơn quá hạn (Danh sách khử trùng theo sery)</h4></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left font-black uppercase text-[10px] text-slate-400">Mã KH</th>
                  <th className="px-6 py-4 text-left font-black uppercase text-[10px] text-slate-400">Tên Khách Hàng</th>
                  <th className="px-6 py-4 text-center font-black uppercase text-[10px] text-slate-400">Loại KH</th>
                  <th className="px-6 py-4 text-left font-black uppercase text-[10px] text-slate-400">Số sery</th>
                  <th className="px-6 py-4 text-center font-black uppercase text-[10px] text-slate-400">Kỳ hóa đơn</th>
                  <th className="px-6 py-4 text-center font-black uppercase text-[10px] text-slate-400">Ngày PH</th>
                  <th className="px-6 py-4 text-center font-black uppercase text-[10px] text-slate-400">Số Ngày Nợ</th>
                  <th className="px-6 py-4 text-right font-black uppercase text-[10px] text-slate-400">Tiền Nợ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 italic">
                {badDebtData.uniqueInvoices.slice(0, 100).map((r: any, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold">{r[maKhangCol || '']?.toString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-600 opacity-70 uppercase">{r[tenKhangCol || '']?.toString()}</td>
                    <td className="px-6 py-4 text-center">
                      {r._customerType === 'Tổ chức' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase">Tổ chức</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-[10px] font-black uppercase">Cá nhân</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{r._sery || 'N/A'}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-500">Tháng {r._billingLabel}</td>
                    <td className="px-6 py-4 text-center text-slate-400 tabular-nums">{r[ngayPhCol || '']?.toString()}</td>
                    <td className="px-6 py-4 text-center"><span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black">{r._diffDays} ngày</span></td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{(Number(r[tongTienCol]) || 0).toLocaleString()} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDataView = () => {
    if (!data) return null;

    const maSoCol = findColumn(COLUMN_KEYWORDS.MA_SOGCS);
    
    const filteredRows = data.rows.filter(row => {
      const sogcs = row[maSoCol || '']?.toString() || '';
      if (rawSelectedPhien === 'all') return true;
      if (rawSelectedPhien === '20') return sogcs.startsWith('20');
      if (rawSelectedPhien === 'B1') return !sogcs.startsWith('20') && !sogcs.startsWith('B2') && !sogcs.startsWith('B3');
      return sogcs.startsWith(rawSelectedPhien);
    });

    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">Dữ Liệu Gốc</h3>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select value={rawSelectedPhien} onChange={(e) => setRawSelectedPhien(e.target.value)} className="bg-transparent text-xs font-bold outline-none border-none p-0 focus:ring-0 uppercase">
                <option value="all">Tất cả phiên</option>
                <option value="20">Phiên 20</option>
                <option value="B1">Phiên B1</option>
                <option value="B2">Phiên B2</option>
                <option value="B3">Phiên B3</option>
                <option value="KH110">KH 110</option>
              </select>
            </div>
          </div>
          <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-lg uppercase text-slate-500 tracking-wider">Hiển thị {filteredRows.length.toLocaleString()} dòng</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr>
                {data.headers.map((h, i) => <th key={i} className="px-4 py-3 font-black text-slate-500 uppercase border-b border-slate-200">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.slice(0, 200).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {data.headers.map((h, j) => <td key={j} className="px-4 py-2 text-slate-600 border-r border-slate-50/50">{row[h]?.toString()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length > 200 && (
            <div className="p-4 bg-slate-50 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Đang tải bản xem trước 200 dòng đầu tiên...</div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'segmentation': return renderSegmentationView();
      case 'bad_debt': return renderBadDebtView();
      case 'data': return renderDataView();
      default: return <div className="p-12 text-center text-slate-400 italic">Tính năng đang phát triển...</div>;
    }
  };

  if (isLoadingPersisted) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 italic">Đang tải dữ liệu...</div>;
  }

  if (!data) return renderEmptyState();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-brand-primary/10 selection:text-brand-primary">
      {renderSidebar()}
      <main className="flex-1 p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
        <header className="mb-8 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-50 rounded-xl"><Calendar className="w-5 h-5 text-indigo-600" /></span>
              <span className="text-xl font-bold tracking-tighter uppercase italic">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
           </div>
           <div className="flex gap-2">
             <button onClick={() => { localforage.clear(); setData(null); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition" title="Xóa dữ liệu"><X className="w-5 h-5" /></button>
           </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
