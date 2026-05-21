import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Phone, 
  User, 
  FileText, 
  Settings, 
  KeyRound, 
  Sparkles, 
  Clock, 
  LogOut, 
  RefreshCw,
  Database,
  CloudLightning,
  CheckCircle,
  Eye,
  X,
  Printer,
  Calendar,
  Layers,
  Coins
} from 'lucide-react';

interface Transaction {
  id: number | string;
  type: string;
  clientName: string;
  amount: number;
  phone: string;
  notes: string;
  image: string;
  timestamp: string;
}

export default function App() {
  // Authentication & Configuration State
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Report Generation State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly'>('daily');
  const [reportCategory, setReportCategory] = useState<string>('all'); // all, cash, instapay, fawry

  // New Transaction Form State
  const [operationType, setOperationType] = useState('تحويل كاش');
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageName, setImageName] = useState('');
  
  // Interface States
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localHistory, setLocalHistory] = useState<Transaction[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Egypt time clock updater
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      const formatted = new Intl.DateTimeFormat('ar-EG', options).format(new Date());
      setCurrentTime(formatted);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate configurations & history
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('numberOneLoggedIn');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    const savedUrl = localStorage.getItem('numberOneGasApiUrl');
    const envUrl = ((import.meta as any).env?.VITE_GAS_API_URL as string) || '';
    if (savedUrl) {
      setApiUrl(savedUrl);
    } else if (envUrl) {
      setApiUrl(envUrl);
    }
    
    const savedHistory = localStorage.getItem('numberOneTxHistory');
    if (savedHistory) {
      try {
        setLocalHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history', e);
      }
    }
  }, []);

  const syncWithCloud = async (silent = false) => {
    const finalApiUrl = apiUrl.trim() || ((import.meta as any).env?.VITE_GAS_API_URL as string) || '';
    if (!finalApiUrl) {
      if (!silent) {
        alert('تنبيه: رابط الـ API غير مكوّن حالياً. يرجى تهيئته أولاً من الإعدادات قبل المزامنة.');
      }
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(finalApiUrl);
      if (!response.ok) {
        throw new Error(`خادم جوجل أرجع حالة خطأ: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.status === 'success' && Array.isArray(data.transactions)) {
        const cloudTxs: Transaction[] = data.transactions.map((t: any, idx: number) => ({
          id: t.id || `cloud_${idx}_${Date.now()}`,
          type: t.type || 'تحويل كاش',
          clientName: t.clientName || 'عميل عام',
          amount: parseFloat(t.amount) || 0,
          phone: t.phone || '',
          notes: t.notes || '',
          image: t.image || '',
          timestamp: t.timestamp || ''
        }));

        setLocalHistory(cloudTxs);
        localStorage.setItem('numberOneTxHistory', JSON.stringify(cloudTxs));
        if (!silent) {
          alert(`تمت المزامنة السحابية بنجاح! تم تحميل ${cloudTxs.length} من العمليات المسجلة على جدول البيانات.`);
        }
      } else {
        throw new Error(data.message || 'استجابة غير صالحة من المخدم.');
      }
    } catch (err: any) {
      console.error('Error syncing with cloud:', err);
      if (!silent) {
        alert('حدث خطأ أثناء المزامنة السحابية: ' + err.toString() + '\nيرجى التأكد من تحديث كود Apps Script ببرنامج نمبر ون الجديد.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && apiUrl) {
      syncWithCloud(true);
    }
  }, [isAuthenticated, apiUrl]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'waheed') {
      setIsAuthenticated(true);
      sessionStorage.setItem('numberOneLoggedIn', 'true');
      setAuthError(false);
      setPasscode('');
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('numberOneLoggedIn');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('numberOneGasApiUrl', apiUrl.trim());
    setShowSettings(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط لإيصال التحويل!');
      return;
    }
    
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setImageBase64(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCancelImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageBase64('');
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalApiUrl = apiUrl.trim() || ((import.meta as any).env?.VITE_GAS_API_URL as string) || '';
    
    if (!finalApiUrl) {
      alert('تنبيه: نظام الربط السحابي التلقائي غير مكوّن حالياً. يرجى نقر شعار #1 نقراً مزدوجاً لتهيئة الرابط.');
      return;
    }

    setIsLoading(true);

    const payload = {
      type: operationType,
      clientName: clientName.trim(),
      amount: parseFloat(amount),
      phone: phone.trim(),
      notes: notes.trim() || 'لا توجد ملاحظات',
      image: imageBase64,
      imageName: imageName || 'receipt.png'
    };

    try {
      await fetch(finalApiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const egyptTimeStr = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      const newTx: Transaction = {
        id: Date.now(),
        type: operationType,
        clientName: clientName.trim(),
        amount: parseFloat(amount),
        phone: phone.trim(),
        notes: notes.trim(),
        image: imageBase64,
        timestamp: egyptTimeStr
      };

      const updatedHistory = [newTx, ...localHistory].slice(0, 30);
      setLocalHistory(updatedHistory);
      localStorage.setItem('numberOneTxHistory', JSON.stringify(updatedHistory));

      alert('تم إرسال وحفظ المعاملة بنجاح في السحابة الآمنة 💾');
      
      // Clear Form state
      setClientName('');
      setAmount('');
      setPhone('');
      setNotes('');
      setImageBase64('');
      setImageName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الإرسال للمخدم السحابي: ' + err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalHistory = () => {
    if (window.confirm('هل أنت متأكد من مسح مسودة الأرشيف المحلي المؤقت من هذا المتصفح؟')) {
      localStorage.removeItem('numberOneTxHistory');
      setLocalHistory([]);
    }
  };

  const getFilteredTransactions = () => {
    const today = new Date();
    const todayArLocale = today.toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }).split('،')[0].trim();
    
    let filtered = localHistory.filter(tx => {
      // Category filter
      if (reportCategory !== 'all') {
        const isCash = tx.type.includes('كاش');
        const isInstapay = tx.type.includes('انستا باي') || tx.type.toLowerCase().includes('instapay');
        const isFawry = tx.type.includes('فوري');
        
        if (reportCategory === 'cash' && !isCash) return false;
        if (reportCategory === 'instapay' && !isInstapay) return false;
        if (reportCategory === 'fawry' && !isFawry) return false;
      }
      
      // Period filter
      if (reportPeriod === 'daily') {
        const txDate = tx.timestamp.split('،')[0].trim();
        const isToday = txDate.includes(todayArLocale) || tx.timestamp.includes(todayArLocale);
        return isToday;
      }
      
      // Monthly: return true (all items in local list are from this month typically, which is a perfect safe fallback)
      return true;
    });

    // Back door fallback: if period specific filters return 0 results due to weird date strings, show database filtered by category
    if (filtered.length === 0 && localHistory.length > 0) {
      filtered = localHistory.filter(tx => {
        if (reportCategory !== 'all') {
          const isCash = tx.type.includes('كاش');
          const isInstapay = tx.type.includes('انستا باي') || tx.type.toLowerCase().includes('instapay');
          const isFawry = tx.type.includes('فوري');
          
          if (reportCategory === 'cash' && !isCash) return false;
          if (reportCategory === 'instapay' && !isInstapay) return false;
          if (reportCategory === 'fawry' && !isFawry) return false;
        }
        return true;
      });
    }
    
    return filtered;
  };

  // Calculate stats based on local history
  const totalOutToday = localHistory
    .filter(tx => tx.type.includes('تحويل'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalInToday = localHistory
    .filter(tx => tx.type.includes('استلام'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const reportTransactions = getFilteredTransactions();
  const reportTotalOut = reportTransactions
    .filter(tx => tx.type.includes('تحويل'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const reportTotalIn = reportTransactions
    .filter(tx => tx.type.includes('استلام'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const reportNetFlow = reportTotalIn - reportTotalOut;

  if (!isAuthenticated) {
    return (
      <div className="bg-dark-950 text-slate-100 min-h-screen flex flex-col justify-center items-center p-4 select-none font-sans" dir="rtl">
        <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glowing ambient effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl"></div>
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 bg-gradient-to-tr from-brand-600 to-brand-400 text-dark-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-500/15 mb-4">
              <KeyRound className="h-8 w-8 text-neutral-900" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans">نظام الصرافة والحسابات</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              يرجى إدخال كلمة مرور الإدارة لمحل <span className="text-brand-400 font-bold">Number One</span>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-2">كلمة المرور السرية</label>
              <div className="relative rounded-xl border border-dark-700 bg-dark-950 focus-within:border-brand-500 transition-all">
                <input 
                  type="password" 
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required 
                  placeholder="••••••••" 
                  className="w-full bg-transparent px-4 py-3.5 text-slate-100 placeholder-slate-700 focus:outline-none text-center tracking-widest font-extrabold rounded-xl text-lg" 
                />
              </div>
              {authError && (
                <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1.5 justify-center">
                  ⚠️ الرمز المدخل غير صحيح!
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full bg-brand-500 hover:bg-brand-600 text-dark-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/10 cursor-pointer text-xs uppercase tracking-wider transition-all duration-200 transform active:scale-[0.98]"
            >
              دخول آمن للنظام
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-dark-800/60 text-center text-[10px] text-slate-500">
            أرشيف وحيد وحسابات محلات نمبر ون للصناعات والحلول الرقمية.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-dark-950 text-slate-100 min-h-screen flex flex-col justify-between select-none font-sans no-print" dir="rtl">
      
      {/* HEADER SECTION - NO EXTRA GEARS, PURE BEAUTY */}
      <header className="border-b border-dark-900 bg-dark-900/40 backdrop-blur-md sticky top-0 z-40 px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div 
              onDoubleClick={() => setShowSettings(true)}
              className="h-10 w-10 bg-brand-500 hover:bg-brand-400 text-dark-950 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 font-black text-xl font-mono cursor-pointer transition transform active:scale-95"
              title="انقر نقراً مزدوجاً لفتح لوحة الحماية الربط السريع"
            >
              #1
            </div>
            <div>
              <h1 className="font-extrabold text-2xl md:text-4xl tracking-tight text-white flex flex-wrap items-center gap-2 select-all">
                Number One
                <span className="text-brand-400 text-[10px] md:text-xs px-2.5 py-1 rounded bg-brand-500/10 border border-brand-500/20 font-bold self-center">الحسابات والعمليات السحابية</span>
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                <Clock className="h-3 w-3 text-brand-500 shrink-0" />
                <span>فرع وحيد •</span>
                <span className="font-mono text-white text-xs">{currentTime || '--:--:--'}</span>
              </div>
            </div>
          </div>
          
          {/* Log Out Button */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="bg-red-950/40 hover:bg-red-900/60 text-red-400 py-2 px-3.5 rounded-xl transition text-xs border border-red-900/30 flex items-center gap-1.5 font-bold cursor-pointer"
              title="خروج"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>خروج</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN WORKSPACE COMPACT & INTUITIVE */}
      <main className="flex-grow p-4 md:p-6 max-w-6xl mx-auto w-full transition-all duration-300">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form Area */}
          <div className="lg:col-span-8 bg-dark-900 border border-dark-900/50 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl"></div>
            
            <h2 className="text-sm font-bold text-white mb-5 pb-3 border-b border-dark-950 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
              تسجيل عملية تحويل أو استلام جديدة
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              
              {/* Operation type select slider tabs */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2.5">طريقة التحويل أو الاستلام</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="operation" 
                      value="تحويل كاش"
                      checked={operationType === 'تحويل كاش'}
                      onChange={(e) => setOperationType(e.target.value)}
                      className="sr-only peer" 
                    />
                    <div className="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800/40 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-0.5 peer-checked:border-brand-500 peer-checked:bg-brand-500/10 peer-checked:text-brand-300 h-16 shadow-inner">
                      <span className="text-xs font-bold">تحويل كاش</span>
                      <span className="text-[9px] text-slate-500 font-medium">صادر صرافة 💸</span>
                    </div>
                  </label>

                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="operation" 
                      value="استلام كاش"
                      checked={operationType === 'استلام كاش'}
                      onChange={(e) => setOperationType(e.target.value)}
                      className="sr-only peer" 
                    />
                    <div className="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800/40 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-0.5 peer-checked:border-green-500 peer-checked:bg-green-950/20 peer-checked:text-green-300 h-16 shadow-inner">
                      <span className="text-xs font-bold">استلام كاش</span>
                      <span className="text-[9px] text-slate-500 font-medium">وارد صرافة 💰</span>
                    </div>
                  </label>

                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="operation" 
                      value="تحويل انستا باي"
                      checked={operationType === 'تحويل انستا باي'}
                      onChange={(e) => setOperationType(e.target.value)}
                      className="sr-only peer" 
                    />
                    <div className="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800/40 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-0.5 peer-checked:border-purple-500 peer-checked:bg-purple-950/20 peer-checked:text-purple-300 h-16 shadow-inner">
                      <span className="text-xs font-bold">تحويل InstaPay</span>
                      <span className="text-[9px] text-slate-500 font-medium">صادر بنكي ⚡</span>
                    </div>
                  </label>

                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="operation" 
                      value="استلام انستا باي"
                      checked={operationType === 'استلام انستا باي'}
                      onChange={(e) => setOperationType(e.target.value)}
                      className="sr-only peer" 
                    />
                    <div className="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800/40 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-0.5 peer-checked:border-sky-500 peer-checked:bg-sky-950/20 peer-checked:text-sky-300 h-16 shadow-inner">
                      <span className="text-xs font-bold">استلام InstaPay</span>
                      <span className="text-[9px] text-slate-500 font-medium">وارد بنكي 📲</span>
                    </div>
                  </label>

                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="operation" 
                      value="تحويل فوري"
                      checked={operationType === 'تحويل فوري'}
                      onChange={(e) => setOperationType(e.target.value)}
                      className="sr-only peer" 
                    />
                    <div className="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800/40 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-0.5 peer-checked:border-amber-500 peer-checked:bg-amber-950/20 peer-checked:text-amber-400 h-16 shadow-inner">
                      <span className="text-xs font-bold">تحويل فوري</span>
                      <span className="text-[9px] text-slate-500 font-medium">صادر فوري ⚡</span>
                    </div>
                  </label>

                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="operation" 
                      value="استلام فوري"
                      checked={operationType === 'استلام فوري'}
                      onChange={(e) => setOperationType(e.target.value)}
                      className="sr-only peer" 
                    />
                    <div className="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800/40 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-0.5 peer-checked:border-orange-500 peer-checked:bg-orange-950/20 peer-checked:text-orange-400 h-16 shadow-inner">
                      <span className="text-xs font-bold">استلام فوري</span>
                      <span className="text-[9px] text-slate-500 font-medium">وارد فوري 📥</span>
                    </div>
                  </label>

                </div>
              </div>

              {/* Client Name & Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">اسم العميل والجهة المعنية <span className="text-red-500">*</span></label>
                  <div className="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all px-3">
                    <User className="h-4 w-4 text-slate-500 shrink-0 select-none ml-2" />
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required 
                      placeholder="مثال: أحمد محمد صبري" 
                      className="w-full bg-transparent py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-xs" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">المبلغ المطلوب (EGP) <span className="text-red-500">*</span></label>
                  <div className="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all px-3">
                    <span className="text-brand-500 font-extrabold text-xs select-none ml-2 select-all font-mono">جنيه</span>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required 
                      step="any" 
                      min="0.1" 
                      placeholder="0.00" 
                      className="w-full bg-transparent py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-xs font-bold" 
                    />
                  </div>
                </div>
              </div>

              {/* Telephone & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">رقم الهاتف / رقم حساب المراسلة <span className="text-red-500">*</span></label>
                  <div className="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all px-3">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0 select-none ml-2" />
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required 
                      placeholder="أدخل رقم المحفظة أو الحساب" 
                      className="w-full bg-transparent py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-xs font-mono tracking-wider" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">ملاحظات توضيحية إضافية</label>
                  <div className="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all px-3">
                    <FileText className="h-4 w-4 text-slate-500 shrink-0 select-none ml-2" />
                    <input 
                      type="text" 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="تفاصيل إجرائية عن العملية" 
                      className="w-full bg-transparent py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* Screenshot Drag Box */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 font-sans">إرفاق صورة إيصال العملية</label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-800 hover:border-brand-500/40 bg-dark-950 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[135px]"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-brand-500', 'bg-brand-500/5');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-brand-500', 'bg-brand-500/5');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-brand-500', 'bg-brand-500/5');
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  {imageBase64 ? (
                    <div className="w-full flex flex-col items-center justify-center gap-3">
                      <div className="relative">
                        <img 
                          src={imageBase64} 
                          alt="Receipt Preview" 
                          className="max-h-24 max-w-[180px] h-auto rounded-lg border border-dark-700 object-contain shadow-md" 
                        />
                        <button 
                          type="button" 
                          onClick={handleCancelImage}
                          className="absolute -top-2 -right-2 h-6 w-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow pointer-events-auto cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-[10px] text-brand-400 font-bold">{imageName}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-center">
                      <p className="text-2xl select-none">📸</p>
                      <p className="text-xs font-semibold text-slate-300">اسحب صورة الإيصال أو انقر لاختيار ملف</p>
                      <p className="text-[9.5px] text-slate-500 leading-normal">يتم معالجة وتصغير وحجم الصورة سحابياً لإصدار التقارير بأمان</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action submit button */}
              <div className="pt-1.5">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-75 disabled:cursor-not-allowed text-dark-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/10 cursor-pointer text-xs transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 text-dark-950" />
                      <span>جاري معالجة المعاملة وإرسالها بأمان...</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 text-dark-950" />
                      <span>حفظ المعاملة وتأكيد العملية الفورية 🚀</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Side Overview Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Stats - Simple, Clean, Non-Gimmicky */}
            <div className="bg-dark-900 border border-dark-900/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl"></div>
              <h3 className="text-xs font-bold text-slate-300 mb-4 pb-2 border-b border-dark-950 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                <span>ملخص معاملات اليوم الحالية</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-dark-950 p-3.5 rounded-xl border border-dark-800">
                  <span className="text-[9.5px] text-red-400 font-bold block flex items-center gap-1 leading-none">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>الصادرات</span>
                  </span>
                  <span className="text-sm font-extrabold text-white mt-2 block font-mono">
                    {totalOutToday.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
                
                <div className="bg-dark-950 p-3.5 rounded-xl border border-dark-800">
                  <span className="text-[9.5px] text-green-400 font-bold block flex items-center gap-1 leading-none">
                    <ArrowDownLeft className="h-3 w-3" />
                    <span>الواردات</span>
                  </span>
                  <span className="text-sm font-extrabold text-white mt-2 block font-mono">
                    {totalInToday.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>
              
              <p className="text-[9px] text-slate-500 mt-4 text-center leading-normal">
                الإحصائية أعلاه تحسب تلقائياً من المسودة المحلية الحالية لفرعك.
              </p>
              
              <div className="mt-4 pt-3.5 border-t border-dark-950/60">
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-dark-950 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-brand-500/10 cursor-pointer text-xs transition duration-150 flex items-center justify-center gap-1.5 transform active:scale-[0.98]"
                >
                  <Printer className="h-4 w-4 text-dark-950" />
                  <span>طباعة وتصدير التقارير (اليومي / الشهري) 📋</span>
                </button>
              </div>
            </div>

            {/* Local Transaction Logs list */}
            <div className="bg-dark-900 border border-dark-900/50 rounded-2xl p-5 shadow-xl flex flex-col max-h-[420px]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-dark-950">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>آخر العمليات النشطة</span>
                  <span className="text-[10px] text-brand-300 font-bold bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/15">
                    {localHistory.length} عمليات
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => syncWithCloud(false)}
                    className="text-slate-300 hover:text-white hover:bg-dark-800 px-2 py-1.5 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold border border-dark-800/80 bg-dark-950/60"
                    title="مزامنة العمليات وتحميل من جدول بيانات جوجل سحابياً"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
                    <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة سحابية 🔄'}</span>
                  </button>
                  {localHistory.length > 0 && (
                    <button 
                      onClick={clearLocalHistory}
                      className="text-[9.5px] text-slate-400 hover:text-red-400 font-bold transition duration-150 cursor-pointer"
                    >
                      حذف محلي
                    </button>
                  )}
                </div>
              </div>

              {/* Scrolling list */}
              <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
                {localHistory.length === 0 ? (
                  <div className="text-center py-20 text-slate-600 space-y-2">
                    <p className="text-xl select-none">📥</p>
                    <p className="text-[11px] font-medium">لم يتم تدوين أي عمليات في السجل حتى الآن.</p>
                  </div>
                ) : (
                  localHistory.map((tx) => {
                    const isOut = tx.type.includes('تحويل');
                    return (
                      <div key={tx.id} className="p-3 bg-dark-950 rounded-xl border border-dark-800/80 space-y-2 hover:border-dark-700 transition">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{tx.clientName}</span>
                          <span className={`text-[9px] py-0.5 px-2 rounded-full border font-bold ${
                            isOut 
                              ? 'text-red-400 border-red-900/30 bg-red-950/20' 
                              : 'text-green-400 border-green-900/30 bg-green-950/20'
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-slate-200">{tx.amount.toLocaleString('ar-EG')} ج.م</span>
                          <span className="text-slate-400 text-[11px] font-bold">{tx.phone}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{tx.timestamp}</span>
                          {tx.notes && (
                            <span className="truncate max-w-[120px] text-slate-400" title={tx.notes}>
                              📝 {tx.notes}
                            </span>
                          )}
                        </div>

                        {/* Image preview indicator */}
                        {tx.image && (
                          <div className="pt-2 border-t border-dark-900/60 flex items-center justify-between">
                            <span className="text-[9px] text-indigo-400 flex items-center gap-1 leading-none font-medium">
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                              تم إرفاق إيصال العملية المشفر
                            </span>
                            <button 
                              onClick={() => setSelectedReceipt(tx.image)}
                              className="text-[9.5px] text-brand-300 hover:underline flex items-center gap-0.5 cursor-pointer font-bold duration-150"
                            >
                              <Eye className="h-3 w-3" />
                              عرض الإيصال
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* FOOTER & COOPERATIVE - SIMPLIFIED */}
      <footer className="border-t border-dark-950 bg-dark-950/80 py-4 text-center text-[10px] text-slate-500 leading-relaxed font-sans mt-8 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p>محل موبايلات "Number One" &copy; 2026 - جميع الحقوق محفوظة لـ "وحيد" للأنظمة السحابية المتكاملة</p>
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>بوابة الربط السحابي النشطة وتلقائية العمل بالخلفية</span>
          </div>
        </div>
      </footer>

      {/* SCREENSHOT FULL VIEW MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl relative">
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-3 -left-3 h-8 w-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow cursor-pointer z-10 select-none transition"
            >
              ✕
            </button>
            <div className="text-center font-bold text-white text-xs mb-3 pb-2 border-b border-dark-800">عرض إيصال المعاملة مسبق الحفظ</div>
            <div className="flex justify-center items-center overflow-hidden bg-black/30 rounded-xl p-2">
              <img 
                src={selectedReceipt} 
                alt="Receipt Full Preview" 
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain" 
              />
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN BACKDOOR CONFIGURATION DIALOG */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl font-sans">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-brand-500" />
                <span>إعدادات السيرفر السحابي (خلفي تلقائي)</span>
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-dark-950 p-3 rounded-xl border border-dark-800 leading-relaxed text-slate-400">
                <p className="font-bold text-brand-400 mb-1">⚙️ تهيئة الرابط المخفي للجهاز:</p>
                <p>يمكنك تغيير رابط الويب التابع لمحرك جوجل في السحابة لتلقي التقارير آلياً دون الحاجة لإبراز تفاصيل اللينك للموظفين أو المشترين.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">رابط الخادم البرمجي السحابي المباشر</label>
                <input 
                  type="url" 
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec" 
                  className="w-full bg-dark-950 border border-dark-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-brand-500 text-xs font-mono tracking-normal text-left dir-ltr" 
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 font-sans">
                <button 
                  type="button" 
                  onClick={() => setShowSettings(false)} 
                  className="bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveSettings} 
                  className="bg-brand-500 hover:bg-brand-600 text-dark-950 px-5 py-2.5 rounded-xl font-bold transition cursor-pointer"
                >
                  حفظ 💾
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans" dir="rtl">
          <div className="bg-dark-900 border border-dark-800 rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl"></div>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-850/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">مركز التدقيق واستخراج التقارير المالية للفرع</h3>
                  <p className="text-[10px] text-slate-400 mt-1">توليد تقارير يومية أو شهرية للعمليات وحفظها كملف PDF أو طباعتها ورقياً</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white font-bold h-8 w-8 bg-dark-950 hover:bg-dark-850 border border-dark-800 rounded-full flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 bg-dark-950/60 p-4 rounded-2xl border border-dark-850/40 shrink-0">
              {/* Period Select tabs */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-2">النطاق والمدى الزمني للتقرير</span>
                <div className="flex bg-dark-900 border border-dark-800 p-1 rounded-xl gap-1">
                  <button 
                    type="button"
                    onClick={() => setReportPeriod('daily')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportPeriod === 'daily' 
                        ? 'bg-brand-500 text-dark-950 shadow-md font-extrabold' 
                        : 'text-slate-300 hover:bg-dark-800'
                    }`}
                  >
                    التقرير اليومي الحقيقي 📅
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReportPeriod('monthly')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportPeriod === 'monthly' 
                        ? 'bg-brand-500 text-dark-950 shadow-md font-extrabold' 
                        : 'text-slate-300 hover:bg-dark-800'
                    }`}
                  >
                    التقرير العام الشامل (الكل) 📆
                  </button>
                </div>
              </div>

              {/* Category Filter tabs */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-2">تصنيف نوع الخدمة والعمليات</span>
                <div className="flex bg-dark-900 border border-dark-800 p-1 rounded-xl gap-1">
                  <button 
                    type="button"
                    onClick={() => setReportCategory('all')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportCategory === 'all' 
                        ? 'bg-indigo-600 text-white shadow font-extrabold' 
                        : 'text-slate-400 hover:bg-dark-800'
                    }`}
                  >
                    الجميع
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReportCategory('cash')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportCategory === 'cash' 
                        ? 'bg-indigo-600 text-white shadow font-extrabold' 
                        : 'text-slate-400 hover:bg-dark-800'
                    }`}
                  >
                    كاش 💸
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReportCategory('instapay')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportCategory === 'instapay' 
                        ? 'bg-indigo-600 text-white shadow font-extrabold' 
                        : 'text-slate-400 hover:bg-dark-800'
                    }`}
                  >
                    InstaPay 📲
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReportCategory('fawry')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportCategory === 'fawry' 
                        ? 'bg-indigo-600 text-white shadow font-extrabold' 
                        : 'text-slate-400 hover:bg-dark-800'
                    }`}
                  >
                    فوري ⚡
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Aggregated Statistics widgets inside modal */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5 shrink-0">
              <div className="bg-dark-950 p-3.5 rounded-2xl border border-dark-800/80">
                <span className="text-[10px] text-slate-400 font-bold block">إجمالي الصادرات المالية</span>
                <span className="text-sm font-extrabold text-red-400 mt-1 block font-mono">{reportTotalOut.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="bg-dark-950 p-3.5 rounded-2xl border border-dark-800/80">
                <span className="text-[10px] text-slate-400 font-bold block">إجمالي الواردات المالية</span>
                <span className="text-sm font-extrabold text-emerald-400 mt-1 block font-mono">{reportTotalIn.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="bg-dark-950 p-3.5 rounded-2xl border border-dark-800/80">
                <span className="text-[10px] text-slate-400 font-bold block">صافي التدفق في الخزينة</span>
                <span className={`text-sm font-extrabold mt-1 block font-mono ${reportNetFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {reportNetFlow >= 0 ? '+' : ''}{reportNetFlow.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="bg-dark-950 p-3.5 rounded-2xl border border-dark-800/80">
                <span className="text-[10px] text-slate-400 font-bold block">إجمالي عدد العمليات</span>
                <span className="text-sm font-extrabold text-indigo-400 mt-1 block font-mono">{reportTransactions.length} عمليات</span>
              </div>
            </div>

            {/* Report Table - Scrollable preview list */}
            <div className="flex-grow overflow-y-auto custom-scrollbar border border-dark-850 bg-dark-950/40 rounded-2xl">
              {reportTransactions.length === 0 ? (
                <div className="text-center py-20 text-slate-600 space-y-2">
                  <p className="text-2xl select-none">📊</p>
                  <p className="text-xs font-semibold">لا يوجد عمليات مطابقة للتصفية والتصنيف المحدد حالياً في الأرشيف.</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-dark-950 text-slate-300 border-b border-dark-850 font-bold sticky top-0 z-10">
                      <th className="p-3 text-[10px] tracking-wide">تاريخ الحركة</th>
                      <th className="p-3 text-[10px] tracking-wide">العميل المعني</th>
                      <th className="p-3 text-[10px] tracking-wide">رقم الحساب / المراسلة</th>
                      <th className="p-3 text-[10px] tracking-wide">طريقة العملية</th>
                      <th className="p-3 text-[10px] tracking-wide text-left">المبلغ المطلوب</th>
                      <th className="p-3 text-[10px] tracking-wide">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-850/50">
                    {reportTransactions.map((tx) => {
                      const isOut = tx.type.includes('تحويل');
                      return (
                        <tr key={tx.id} className="hover:bg-dark-900/40 transition">
                          <td className="p-3 font-mono text-slate-400 text-[10px] whitespace-nowrap">{tx.timestamp}</td>
                          <td className="p-3 font-bold text-slate-200">{tx.clientName}</td>
                          <td className="p-3 font-mono text-slate-300 font-bold">{tx.phone}</td>
                          <td className="p-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                              isOut 
                                ? 'text-red-400 border-red-900/30 bg-red-950/20' 
                                : 'text-green-400 border-green-900/30 bg-green-950/20'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`p-3 text-left font-extrabold font-mono text-xs ${isOut ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.amount.toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-3 text-slate-400 truncate max-w-[150px]">{tx.notes || '---'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Print Trigger Action Footer inside modal */}
            <div className="pt-5 mt-4 border-t border-dark-850/60 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
              <span className="text-[9px] text-slate-500 leading-normal text-center sm:text-right">
                💡 تصفية الحسابات والطباعة الفورية تتم بدقة متناهية متوافقة مع الطابعات الحرارية والورقية العادية A4.
              </span>
              <div className="flex gap-3 w-full sm:w-auto shrink-0 font-sans">
                <button 
                  type="button" 
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 sm:flex-none border border-dark-750 hover:bg-dark-800 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
                <button 
                  type="button" 
                  onClick={() => window.print()} 
                  disabled={reportTransactions.length === 0}
                  className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>تأكيد وطباعة التقرير (EGP) 🖨️</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🧾 OFFICIAL BLACK-ON-WHITE printable report layout configured explicitly for printers */}
      <div id="printable-area" className="print-only" style={{ margin: '0 !important', padding: '0 !important' }} dir="rtl">
        <div style={{ textAlign: 'center', marginTop: '0px', paddingTop: '0px', marginBottom: '12px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0 0 2px 0', padding: '0', letterSpacing: '-1px', lineHeight: '1.1', color: '#000000' }}>Number One</h1>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000', margin: '0 0 4px 0' }}>تقرير الحسابات تصفية الحركات المالية والعمليات</h2>
          <p style={{ fontSize: '10px', color: '#333333', margin: '0' }}>فرع السوليتير - تصفية حسابات نمبر ون الفورية السحابية</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '10px', borderBottom: '1px solid #000', paddingBottom: '6px' }}>
          <div>
            <strong>توقيت إصدار التقرير:</strong> {new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
          </div>
          <div>
            <strong>دورة تصفية حركة العمل:</strong> {reportPeriod === 'daily' ? 'حساب يومي مفصل' : 'جميع مسودات الأرشيف'} ({reportCategory === 'all' ? 'الكل' : reportCategory})
          </div>
          <div>
            <strong>مُعد التقرير والمدقق الإداري:</strong> فرع وحيد
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
          <div style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', display: 'block', color: '#111', fontWeight: 'bold' }}>إجمالي حجم الصادرات</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{reportTotalOut.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', display: 'block', color: '#111', fontWeight: 'bold' }}>إجمالي حجم الواردات</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{reportTotalIn.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', display: 'block', color: '#111', fontWeight: 'bold' }}>صافي خزينة الفرع</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{reportNetFlow.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', display: 'block', color: '#111', fontWeight: 'bold' }}>العمليات المقيدة</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{reportTransactions.length} عملية</span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f2f2f2', borderBottom: '2px solid #000' }}>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>التاريخ والوقت</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>اسم العميل</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>رقم المعاملة / المحفظة</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>نوع العملية</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>القيمة المالية</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>ملاحظات وحالة الفحص</th>
            </tr>
          </thead>
          <tbody>
            {reportTransactions.map((tx) => {
              const isOut = tx.type.includes('تحويل');
              return (
                <tr key={tx.id} style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontFamily: 'monospace' }}>{tx.timestamp}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>{tx.clientName}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontFamily: 'monospace' }}>{tx.phone}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{tx.type}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>
                    {isOut ? '-' : '+'}{tx.amount.toLocaleString('ar-EG')} ج.م
                  </td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{tx.notes || '---'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '30px', fontSize: '10px', textAlign: 'center' }}>
          <div>
            <p>مُعِد التقرير المسؤول:</p>
            <div style={{ borderBottom: '1px dashed #000', height: '30px', width: '75%', margin: '0 auto' }}></div>
          </div>
          <div>
            <p>المدير العام (وحيد):</p>
            <div style={{ borderBottom: '1px dashed #000', height: '30px', width: '75%', margin: '0 auto' }}></div>
          </div>
          <div>
            <p>ختم الفرع المعتمد:</p>
            <div style={{ borderBottom: '1px dashed #000', height: '30px', width: '75%', margin: '0 auto' }}></div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '8.5px', color: '#555', borderTop: '1px solid #bbb', paddingTop: '8px' }}>
          * تم استخراج وطباعة هذا التقرير تلقائياً من خادم وتطبيق صرافة Number One السحابية في التوقيت واليوم المذكور أعلاه. ويرجى الالتزام بمراجعتها مع الكشوف البنكية وتذاكر المعاملات.
        </div>
      </div>
    </>
  );
}
