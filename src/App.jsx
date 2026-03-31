import React, { useState, useEffect, useMemo } from 'react'; // 👈 確保有 useEffect
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, 
  query, where, orderBy, deleteDoc, doc, updateDoc, 
  onSnapshot, serverTimestamp, 
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken,
  GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  Package, Search, User, Clipboard, TrendingUp, 
  CheckCircle, AlertCircle, ShoppingCart, Calculator, Download, 
  LogOut, Plus, Edit, Truck, Archive, Image as ImageIcon, CreditCard, Filter, X, Trash2, Menu, Scale, Clock, Calendar, Split, Settings as SettingsIcon, Copy, UploadCloud, Heart, ArrowRight, Palette, Moon, Sun, FileText, Banknote, Hash, Ban, Layers, BarChart3, Save, Power, ImageIcon as LucideImage, CheckSquare, Square, History, Lock
} from 'lucide-react';

// --- Firebase Configuration & Init ---
const firebaseConfig = {
  apiKey: "AIzaSyBC2ZhfnCeMPbo4jOgOtLtFkc_vgGxJ9eg",
  authDomain: "paorgbuying.firebaseapp.com",
  projectId: "paorgbuying",
  storageBucket: "paorgbuying.firebasestorage.app",
  messagingSenderId: "975644435158",
  appId: "1:975644435158:web:4d419821ec2630b8a61f77"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 🔥 多店舖與權限設定 ---
const urlParams = new URLSearchParams(window.location.search);
const currentShop = urlParams.get('shop'); 
// ✅ 統一改成簡單的店名，沒有 shop 就叫 default
const appId = currentShop || 'default';

// 🔴 設定每家店的「管理員 Email」
const SHOP_ADMIN_EMAILS = {
  'kelly': ['w0910089324@gmail.com'],       
  'default': ['liyun0420209@gmail.com','popo226353@gmail.com'] 
};

// --- Global Constants & Types ---
const STATUS_LABELS = {
  pending_1: { text: '待一補', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', step: 1 },
  transit:   { text: '待出/物流運輸中', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400', step: 2 },
  pending_2: { text: '待二補', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400', step: 3 },
  completed: { text: '已完成', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400', step: 4 }, 
};

const DEFAULT_BANK_INFO = {
  bank_code: '822',
  bank_name: '中國信託',
  account_no: '1234-5678-9012',
  account_name: '海棠團購'
};

const DEFAULT_ID_RULES = {
  order_prefix: 'OD',
  include_date: true,
  random_length: 4
};

const THEMES = {
  emerald: { label: '海棠綠', primary: 'emerald' },
  blue:    { label: '海洋藍', primary: 'blue' },
  rose:    { label: '玫瑰粉', primary: 'rose' },
  violet:  { label: '紫羅蘭', primary: 'violet' },
  amber:   { label: '暖陽橘', primary: 'amber' },
};

// --- Styles Helpers ---
const getTheme = (config) => THEMES[config?.theme_color] || THEMES.emerald;
const getBtnPrimary = (t) => `w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-${t.primary}-400 to-${t.primary}-600 shadow-lg shadow-${t.primary}-200/50 active:scale-95 transition-all hover:brightness-110 hover:shadow-${t.primary}-300/50 flex items-center justify-center gap-2`;
const getBtnSecondary = (isDark, t) => `w-full py-4 rounded-2xl font-bold border-2 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${isDark ? `text-slate-300 bg-slate-800 border-slate-700 hover:border-${t.primary}-700 hover:bg-${t.primary}-900/30 hover:text-${t.primary}-400` : `text-slate-600 bg-white border-slate-200 hover:border-${t.primary}-200 hover:bg-${t.primary}-50 hover:text-${t.primary}-600`}`;
const getInputStyle = (t, isDark) => isDark ? `w-full p-4 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:border-${t.primary}-500 focus:ring-1 focus:ring-${t.primary}-500 text-slate-100 placeholder-slate-500 transition-all outline-none font-bold tracking-wide shadow-inner` : `w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-${t.primary}-400 focus:ring-4 focus:ring-${t.primary}-100 transition-all outline-none font-bold text-slate-700 placeholder-slate-400 tracking-wide shadow-sm hover:border-slate-300`;
const getCardStyle = (isDark) => isDark ? "bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl shadow-black/20 rounded-3xl p-5 transition-all duration-300" : "bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 rounded-3xl p-5 hover:shadow-2xl transition-all duration-300";
const getTextStyle = (isDark, type = 'primary') => { if (type === 'primary') return isDark ? 'text-slate-100' : 'text-slate-800'; if (type === 'secondary') return isDark ? 'text-slate-400' : 'text-slate-500'; return ''; };

// --- Helper Functions ---
const generateSmartId = (existingCustomers) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); 
  const date = now.getDate();
  const yearShort = year.toString().slice(-2);
  const monthMap = ['1','2','3','4','5','6','7','8','9','A','B','C'];
  const monthChar = monthMap[month];
  const dayString = date.toString().padStart(2, '0');
  const todayStart = new Date(year, month, date).getTime();
  const todayEnd = new Date(year, month, date + 1).getTime();
  const todayCount = existingCustomers.filter(c => {
      let time = 0;
      if (c.created_at?.seconds) time = c.created_at.seconds * 1000;
      else if (c.created_at?.toMillis) time = c.created_at.toMillis();
      else if (c.created_at instanceof Date) time = c.created_at.getTime();
      else return false; 
      return time >= todayStart && time < todayEnd;
  }).length;
  const sequence = (todayCount + 1).toString().padStart(3, '0');
  return `${yearShort}D${monthChar}Y${dayString}X${sequence}`;
};
const generateReadableOrderId = (config = DEFAULT_ID_RULES) => {
  const prefix = config.order_prefix || '';
  const now = new Date();
  let dateStr = '';
  if (config.include_date) {
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    dateStr = `${y}${m}${d}`;
  }
  const length = parseInt(config.random_length) || 4;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < length; i++) randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefix}${dateStr}${randomStr}`;
};
const formatCurrency = (num) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);
const formatDate = (dateStr) => { if (!dateStr) return '-'; const date = new Date(dateStr); return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const preventMinus = (e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); };
const validateIgInput = (val) => { if (/^[a-zA-Z0-9._]*$/.test(val) && val.length <= 30) return val; return null; };
const formatNumberInput = (val) => { if (val === '') return ''; return val.replace(/^0+(?=\d)/, ''); };
const downloadExcel = (data, filename) => { 
  const BOM = '\uFEFF';
  const csvContent = BOM + [['商品名稱', '規格', '價格', '庫存'], ...data.map(item => [item.name, item.spec, item.price, item.stock])].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link);
};
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const cvs = document.createElement('canvas'); const s = 800/img.width; const w = s<1?800:img.width; const h = s<1?img.height*s:img.height; cvs.width=w; cvs.height=h; cvs.getContext('2d').drawImage(img,0,0,w,h); resolve(cvs.toDataURL('image/jpeg',0.6)); }; img.onerror=reject; }; reader.onerror=reject;
  });
};

const ThemeToggle = ({ isDark, toggleTheme }) => (<button onClick={toggleTheme} className={`p-2 rounded-full border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-slate-200 text-slate-400 hover:text-orange-500'}`}>{isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>);
const NavButton = ({ id, label, icon: Icon, tab, setTab, theme, isDark }) => (<button onClick={() => setTab(id)} className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 px-4 py-3 rounded-2xl text-sm transition-all ${tab === id ? `bg-${theme.primary}-50 text-${theme.primary}-600 font-bold dark:bg-${theme.primary}-900/30 dark:text-${theme.primary}-400` : `text-slate-500 hover:bg-${theme.primary}-50 hover:text-${theme.primary}-600 dark:text-slate-400 dark:hover:bg-${theme.primary}-900/20 dark:hover:text-${theme.primary}-400`}`}>{Icon && <Icon className="w-5 h-5"/>}<span className="hidden md:inline">{label}</span></button>);

// --- Product Edit Modal ---
const ProductEditModal = ({ product, onClose, onSave, isDark, theme }) => {
    const [formData, setFormData] = useState({ 
        title: '', price_1: 0, limit: 0, deadline: '', image_url: '', ...product, 
        status: product.status || 'open', spec_details: product.spec_details || [], 
        all_in_config: product.all_in_config || { enabled: false, price: 0, specs: [], limit: 0 } 
    });
    useEffect(() => {
        if (!product.spec_details && product.specs) {
            const initialDetails = product.specs.map(s => ({ name: s, price: product.price_1 || 0, limit: product.spec_limits?.[s] || 0, image: '' }));
            setFormData(prev => ({ ...prev, spec_details: initialDetails }));
        }
    }, []);
    const handleDetailChange = (index, field, value) => {
        const newDetails = [...formData.spec_details];
        if (field === 'price' || field === 'limit') value = formatNumberInput(value);
        newDetails[index] = { ...newDetails[index], [field]: value };
        setFormData({ ...formData, spec_details: newDetails });
    };
    const handleAddSpec = () => setFormData(prev => ({ ...prev, spec_details: [...prev.spec_details, { name: '', price: prev.price_1 || 0, limit: 0, image: '' }] }));
    const handleRemoveSpec = (index) => { const newDetails = [...formData.spec_details]; newDetails.splice(index, 1); setFormData({ ...formData, spec_details: newDetails }); };
    const handleSpecImageUpload = (e, index) => { const file = e.target.files[0]; if(!file) return; compressImage(file).then(base64 => handleDetailChange(index, 'image', base64)); };
    const handleMainImageUpload = (e) => { const file = e.target.files[0]; if(!file) return; compressImage(file).then(base64 => setFormData({...formData, image_url: base64})); };
    const handleAllInToggle = (specName) => {
        const currentSpecs = formData.all_in_config.specs || [];
        let newSpecs = currentSpecs.includes(specName) ? currentSpecs.filter(s => s !== specName) : [...currentSpecs, specName];
        setFormData({ ...formData, all_in_config: { ...formData.all_in_config, specs: newSpecs } });
    };
    const handleSaveInternal = () => { const simpleSpecs = formData.spec_details.map(d => d.name).filter(n => n); onSave({ ...formData, specs: simpleSpecs }); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl ${getCardStyle(isDark)}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-2xl font-black ${getTextStyle(isDark)}`}>編輯商品詳情</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="space-y-8">
                    <div className="flex gap-4 items-start">
                        <div className={`w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover"/> : <LucideImage className="w-8 h-8 opacity-30"/>}
                        </div>
                        <div className="flex-1">
                            <label className={`block text-sm font-bold mb-2 ${getTextStyle(isDark, 'secondary')}`}>商品主圖</label>
                            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                <UploadCloud className="w-4 h-4"/> 上傳圖片
                                <input type="file" className="hidden" accept="image/*" onChange={handleMainImageUpload}/>
                            </label>
                            <p className="text-xs mt-2 opacity-50">建議尺寸 1:1 或 4:3，將自動壓縮。</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={`text-sm font-bold ${getTextStyle(isDark, 'secondary')}`}>商品名稱</label><input type="text" className={getInputStyle(theme, isDark)} value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})}/></div>
                        <div><label className={`text-sm font-bold ${getTextStyle(isDark, 'secondary')}`}>基礎價格 (一補)</label><input type="number" min="0" className={getInputStyle(theme, isDark)} value={formData.price_1 || 0} onKeyDown={preventMinus} onChange={e => setFormData({...formData, price_1: parseInt(formatNumberInput(e.target.value))||0})}/></div>
                        <div><label className={`text-sm font-bold ${getTextStyle(isDark, 'secondary')}`}>總限購 (0為不限;多規格可不填)</label><input type="number" min="0" className={getInputStyle(theme, isDark)} value={formData.limit || 0} onKeyDown={preventMinus} onChange={e => setFormData({...formData, limit: parseInt(formatNumberInput(e.target.value))||0})}/></div>
                        <div><label className={`text-sm font-bold ${getTextStyle(isDark, 'secondary')}`}>截止時間</label><input type="datetime-local" className={getInputStyle(theme, isDark)} value={formData.deadline || ''} onChange={e => setFormData({...formData, deadline: e.target.value})}/></div>
                        <div><label className={`text-sm font-bold ${getTextStyle(isDark, 'secondary')}`}>狀態</label><select className={getInputStyle(theme, isDark)} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="open">開團中</option><option value="closed">已截止</option></select></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className={`text-lg font-bold flex items-center gap-2 ${getTextStyle(isDark)}`}><Layers className="w-5 h-5"/> 規格設定 (不同價格/圖片)</label>
                            <button onClick={handleAddSpec} className={`text-xs px-3 py-1 rounded-full border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>+ 新增規格</button>
                        </div>
                        <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <table className="w-full text-sm text-left">
                                <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                                    <tr><th className="p-3">規格名稱</th><th className="p-3 w-24">價格</th><th className="p-3 w-20">限購</th><th className="p-3">圖片</th><th className="p-3 w-10"></th></tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                    {formData.spec_details.map((spec, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2"><input type="text" className={`w-full bg-transparent border-b outline-none ${isDark ? 'border-slate-700 focus:border-slate-400' : 'border-slate-300 focus:border-slate-500'}`} value={spec.name || ''} onChange={e => handleDetailChange(idx, 'name', e.target.value)} placeholder="款式名稱"/></td>
                                            <td className="p-2"><input type="number" min="0" onKeyDown={preventMinus} className={`w-full bg-transparent border-b outline-none text-center ${isDark ? 'border-slate-700 focus:border-slate-400' : 'border-slate-300 focus:border-slate-500'}`} value={spec.price || 0} onChange={e => handleDetailChange(idx, 'price', e.target.value)}/></td>
                                            <td className="p-2"><input type="number" min="0" onKeyDown={preventMinus} className={`w-full bg-transparent border-b outline-none text-center ${isDark ? 'border-slate-700 focus:border-slate-400' : 'border-slate-300 focus:border-slate-500'}`} value={spec.limit || ''} onChange={e => handleDetailChange(idx, 'limit', e.target.value)} placeholder="-"/></td>
                                            <td className="p-2"><div className="flex items-center gap-2">{spec.image ? <img src={spec.image} className="w-8 h-8 rounded object-cover bg-slate-100"/> : <div className="w-8 h-8 rounded bg-slate-800/10"></div>}<label className="cursor-pointer text-xs underline opacity-50 hover:opacity-100">上傳<input type="file" className="hidden" accept="image/*" onChange={e => handleSpecImageUpload(e, idx)}/></label></div></td>
                                            <td className="p-2"><button onClick={() => handleRemoveSpec(idx)} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4"/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <label className={`text-lg font-bold flex items-center gap-2 ${getTextStyle(isDark)}`}><Package className="w-5 h-5"/> All-in (包套) 設定</label>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-5 h-5 rounded" checked={formData.all_in_config.enabled} onChange={e => setFormData({...formData, all_in_config: {...formData.all_in_config, enabled: e.target.checked}})}/>
                                <span className="text-sm font-bold">啟用此功能</span>
                            </div>
                        </div>
                        {formData.all_in_config.enabled && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={`block text-sm font-bold mb-1 ${getTextStyle(isDark, 'secondary')}`}>包套優惠總價</label><input type="number" min="0" onKeyDown={preventMinus} className={getInputStyle(theme, isDark)} value={formData.all_in_config.price || 0} onChange={e => setFormData({...formData, all_in_config: {...formData.all_in_config, price: parseInt(formatNumberInput(e.target.value))||0}})}/></div>
                                    <div><label className={`block text-sm font-bold mb-1 ${getTextStyle(isDark, 'secondary')}`}>包套限購 (0為不限)</label><input type="number" min="0" onKeyDown={preventMinus} className={getInputStyle(theme, isDark)} value={formData.all_in_config.limit || 0} onChange={e => setFormData({...formData, all_in_config: {...formData.all_in_config, limit: parseInt(formatNumberInput(e.target.value))||0}})}/></div>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${getTextStyle(isDark, 'secondary')}`}>選擇包含的規格 (勾選)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.spec_details.filter(s=>s.name).map((spec, idx) => (
                                            <div key={idx} onClick={() => handleAllInToggle(spec.name)} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${formData.all_in_config.specs?.includes(spec.name) ? `bg-${theme.primary}-500 text-white border-${theme.primary}-500` : (isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100')}`}>
                                                {spec.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleSaveInternal} className={getBtnPrimary(theme)}><Save className="w-5 h-5"/> 儲存所有變更</button>
                </div>
            </div>
        </div>
    );
};

// --- Views ---
// 🔥 修改 1: 在括號裡多加一個 adminList
const HomeView = ({ setView, appConfig, isDark, toggleTheme, showNotify, adminList }) => {
    const theme = getTheme(appConfig);
    
    const handleSecretLogin = async (e) => {
      if (e.detail === 3) {
        const shopName = currentShop || 'default';
        
        // 🔥 修改 2: 這裡改用傳進來的 adminList，並加上防呆機制
        // 如果沒傳名單進來，就給一個空物件避免報錯
        const safeList = adminList || {};
        const allowedEmails = safeList[shopName] || safeList['default'] || [];
        
        console.log("正在檢查名單:", allowedEmails); // (除錯用) 可以在 F12 看到誰是管理員

        const confirmLogin = confirm(`【團主管理模式】\n您正在登入賣場：${shopName}\n點擊「確定」進行 Google 身分驗證。`);
        if (!confirmLogin) return;

        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const userEmail = result.user.email;
            
            console.log("Google 回傳 Email:", userEmail); // (除錯用) 可以在 F12 看到你登入的 Email

            // 🔥 修改 3: 檢查 Email 是否在名單內
            if (allowedEmails.includes(userEmail)) {
                setView('admin');
                showNotify(`歡迎團主歸來！ (${userEmail})`);
            } else {
                await signOut(auth);
                alert(`⛔ 權限不足！\n\n您的帳號：${userEmail}\n此賣場管理員：${allowedEmails.join(', ')}\n\n(請確認 Email 是否有填錯)`);
            }
        } catch (error) {
            console.error(error);
            showNotify('驗證取消或失敗', 'error');
        }
      }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh] space-y-12 p-4 relative overflow-hidden">
            <div className="absolute top-6 right-6 z-20"><ThemeToggle isDark={isDark} toggleTheme={toggleTheme}/></div>
            <div className={`relative w-full max-w-md md:max-w-xl h-[85vh] max-h-[800px] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col ${isDark ? 'bg-slate-900 shadow-black/50' : 'bg-white shadow-slate-300'}`}>
                <div className="relative flex-1 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url(${appConfig?.home_banner_url || "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800"})` }}>
                    <div className={`absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10`}></div>
                    <div className="absolute top-8 left-8 z-10"><span className="text-white/90 font-bold tracking-wider text-sm backdrop-blur-sm px-3 py-1 rounded-full bg-white/10 border border-white/20">{appConfig?.home_subtitle || "DYXX Begonia ™"}</span></div>
                    <div className="absolute bottom-24 left-8 max-w-[80%] z-10">
                        <h1 onClick={handleSecretLogin} className="text-5xl font-black text-white leading-tight cursor-default select-none active:scale-95 transition-transform" title="Triple click for Admin" style={{ WebkitTextStroke: '1px rgba(0,0,0,0.2)', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                            {appConfig?.home_title ? (appConfig.home_title.split(' ').map((word, i) => (<span key={i} className="block">{word}</span>))) : (<><span className="block">海棠</span><span className="block">很高興</span></>)}
                        </h1>
                    </div>
                </div>
                <div className={`relative pb-8 px-6 pt-8 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className="space-y-4">
                        <button onClick={() => setView('login')} className={`w-full p-6 rounded-[2rem] flex flex-col justify-center items-start transition-all active:scale-95 group ${isDark ? `bg-gradient-to-br from-${theme.primary}-400 to-${theme.primary}-600 border border-slate-700 shadow-lg shadow-${theme.primary}-900/20` : `bg-gradient-to-br from-${theme.primary}-400 to-${theme.primary}-600 text-white shadow-lg shadow-${theme.primary}-200`}`}>
                            <div className={`flex items-center gap-3 mb-1 text-white`}>
                                <Search className="w-6 h-6 opacity-90"/>
                                <span className="font-bold text-lg tracking-wide">查詢我的訂單</span>
                            </div>
                            <span className={`text-xs text-white/70 font-medium`}>Track your orders</span>
                        </button>
                        <button onClick={() => setView('checkout')} className={`w-full p-6 rounded-[2rem] flex flex-col justify-center items-start transition-all active:scale-95 group border-2 ${isDark ? `bg-slate-800 border-slate-700 hover:border-${theme.primary}-700 hover:bg-${theme.primary}-900/30` : `bg-slate-50 border-slate-100 hover:border-${theme.primary}-200 hover:bg-${theme.primary}-50`}`}>
                            <div className={`flex items-center gap-3 mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                <ShoppingCart className={`w-6 h-6 ${isDark ? `text-${theme.primary}-400` : `text-${theme.primary}-600`}`}/>
                                <span className="font-bold text-lg tracking-wide">填寫新訂單</span>
                            </div>
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} font-medium`}>Start a new purchase</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoginView = ({ setView, customers, setCurrentUserData, showNotify, appConfig, isDark, toggleTheme, db, appId }) => {
    const theme = getTheme(appConfig);
    const handleGoogleLogin = async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const existingCustomer = customers.find(c => c.email === user.email);
        if (existingCustomer) {
          setCurrentUserData(existingCustomer); setView('dashboard'); showNotify(`歡迎回來，${user.displayName} ✨`);
        } else {
          const newCustomerData = { email: user.email, line_nickname: user.displayName, phone: '', pin_code: '0000', system_id: generateSmartId(customers), created_at: serverTimestamp(), google_uid: user.uid, avatar: user.photoURL };
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'customers'), newCustomerData);
          setCurrentUserData(newCustomerData); setView('dashboard'); showNotify(`初次見面，${user.displayName}！🎉`);
        }
      } catch (error) { console.error(error); showNotify('登入失敗，請重試 😣', 'error'); }
    };

    return (
        <div className="max-w-lg mx-auto p-6 relative">
            <div className="absolute top-6 right-6"><ThemeToggle isDark={isDark} toggleTheme={toggleTheme}/></div>
            <h2 className={`text-3xl font-black mb-2 mt-8 ${getTextStyle(isDark)}`}>登入查單 👋</h2>
            <p className={`${getTextStyle(isDark, 'secondary')} mb-8`}>使用 Google 帳號快速登入</p>
            <div className={getCardStyle(isDark)}>
                <div className="space-y-4 py-4">
                    <button onClick={handleGoogleLogin} className={`w-full py-4 rounded-2xl font-bold bg-white border-2 border-slate-200 text-slate-700 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-slate-50`}>
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" /> 使用 Google 登入
                    </button>
                    <p className={`text-xs text-center ${getTextStyle(isDark, 'secondary')}`}>系統將自動連結您的訂單紀錄</p>
                </div>
            </div>
            <button onClick={()=>setView('home')} className="w-full p-4 mt-4 opacity-50">← 返回</button>
        </div>
    );
};

// 🔥 CheckoutView 更新：嚴格防呆、限購修正、強制登入
const CheckoutView = ({ setView, products, customers, orders, db, appId, showNotify, user, appConfig, isDark, toggleTheme }) => {
    const [step, setStep] = useState(0);
    const [cart, setCart] = useState([]);
    const [currentItem, setCurrentItem] = useState({ product_id: '', spec: '', qty: 1 });
    const [form, setForm] = useState({ line_nickname: '', phone: '', pin: '', ig_account: '', last_5_digits: '' });
    const [agreed, setAgreed] = useState(false);
    const theme = getTheme(appConfig);
    const bankInfo = appConfig?.bank_info || DEFAULT_BANK_INFO;

    // 🔥 防呆：找不到商品給空物件
    const selectedProduct = products.find(p => p.id === currentItem.product_id) || {};
    
    // 🔥 防呆：確保 spec_details 是陣列
    const specDetails = Array.isArray(selectedProduct?.spec_details) ? selectedProduct.spec_details : [];
    
    // 兼容舊資料邏輯
    const hasLegacySpecs = Array.isArray(selectedProduct?.specs) && selectedProduct.specs.length > 0;
    const isSingleSpec = specDetails.length === 0 && !hasLegacySpecs;
    
    // 找出目前選中的規格詳情 (防呆：找不到給空物件)
    const currentSpecDetail = specDetails.find(s => s.name === currentItem.spec) || {};
    
    // 顯示邏輯
    const displayPrice = currentSpecDetail.price || selectedProduct.price_1 || 0;
    const displayImage = currentSpecDetail.image || selectedProduct.image_url;
    
    // Limits (防呆：轉型 Int，預設 0)
    const productLimit = selectedProduct.limit ? parseInt(selectedProduct.limit) : 0;
    const specLimit = currentSpecDetail.limit ? parseInt(currentSpecDetail.limit) : 0;
    // 🔥 防呆：確保 all_in_config 結構完整
    const allInConfig = selectedProduct.all_in_config || { enabled: false, specs: [], price: 0, limit: 0 };

    // Google Login Handler (for Checkout page)
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // 登入後保持在 checkout，useEffect 會自動填入資料
        } catch (error) { console.error(error); showNotify('登入失敗', 'error'); }
    };

    useEffect(() => {
        if (user && !user.isAnonymous) {
            const currentUser = customers.find(c => c.email === user.email);
            if (currentUser) {
                setForm(prev => ({ ...prev, line_nickname: currentUser.line_nickname || user.displayName || '', phone: currentUser.phone || '', ig_account: currentUser.ig_account || '', pin: '0000' }));
            } else {
                setForm(prev => ({ ...prev, line_nickname: user.displayName || '' }));
            }
        }
    }, [user, customers]);

    const getOwnedQty = (productId, specName) => {
        const email = user?.email;
        let historyQty = 0;
        
        // 1. 歷史訂單 (只看 Email，因為現在強制登入)
        if (email) {
            historyQty = orders.filter(o => {
                if (o.customer_email !== email || o.product_id !== productId) return false;
                // 如果指定了 specName，必須比對規格 (null 表示只查商品總量)
                if (specName && o.spec !== specName) return false;
                return true; 
            }).reduce((sum, o) => sum + o.qty, 0);
        }

        // 2. 購物車內數量
        const cartQty = cart.filter(c => {
            if (c.product_id !== productId) return false;
            if (specName && c.spec !== specName) return false;
            return true;
        }).reduce((sum, c) => sum + c.qty, 0);

        return historyQty + cartQty;
    };

    const handleAddToCart = () => {
        if (!selectedProduct.id) return;
        
        const hasSpecs = !isSingleSpec; 
        if (hasSpecs && !currentItem.spec) return;

        const targetSpecName = currentItem.spec || '單一規格';
        const addingQty = parseInt(currentItem.qty);
        
        // 🔥 限購檢查 (邏輯精確化)
        if (!isSingleSpec) {
            // 多規格：只看該規格的量，不看商品總量
            if (specLimit > 0) {
                const currentOwned = getOwnedQty(selectedProduct.id, targetSpecName);
                if ((currentOwned + addingQty) > specLimit) {
                    return showNotify(`此款式限購 ${specLimit} 個 (您已買/選 ${currentOwned} 個)`, 'error');
                }
            }
        } else {
            // 單一規格：看商品總量
            if (productLimit > 0) {
                const currentOwned = getOwnedQty(selectedProduct.id, null);
                if ((currentOwned + addingQty) > productLimit) {
                    return showNotify(`此商品限購 ${productLimit} 個 (您已買/選 ${currentOwned} 個)`, 'error');
                }
            }
        }

        const existingIdx = cart.findIndex(c => c.product_id === selectedProduct.id && c.spec === targetSpecName);
        if (existingIdx > -1) {
            const newCart = [...cart];
            newCart[existingIdx].qty += addingQty;
            setCart(newCart);
            showNotify('已更新購物車數量');
        } else {
            const newItem = {
                ...currentItem, qty: addingQty, tempId: Date.now(), productTitle: selectedProduct.title,
                price: displayPrice, imageUrl: displayImage, spec: targetSpecName
            };
            setCart([...cart, newItem]);
            showNotify('已加入清單');
        }
        setCurrentItem({ ...currentItem, spec: '', qty: 1 });
    };

    const handleAllInAdd = () => {
        if (!allInConfig.enabled || !Array.isArray(allInConfig.specs) || allInConfig.specs.length === 0) return;
        
        // All-in 檢查：遍歷每一個子規格的限購
        for (const specName of allInConfig.specs) {
            const sDetail = specDetails.find(s => s.name === specName);
            // 防呆：如果找不到規格詳情，跳過檢查或視為不限購
            if (!sDetail) continue; 

            const limit = sDetail.limit ? parseInt(sDetail.limit) : 0;
            const currentOwned = getOwnedQty(selectedProduct.id, specName);
            
            if (limit > 0 && (currentOwned + 1) > limit) {
                 return showNotify(`包套內的【${specName}】已達限購 (${limit}個)，無法加入`, 'error');
            }
        }

        const specsToAdd = allInConfig.specs;
        const bundlePrice = allInConfig.price;
        const avgPrice = Math.floor(bundlePrice / specsToAdd.length);
        
        let newCart = [...cart];
        specsToAdd.forEach((specName, idx) => {
            const sDetail = specDetails.find(s => s.name === specName) || {};
            const isLast = idx === specsToAdd.length - 1;
            const thisPrice = isLast ? (bundlePrice - avgPrice * (specsToAdd.length - 1)) : avgPrice;
            
            const existingIdx = newCart.findIndex(c => c.product_id === selectedProduct.id && c.spec === specName);
            if (existingIdx > -1) {
                newCart[existingIdx].qty += 1;
            } else {
                newCart.push({
                    product_id: selectedProduct.id, qty: 1, tempId: Date.now() + idx,
                    productTitle: selectedProduct.title, price: thisPrice,
                    imageUrl: sDetail.image || selectedProduct.image_url, spec: specName
                });
            }
        });
        setCart(newCart);
        showNotify(`已加入 All-in 包套`);
    };

    const handleCheckoutAction = async () => {
        // 🔥 1. 強制登入檢查
        if (!user || user.isAnonymous) return showNotify('請先登入會員', 'error');
        
        // 🔥 2. 嚴格必填防呆檢查 (新增這段)
        if (!form.phone || form.phone.length < 10) return showNotify('請輸入完整 10 碼手機號碼', 'error');
        if (!form.line_nickname || form.line_nickname.trim() === '') return showNotify('請輸入 Line 暱稱', 'error');
        if (!form.ig_account || form.ig_account.trim() === '') return showNotify('請輸入 IG 帳號', 'error');
        if (!form.last_5_digits || form.last_5_digits.length < 5) return showNotify('請輸入完整的匯款後 5 碼', 'error');

        // ... 下面保留你原本寫入資料庫的 try { ... } 邏輯 ...

        try {
            let cust = customers.find(c => c.email === user.email);
            // 如果是新會員 (登入但資料庫沒資料)，建立資料
            if (!cust) {
                const newCust = { 
                    email: user.email, 
                    google_uid: user.uid, 
                    phone: form.phone, 
                    line_nickname: form.line_nickname || user.displayName, 
                    ig_account: form.ig_account, 
                    system_id: generateSmartId(customers), 
                    created_at: serverTimestamp(), 
                    avatar: user.photoURL 
                };
                const res = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'customers'), newCust);
                cust = { ...newCust, id: res.id };
            } else {
                // 更新會員資料
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', cust.id), { 
                    line_nickname: form.line_nickname, 
                    ig_account: form.ig_account, 
                    phone: form.phone 
                });
            }

            const myPendingOrders = orders.filter(o => 
                o.status === 'pending_1' && o.customer_email === cust.email
            );

            const promises = [];
            for (const item of cart) {
                const existingOrder = myPendingOrders.find(o => o.product_id === item.product_id && o.spec === item.spec);
                if (existingOrder) {
                    promises.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', existingOrder.id), { 
                        qty: existingOrder.qty + item.qty 
                    }));
                } else {
                    // 🔥 關鍵修改：寫入 product_title 與 product_image (快照)
                    promises.push(addDoc(collection(db,'artifacts',appId,'public','data','orders'), {
                        customer_phone: cust.phone, 
                        customer_email: cust.email, 
                        product_id: item.product_id, 
                        product_title: item.productTitle, // 快照
                        product_image: item.imageUrl,     // 快照
                        spec: item.spec, 
                        qty: item.qty,
                        last_5_digits: form.last_5_digits, 
                        status: 'pending_1', 
                        shipping_fee_due: 0, 
                        display_id: generateReadableOrderId(appConfig?.id_rules), 
                        created_at: serverTimestamp(),
                        deal_price: item.price
                    }));
                }
            }
            await Promise.all(promises); 
            showNotify('訂單建立成功！'); 
            setView('home');
        } catch(e) { console.error(e); showNotify('失敗','error'); }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-8">
                 <button onClick={()=>setView('home')} className="p-2 rounded-full border"><LogOut className="w-4 h-4"/></button>
                 <ThemeToggle isDark={isDark} toggleTheme={toggleTheme}/>
             </div>
             {step === 0 && (
                 <div className="space-y-6">
                     <div className={getCardStyle(isDark)}>
                         <h3 className={`text-xl font-bold mb-4 ${getTextStyle(isDark)}`}>購買須知</h3>
                         <div className="p-4 rounded-2xl border mb-4 text-sm opacity-80 whitespace-pre-wrap">{appConfig?.agreement_text || "請閱讀條款..."}</div>
                         <div onClick={()=>setAgreed(!agreed)} className="flex items-center gap-2 cursor-pointer font-bold"><div className={`w-5 h-5 border rounded flex items-center justify-center ${agreed?'bg-emerald-500 border-emerald-500 text-white':''}`}>{agreed && <CheckCircle className="w-3 h-3"/>}</div>我同意</div>
                     </div>
                     <button disabled={!agreed} onClick={()=>setStep(1)} className={getBtnPrimary(theme)}>開始選購</button>
                 </div>
             )}
             {step === 1 && (
                 <div className="space-y-6">
                     <div className={getCardStyle(isDark)}>
                         <div className="space-y-4">
                             <div>
                                 <label className="text-sm font-bold ml-2 opacity-70">商品</label>
                                 <select className={getInputStyle(theme,isDark)} value={currentItem.product_id} onChange={e=>{setCurrentItem({product_id:e.target.value, spec:'', qty:1})}}>
                                     <option value="">請選擇</option>
                                     {products.filter(p=>p.status==='open').map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
                                 </select>
                             </div>
                             {(displayImage) && (<div className="rounded-2xl overflow-hidden aspect-video border-2 border-slate-100 bg-slate-50"><img src={displayImage} className="w-full h-full object-cover"/></div>)}
                             {selectedProduct.id && (<div className={`text-right font-black text-2xl text-${theme.primary}-500`}>${displayPrice}</div>)}
                             
                             {allInConfig.enabled && Array.isArray(allInConfig.specs) && allInConfig.specs.length > 0 && (
                                 <div onClick={handleAllInAdd} className={`cursor-pointer p-4 rounded-2xl border-2 border-dashed border-${theme.primary}-300 bg-${theme.primary}-50/50 flex items-center justify-between hover:bg-${theme.primary}-100 transition-colors`}>
                                     <div>
                                         <div className={`font-black text-${theme.primary}-600 flex items-center gap-1`}><Package className="w-4 h-4"/> 我要 All-in 包套！</div>
                                         <div className="text-xs text-slate-500 mt-1">包含 {allInConfig.specs.length} 樣款式，優惠價</div>
                                         {allInConfig.limit > 0 && <div className="text-[10px] text-rose-500 font-bold mt-1">每人限購 {allInConfig.limit} 組</div>}
                                     </div>
                                     <div className="text-xl font-black text-rose-500">${allInConfig.price}</div>
                                 </div>
                             )}
                             
                             {selectedProduct.id && (!isSingleSpec) && (
                                 <div className="flex gap-2">
                                     <div className="flex-1">
                                         <label className="text-sm font-bold ml-2 opacity-70">規格</label>
                                         <select className={getInputStyle(theme,isDark)} value={currentItem.spec} onChange={e=>setCurrentItem({...currentItem, spec:e.target.value})}>
                                             <option value="">選規格</option>
                                             {specDetails.length > 0 
                                                ? specDetails.map((s,i)=><option key={i} value={s.name}>{s.name} {s.limit>0?`(限${s.limit})`:''}</option>)
                                                : Array.isArray(selectedProduct.specs) && selectedProduct.specs.map((s,i)=><option key={i} value={s}>{s}</option>)
                                             }
                                         </select>
                                     </div>
                                     <div className="w-24"><label className="text-sm font-bold ml-2 opacity-70">數量 {specLimit > 0 && <span className="text-rose-500 text-[10px]">(限{specLimit})</span>}</label><input type="number" min="1" max={specLimit>0?specLimit:undefined} className={getInputStyle(theme,isDark)} value={currentItem.qty} onKeyDown={preventMinus} onChange={e=>{let v = formatNumberInput(e.target.value); if(v && specLimit > 0 && parseInt(v) > specLimit) { v = specLimit; showNotify(`限購 ${specLimit} 個`,'error'); } setCurrentItem({...currentItem, qty: v})}}/></div>
                                 </div>
                             )}
                             
                             {selectedProduct.id && isSingleSpec && (
                                 <div className="w-24"><label className="text-sm font-bold ml-2 opacity-70">數量 {productLimit > 0 && <span className="text-rose-500 text-[10px]">(限{productLimit})</span>}</label><input type="number" min="1" max={productLimit>0?productLimit:undefined} className={getInputStyle(theme,isDark)} value={currentItem.qty} onKeyDown={preventMinus} onChange={e=>{let v = formatNumberInput(e.target.value); if(v && productLimit > 0 && parseInt(v) > productLimit) { v = productLimit; showNotify(`限購 ${productLimit} 個`,'error'); } setCurrentItem({...currentItem, qty: v})}}/></div>
                             )}

                             <button disabled={!selectedProduct.id || (!isSingleSpec && !currentItem.spec)} onClick={handleAddToCart} className={getBtnPrimary(theme)}><Plus className="w-5 h-5"/> 加入清單</button>
                         </div>
                     </div>
                     <div className="space-y-2">
                         {cart.map((item,i)=>(<div key={item.tempId} className={`p-3 rounded-xl border flex justify-between items-center ${isDark?'border-slate-700':'bg-white border-slate-100'}`}><div className="flex items-center gap-3"><img src={item.imageUrl} className="w-10 h-10 rounded bg-slate-200 object-cover"/><div><div className="font-bold text-sm">{item.productTitle}</div><div className="text-xs opacity-60">{item.spec} x {item.qty}</div></div></div><div className="flex items-center gap-3"><div className="font-bold">${item.price * item.qty}</div><button onClick={()=>setCart(cart.filter((_,idx)=>idx!==i))}><Trash2 className="w-4 h-4 text-rose-400"/></button></div></div>))}
                         {cart.length > 0 && <div className="p-4 font-black text-right text-xl">總計: {formatCurrency(cart.reduce((a,c)=>a+c.price*c.qty,0))}</div>}
                     </div>
                     <div className="flex gap-2">
                        <button onClick={()=>setStep(0)} className={getBtnSecondary(isDark, theme)}>上一步</button>
                        <button disabled={cart.length===0} onClick={()=>setStep(2)} className={getBtnPrimary(theme)}>下一步</button>
                     </div>
                 </div>
             )}
             {step === 2 && (
                 <div className="space-y-6">
                     <div className={`p-5 rounded-2xl border ${isDark?'bg-amber-900/20 border-amber-900/50':'bg-amber-50 border-amber-100'}`}><h3 className="font-bold mb-2 flex items-center gap-2 text-amber-600"><CreditCard className="w-5 h-5"/> 匯款至以下{bankInfo.bank_name}帳號</h3><div className="font-mono text-lg">{bankInfo.bank_code} - {bankInfo.account_no}</div><div className="text-sm opacity-70">⚠️請先匯款再送出訂單</div></div>
                     <div className={getCardStyle(isDark)}>
                         <div className="space-y-4">
                             {/* 🔥 強制 Google 登入 UI：如果未登入，顯示按鈕 */}
                             {user && !user.isAnonymous ? (
                                <div className={`p-3 rounded-xl border mb-2 flex items-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    {user.photoURL && <img src={user.photoURL} className="w-10 h-10 rounded-full"/>}
                                    <div><div className="text-xs opacity-50 font-bold">登入帳號</div><div className="font-bold text-sm">{user.email}</div></div>
                                </div>
                             ) : (
                                <div className="text-center py-6">
                                    <p className="mb-4 text-sm font-bold opacity-70">請先登入會員以完成結帳</p>
                                    <button onClick={handleGoogleLogin} className={`w-full py-4 rounded-2xl font-bold bg-white border-2 border-slate-200 text-slate-700 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-slate-50`}>
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" /> 使用 Google 登入
                                    </button>
                                </div>
                             )}

                             {/* 🔥 只有登入後才顯示表單 */}
                             {user && !user.isAnonymous && (
                                <>
                                  <div><label className="text-sm font-bold ml-2 text-rose-500">手機 (必填)</label><input className={getInputStyle(theme,isDark)} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} maxLength={10} placeholder="請輸入手機號碼"/></div>
                                  <div><label className="text-sm font-bold ml-2 text-rose-500">Line 暱稱 (必填)</label><input className={getInputStyle(theme,isDark)} value={form.line_nickname} onChange={e=>setForm({...form,line_nickname:e.target.value})} placeholder="請輸入 Line 顯示名稱"/></div>
                                  <div><label className="text-sm font-bold ml-2 text-rose-500">IG 帳號 (30字內，必填)</label><input className={getInputStyle(theme,isDark)} value={form.ig_account} onChange={e=>{const v=validateIgInput(e.target.value); if(v!==null) setForm({...form,ig_account:v})}} placeholder="請輸入 IG 帳號"/></div>
                                  <div><label className="text-sm font-bold ml-2 text-rose-500">匯款後 5 碼 (必填)</label><input className={getInputStyle(theme,isDark)} value={form.last_5_digits} maxLength={5} onChange={e=>setForm({...form,last_5_digits:e.target.value.replace(/\D/g, '')})} placeholder="請輸入存摺帳號後五碼" /></div>
                                </>
                             )}
                         </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={()=>setStep(1)} className={getBtnSecondary(isDark, theme)}>上一步</button>
                        <button disabled={!user || user.isAnonymous} onClick={handleCheckoutAction} className={getBtnPrimary(theme)}>送出訂單</button>
                     </div>
                 </div>
             )}
        </div>
    );
};

// --- Dashboard View (使用 product_title 快照) ---
const DashboardView = ({ currentUserData, setCurrentUserData, setView, orders, products, appConfig, showNotify, isDark, toggleTheme }) => {
    const [showHistory, setShowHistory] = useState(false); 
    const theme = getTheme(appConfig);
    
    const myOrders = orders.filter(o => { 
        // 嚴格比對 Email
        return currentUserData.email && o.customer_email === currentUserData.email;
    });

    const activeOrders = myOrders.filter(o => o.status !== 'completed');
    const historyOrders = myOrders.filter(o => o.status === 'completed');
    const displayedOrders = showHistory ? historyOrders : activeOrders;

    const sortedOrders = [...displayedOrders].sort((a, b) => {
        if (a.status === 'pending_2' && b.status !== 'pending_2') return -1;
        if (b.status === 'pending_2' && a.status !== 'pending_2') return 1;
        return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0);
    });

    const [selectedShipIds, setSelectedShipIds] = useState(new Set());
    useEffect(() => { const pendingIds = activeOrders.filter(o => o.status === 'pending_2').map(o => o.id); setSelectedShipIds(new Set(pendingIds)); }, [orders, showHistory]);
    
    const toggleShipSelection = (orderId) => { const next = new Set(selectedShipIds); if (next.has(orderId)) next.delete(orderId); else next.add(orderId); setSelectedShipIds(next); };
    const selectedTotal = activeOrders.filter(o => selectedShipIds.has(o.id) && o.status === 'pending_2').reduce((acc, curr) => acc + (curr.shipping_fee_due || 0), 0);
    
    const handleCopyShippingList = () => {
        const selectedItems = activeOrders.filter(o => selectedShipIds.has(o.id) && o.status === 'pending_2').map(o => { 
            // 🔥 優先使用訂單快照標題，沒有才查 products
            const title = o.product_title || products.find(p => p.id === o.product_id)?.title || '未知商品';
            return `${title} (${o.spec}) x${o.qty}`; 
        });
        if (selectedItems.length === 0) return showNotify('請先勾選要出貨的訂單', 'error');
        const text = `會員ID: ${currentUserData.system_id}\n姓名: ${currentUserData.line_nickname}\n內容: ${selectedItems.join(', ')}\n總運費: ${selectedTotal}`;
        navigator.clipboard.writeText(text); showNotify('出貨明細已複製！請貼至賣貨便備註 ✅');
    };

    return (
        <div className="w-full p-4 pb-28 animate-in fade-in duration-500">
            <div className={`flex justify-between items-center mb-8 sticky top-0 py-4 z-20 backdrop-blur-md ${isDark ? 'bg-slate-950/90' : 'bg-[#FDFDFD]/90'}`}>
                <div><h2 className={`text-2xl font-black ${getTextStyle(isDark)}`}>Hi, {currentUserData.line_nickname} 👋</h2><p className={`text-xs font-mono mt-1 ${getTextStyle(isDark, 'secondary')}`}>ID: {currentUserData.system_id}</p></div>
                <div className="flex items-center gap-3"><ThemeToggle isDark={isDark} toggleTheme={toggleTheme} /><button onClick={() => { setCurrentUserData(null); signOut(auth); setView('home'); }} className={`text-sm flex items-center gap-1 px-4 py-2 rounded-full border shadow-sm transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}><LogOut className="w-4 h-4" /> 登出</button></div>
            </div>
            
            {activeOrders.some(o => o.status === 'pending_2') && !showHistory && (<div className={`border rounded-[2rem] p-6 mb-8 shadow-xl shadow-rose-500/10 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-rose-950 to-orange-950 border-rose-900' : 'bg-gradient-to-br from-rose-50 to-orange-50 border-rose-100'}`}><div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10"></div><div className="flex items-start gap-4 relative z-10"><div className={`p-3 rounded-2xl ${isDark ? 'bg-rose-900 text-rose-300' : 'bg-rose-100 text-rose-500'}`}><AlertCircle className="w-6 h-6" /></div><div className="flex-1"><h3 className={`font-bold text-lg ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>本次結帳運費</h3><p className={`text-4xl font-black my-2 tracking-tight ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{formatCurrency(selectedTotal)}</p><p className={`text-sm mb-4 ${isDark ? 'text-rose-300/70' : 'text-rose-700/70'}`}>勾選下方商品，確認金額後前往賣貨便。</p><div className="flex gap-3"><button onClick={handleCopyShippingList} className={`flex-1 border py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-sm transition-all ${isDark ? 'bg-slate-900 text-rose-400 border-rose-900 hover:bg-rose-900/30' : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'}`}><Copy className="w-4 h-4"/> 複製明細</button><a href={appConfig?.myship_link || 'https://myship.7-11.com.tw/'} target="_blank" className="flex-1 text-center bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 active:scale-[0.98] transition-all text-sm flex items-center justify-center shadow-lg shadow-rose-200/50">前往賣貨便 <ArrowRight className="w-4 h-4 ml-1"/></a></div></div></div></div>)}
            
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <h3 className={`font-bold text-lg ml-2 ${getTextStyle(isDark)}`}>{showHistory ? '歷史訂單 (已完成)' : '我的訂單 (進行中)'}</h3>
                    <button onClick={() => setShowHistory(!showHistory)} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border transition-all ${showHistory ? (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600') : 'opacity-50 hover:opacity-100'}`}>
                        <History className="w-3 h-3" /> {showHistory ? '返回進行中' : '查看歷史紀錄'}
                    </button>
                </div>

                {sortedOrders.length === 0 ? (<div className={`text-center py-12 rounded-[2rem] border border-dashed ${isDark ? 'text-slate-600 border-slate-800 bg-slate-900/50' : 'text-slate-400 bg-slate-50 border-slate-200'}`}><p>{showHistory ? '沒有歷史訂單' : '目前沒有訂單'}</p></div>) : (sortedOrders.map(order => { 
                    // 🔥 優先使用快照資料
                    const product = products.find(p => p.id === order.product_id) || {};
                    const displayTitle = order.product_title || product.title || '商品已刪除';
                    const displayImage = order.product_image || product.image_url;
                    
                    const statusConfig = STATUS_LABELS[order.status] || STATUS_LABELS.pending_1; 
                    const isPending2 = order.status === 'pending_2'; 
                    
                    return (<div key={order.id} className={`border rounded-[2rem] p-4 shadow-sm hover:shadow-lg transition-all duration-300 flex gap-4 items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${isPending2 ? (isDark ? 'ring-2 ring-rose-900' : 'ring-2 ring-rose-100') : ''}`}>{isPending2 && !showHistory && (<div className="pl-1"><input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-rose-500 focus:ring-rose-400 transition-all cursor-pointer" checked={selectedShipIds.has(order.id)} onChange={() => toggleShipSelection(order.id)}/></div>)}<div className={`w-20 h-20 shrink-0 rounded-2xl overflow-hidden border shadow-inner ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>{displayImage ? <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-300'}`}><ImageIcon className="w-8 h-8" /></div>}</div><div className="flex-1 min-w-0 py-1"><div className="flex justify-between items-start gap-2 mb-1"><h4 className={`font-bold line-clamp-1 ${getTextStyle(isDark)}`}>{displayTitle}</h4><span className={`text-[10px] px-2.5 py-1 rounded-full font-bold shrink-0 whitespace-nowrap ${statusConfig.color}`}>{statusConfig.text}</span></div><div className="flex justify-between items-end"><div><p className={`text-sm font-medium ${getTextStyle(isDark, 'secondary')}`}><span className="font-mono text-xs opacity-60 mr-1">#{order.display_id || order.id.slice(-4)}</span>{order.spec} <span className="opacity-30 mx-1">|</span> x{order.qty}</p>{order.last_5_digits && <p className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>後五碼: {order.last_5_digits}</p>}</div>{isPending2 && (<div className="text-right"><span className="text-[10px] text-rose-400 block">二補運費</span><span className="text-lg text-rose-600 font-black">{formatCurrency(order.shipping_fee_due)}</span></div>)}</div></div></div>); 
                }))}
            </div>
        </div>
    );
};

// --- AdminView (Settings 更新) ---
const AdminView = ({ setView, orders, products, customers, db, appId, showNotify, appConfig, isDark, toggleTheme }) => {
  const [tab, setTab] = useState('orders'); 
  const [editingProduct, setEditingProduct] = useState(null); 
  const [viewStatsProduct, setViewStatsProduct] = useState(null); 
  const [localSettings, setLocalSettings] = useState(appConfig || {});
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [batchStatus, setBatchStatus] = useState('');
  const [orderFilter, setOrderFilter] = useState({ productId: '', keyword: '' }); 
  const [calcData, setCalcData] = useState({ totalFee: 0, misc: 0 });
  const [selectedProductIds, setSelectedProductIds] = useState([]); 
  const [productWeights, setProductWeights] = useState({}); 
  const [shippingConfig, setShippingConfig] = useState({}); 
  // 🔥 Admin History Toggle
  const [showHistory, setShowHistory] = useState(false);

  const theme = getTheme(appConfig);

  useEffect(() => { if(appConfig) setLocalSettings(prev => ({...prev, ...appConfig})); }, [appConfig]);
  useEffect(() => {
    const checkExpired = async () => {
        const now = new Date();
        const updates = products.filter(p=>p.status==='open'&&p.deadline&&now>new Date(p.deadline)).map(p=>updateDoc(doc(db,'artifacts',appId,'public','data','products',p.id),{status:'closed'}));
        if(updates.length>0) await Promise.all(updates);
    }; checkExpired(); const i = setInterval(checkExpired,60000); return ()=>clearInterval(i);
  }, [products]);

  const filteredOrders = useMemo(() => {
      let result = orders.filter(order => {
          const customer = customers.find(c => (order.customer_email && c.email === order.customer_email) || (order.customer_phone && c.phone === order.customer_phone));
          const matchProduct = orderFilter.productId ? order.product_id === orderFilter.productId : true;
          const matchKeyword = orderFilter.keyword ? ((customer?.line_nickname || '').includes(orderFilter.keyword) || (customer?.phone || '').includes(orderFilter.keyword) || (customer?.email || '').includes(orderFilter.keyword) || (customer?.system_id || '').includes(orderFilter.keyword) || (order.display_id || '').includes(orderFilter.keyword)) : true;
          return matchProduct && matchKeyword;
      });
      // 🔥 Filter out completed unless showHistory is true
      if (!showHistory) {
          result = result.filter(o => o.status !== 'completed');
      }
      return result;
  }, [orders, orderFilter, customers, showHistory]);

  const totalFilteredQty = filteredOrders.reduce((acc, curr) => acc + curr.qty, 0);
  const handleAdminUpdateStatus = async (orderId, newStatus) => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { status: newStatus }); showNotify('狀態已更新'); } catch (e) { showNotify('更新失敗', 'error'); } };
  const handleBatchStatusUpdate = async () => { if (!batchStatus) return showNotify('請選擇狀態', 'error'); if (selectedOrderIds.size === 0) return; try { const promises = Array.from(selectedOrderIds).map(id => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id), { status: batchStatus })); await Promise.all(promises); showNotify(`成功更新 ${selectedOrderIds.size} 筆訂單`); setSelectedOrderIds(new Set()); setBatchStatus(''); } catch (e) { showNotify('批量更新失敗', 'error'); } };
  const toggleOrderSelection = (id) => { const next = new Set(selectedOrderIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedOrderIds(next); };
  const toggleAllFilteredOrders = () => { if (selectedOrderIds.size === filteredOrders.length) { setSelectedOrderIds(new Set()); } else { setSelectedOrderIds(new Set(filteredOrders.map(o => o.id))); } };
  const handleGenerateExcel = () => {
      const targets = orders.filter(o => o.status === 'pending_2');
      if (targets.length === 0) return showNotify('沒有待二補的訂單');
      const grouped = {};
      targets.forEach(o => {
          const customer = customers.find(c => c.phone === o.customer_phone);
          if (!customer) return;
          const key = customer.phone;
          if (!grouped[key]) { grouped[key] = { customer, totalFee: 0, specs: [] }; }
          grouped[key].totalFee += (o.shipping_fee_due || 0);
          grouped[key].specs.push(o.spec);
      });
      const exportData = Object.values(grouped).map(group => {
          let finalPrice = group.totalFee; let note = ''; if (finalPrice < 20) { finalPrice = 20; note = '(內退)'; }
          const formatName = `${group.customer.line_nickname} (${group.customer.system_id})`; const formatSpec = `${group.specs[0]}等...共${group.specs.length}樣` + note;
          return { name: formatSpec, spec: formatName, price: finalPrice, stock: 1 };
      });
      downloadExcel(exportData, `賣貨便二補單_${new Date().toISOString().slice(0,10)}.csv`);
  };
  const handleUpdateProduct = async (newProductData) => { try { if (newProductData.id) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', newProductData.id), newProductData); showNotify('商品更新成功'); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...newProductData, created_at: serverTimestamp() }); showNotify('商品新增成功'); } setEditingProduct(null); } catch(e) { console.error(e); showNotify('儲存失敗','error'); } };
  const handleToggleStatus = async (p) => { const newStatus = p.status === 'open' ? 'closed' : 'open'; await updateDoc(doc(db,'artifacts',appId,'public','data','products',p.id), {status: newStatus}); showNotify(`已切換為${newStatus==='open'?'開團中':'已截止'}`); };
  const getProductStats = (pid) => { const pOrders = orders.filter(o => o.product_id === pid); const stats = {}; pOrders.forEach(o => { const key = o.spec || '單一規格'; stats[key] = (stats[key] || 0) + o.qty; }); return stats; };
  const handleToggleProductSelection = (productId, defaultWeight) => { if (selectedProductIds.includes(productId)) { setSelectedProductIds(prev => prev.filter(id => id !== productId)); const newWeights = { ...productWeights }; delete newWeights[productId]; setProductWeights(newWeights); } else { setSelectedProductIds(prev => [...prev, productId]); setProductWeights(prev => ({ ...prev, [productId]: defaultWeight || 0 })); } };
  const calculatorTargetOrders = useMemo(() => { return orders.filter(o => selectedProductIds.includes(o.product_id)); }, [orders, selectedProductIds]);
  useEffect(() => { setShippingConfig(prev => { const next = { ...prev }; calculatorTargetOrders.forEach(o => { if (!next[o.id]) { next[o.id] = { include: true, shipQty: o.qty }; } }); return next; }); }, [calculatorTargetOrders]);
  const handleCalculate = async () => {
    if (selectedProductIds.length === 0) return showNotify('請選擇至少一項商品', 'error');
    if (calcData.totalFee <= 0) return showNotify('請輸入總運費', 'error');
    const processingOrders = calculatorTargetOrders.filter(o => shippingConfig[o.id]?.include);
    if (processingOrders.length === 0) return showNotify('沒有勾選任何訂單', 'error');
    let totalCalculatedWeight = 0;
    for (const pid of selectedProductIds) { if (!productWeights[pid] || productWeights[pid] <= 0) return showNotify(`請輸入商品 ID ${pid.slice(-4)} 的有效單件重量`, 'error'); }
    processingOrders.forEach(o => { const unitWeight = parseFloat(productWeights[o.product_id] || 0); const shipQty = parseInt(shippingConfig[o.id]?.shipQty || 0); totalCalculatedWeight += (shipQty * unitWeight); });
    if (totalCalculatedWeight === 0) return showNotify('總計算重量為 0，無法分攤', 'error');
    const totalCost = parseFloat(calcData.totalFee) + parseFloat(calcData.misc);
    try {
      const promises = [];
      for (const o of processingOrders) {
          const unitWeight = parseFloat(productWeights[o.product_id]); const shipQty = parseInt(shippingConfig[o.id].shipQty);
          if (shipQty <= 0) continue; 
          const orderWeight = shipQty * unitWeight; const shareRatio = orderWeight / totalCalculatedWeight; const fee = Math.ceil(shareRatio * totalCost);
          if (shipQty < o.qty) {
              promises.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), { qty: o.qty - shipQty }));
              promises.push(addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), { ...o, id: undefined, qty: shipQty, shipping_fee_due: fee, status: 'pending_2', is_split: true, created_at: serverTimestamp(), product_title: o.product_title, product_image: o.product_image }));
          } else { promises.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), { shipping_fee_due: fee, status: 'pending_2' })); }
      }
      await Promise.all(promises); showNotify(`計算完成！已更新/拆分訂單`); setCalcData({ totalFee: 0, misc: 0 }); setSelectedProductIds([]); setProductWeights({}); setShippingConfig({});
    } catch (e) { console.error(e); showNotify('更新失敗', 'error'); }
  };
  // 🔍 替換這個函式來抓蟲
  const handleSaveSettings = async () => { 
    console.log("🚀 準備儲存設定...", localSettings); // 1. 檢查資料長怎樣
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'system_settings', 'config'), localSettings); 
      showNotify('設定已儲存'); 
      console.log("✅ 儲存成功！");
    } catch(e) { 
      console.error("❌ 儲存失敗的真正原因：", e); // 2. 把錯誤印出來！
      alert("儲存失敗！原因：" + e.message); // 3. 直接跳視窗告訴你
      showNotify('儲存失敗', 'error'); 
    } 
  };
  const handleImageUpload = (e, field) => { const file = e.target.files[0]; if (!file) return; compressImage(file).then(base64 => { if(field === 'home_banner') setLocalSettings({...localSettings, home_banner_url: base64}); }); };

  return (
    <div className={`flex flex-col h-[100dvh] ${isDark ? 'bg-slate-950' : 'bg-[#FDFDFD]'}`}>
      <div className={`backdrop-blur-md border-b px-4 py-3 flex justify-between items-center shadow-sm z-10 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className={`flex items-center gap-2 font-black text-xl text-${theme.primary}-500`}><Package className="w-6 h-6"/> 後台管理</div>
        <div className="flex gap-2"><ThemeToggle isDark={isDark} toggleTheme={toggleTheme}/><button onClick={()=>setView('home')} className={`px-3 py-1 rounded-full text-xs border transition-all hover:border-${theme.primary}-500 hover:text-${theme.primary}-500`}>退出</button></div>
      </div>
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className={`border-b md:border-r md:w-64 shrink-0 flex md:flex-col overflow-x-auto p-2 gap-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <NavButton id="orders" label="訂單管理" icon={Clipboard} tab={tab} setTab={setTab} theme={theme} isDark={isDark} />
              <NavButton id="products" label="商品管理" icon={Archive} tab={tab} setTab={setTab} theme={theme} isDark={isDark} />
              <NavButton id="calculator" label="二補計算" icon={Calculator} tab={tab} setTab={setTab} theme={theme} isDark={isDark} />
              <NavButton id="settings" label="系統設定" icon={SettingsIcon} tab={tab} setTab={setTab} theme={theme} isDark={isDark} />
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-8">
              {tab === 'orders' && (
                  <div className="w-full space-y-6">
                      <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-center">
                              <h2 className={`text-2xl font-black ${getTextStyle(isDark)}`}>訂單總覽</h2>
                              <div className="flex gap-3">
                                  <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all ${showHistory ? (isDark ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-300') : 'opacity-70 hover:opacity-100 border-transparent'}`}>
                                      <History className="w-4 h-4"/> {showHistory ? '隱藏已完成' : '查看歷史紀錄'}
                                  </button>
                                  <button onClick={handleGenerateExcel} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${isDark ? `bg-${theme.primary}-900/30 text-${theme.primary}-400` : `bg-${theme.primary}-100 text-${theme.primary}-600`}`}><Download className="w-4 h-4"/> 匯出報表</button>
                              </div>
                          </div>
                          {selectedOrderIds.size > 0 && (<div className={`flex items-center justify-between p-3 rounded-xl border animate-in slide-in-from-top-2 ${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'}`}><div className="flex items-center gap-3"><span className={`font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>已選取 {selectedOrderIds.size} 筆訂單</span><select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)} className={`text-sm p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}><option value="">選擇批量動作...</option>{Object.keys(STATUS_LABELS).map(k => (<option key={k} value={k}>轉為：{STATUS_LABELS[k].text}</option>))}</select><button onClick={handleBatchStatusUpdate} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600">確認更新</button></div><button onClick={() => setSelectedOrderIds(new Set())} className="text-sm opacity-60 hover:opacity-100">取消選取</button></div>)}
                          <div className={`${getCardStyle(isDark)} flex flex-col lg:flex-row gap-4`}>
                              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                                   <div className="relative flex-1"><select className={`${getInputStyle(theme, isDark)} pl-10`} value={orderFilter.productId} onChange={(e) => setOrderFilter({...orderFilter, productId: e.target.value})}><option value="">全部商品 ({products.length})</option>{products.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}</select><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /></div>
                                   <div className="relative flex-1"><input type="text" placeholder="搜尋買家" className={`${getInputStyle(theme, isDark)} pl-10`} value={orderFilter.keyword} onChange={(e) => setOrderFilter({...orderFilter, keyword: e.target.value})}/><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />{orderFilter.keyword && (<button onClick={() => setOrderFilter({...orderFilter, keyword: ''})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>)}</div>
                              </div>
                              <div className={`flex items-center justify-between lg:justify-start gap-6 px-0 lg:px-6 lg:border-l pt-2 lg:pt-0 border-t lg:border-t-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}><div className="text-center"><div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">顯示訂單</div><div className={`font-black text-xl ${getTextStyle(isDark)}`}>{filteredOrders.length} <span className="text-sm font-normal text-slate-400">筆</span></div></div><div className="text-center"><div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">商品總數</div><div className={`font-black text-xl text-${theme.primary}-500`}>{totalFilteredQty} <span className={`text-sm font-normal text-${theme.primary}-300`}>個</span></div></div></div>
                          </div>
                      </div>
                      <div className={`rounded-3xl shadow-sm border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[800px] md:min-w-0">
                                <thead className={`border-b ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-100'}`}><tr><th className="p-4 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded" checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleAllFilteredOrders}/></th><th className="p-4 w-20 font-bold">ID</th><th className="p-4 w-32 font-bold">買家</th><th className="p-4 min-w-[200px] font-bold">商品/規格</th><th className="p-4 text-center w-16 font-bold">數量</th><th className="p-4 w-32 font-bold">狀態</th><th className="p-4 w-40 font-bold">IG</th></tr></thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-50'}`}>
                                    {filteredOrders.length === 0 ? (<tr><td colSpan="7" className="p-12 text-center text-slate-400">沒有符合條件的訂單 🍃</td></tr>) : (filteredOrders.map(order => { 
                                        const customer = customers.find(c => (order.customer_email && c.email === order.customer_email) || (order.customer_phone && c.phone === order.customer_phone)); 
                                        
                                        // 🔥 優先使用快照資料
                                        const product = products.find(p => p.id === order.product_id) || {}; 
                                        const displayTitle = order.product_title || product.title || '已刪除商品';
                                        const displayImage = order.product_image || product.image_url;

                                        return (<tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} ${selectedOrderIds.has(order.id) ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') : ''}`}><td className="p-4 text-center"><input type="checkbox" className="w-4 h-4 rounded" checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelection(order.id)}/></td><td className="p-4 font-mono text-slate-400 text-xs">{order.display_id ? <span className={`font-bold ${getTextStyle(isDark, 'primary')}`}>{order.display_id}</span> : <span>#{order.id.slice(-4)}</span>}</td><td className="p-4"><div className={`font-bold truncate max-w-[100px] ${getTextStyle(isDark)}`}>{customer?.line_nickname}</div><div className="text-xs text-slate-400 truncate max-w-[120px]" title={customer?.phone || customer?.email}>{customer?.phone || customer?.email || '-'}</div>{order.last_5_digits && <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>後五: {order.last_5_digits}</span>}</td><td className="p-4"><div className="flex items-center gap-3">{displayImage && <img src={displayImage} alt="" className={`w-10 h-10 rounded-lg object-cover border shadow-sm hidden sm:block ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />}<div className="min-w-0"><div className={`font-bold truncate max-w-[150px] sm:max-w-[250px] ${getTextStyle(isDark)}`}>{displayTitle}</div><div className={`text-xs inline-block px-2 py-0.5 rounded mt-1 ${isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'}`}>{order.spec}</div></div></div></td><td className="p-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{order.qty}</span></td><td className="p-4"><select value={order.status} onChange={(e) => handleAdminUpdateStatus(order.id, e.target.value)} className={`text-xs p-2 rounded-xl border-0 w-full font-bold shadow-sm cursor-pointer ${STATUS_LABELS[order.status]?.color || 'bg-gray-100'}`}>{Object.keys(STATUS_LABELS).map(k => (<option key={k} value={k}>{STATUS_LABELS[k].text}</option>))}</select>{order.shipping_fee_due > 0 && <div className={`text-xs font-bold mt-2 text-center rounded-lg py-1 ${isDark ? 'text-rose-400 bg-rose-900/30' : 'text-rose-500 bg-rose-50'}`}>${order.shipping_fee_due}</div>}</td><td className="p-4"><button onClick={() => { navigator.clipboard.writeText(customer?.ig_account || ''); showNotify('已複製 IG 帳號'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${isDark ? `text-${theme.primary}-400 hover:bg-${theme.primary}-900/30` : `text-${theme.primary}-500 hover:text-${theme.primary}-600 hover:bg-${theme.primary}-50`}`}><User className="w-3 h-3"/> {customer?.ig_account}</button></td></tr>); }))}
                                </tbody>
                            </table>
                          </div>
                      </div>
                  </div>
              )}
              {/* Other tabs remain the same (products, calculator, settings) */}
              {tab === 'products' && (
                  <div className="max-w-6xl mx-auto space-y-6">
                      <div className="flex justify-between items-center"><h2 className={`text-2xl font-black ${getTextStyle(isDark)}`}>商品列表</h2><button onClick={()=>setEditingProduct({})} className={getBtnPrimary(theme)}>+ 新增商品</button></div>
                      <div className={`rounded-3xl border overflow-hidden ${isDark?'border-slate-800 bg-slate-900':'border-slate-100 bg-white'}`}>
                          <table className="w-full text-sm text-left"><thead className={`border-b font-bold ${isDark?'border-slate-800 text-slate-400':'border-slate-100 text-slate-500'}`}><tr><th className="p-4">圖片</th><th className="p-4">名稱</th><th className="p-4">價格</th><th className="p-4 hidden md:table-cell">規格數</th><th className="p-4 hidden md:table-cell">All-in</th><th className="p-4 hidden md:table-cell">截止時間</th><th className="p-4">狀態</th><th className="p-4">操作</th></tr></thead><tbody className={`divide-y ${isDark?'divide-slate-800':'divide-slate-50'}`}>{products.map(p => (<tr key={p.id}><td className="p-4"><img src={p.image_url} className="w-10 h-10 rounded object-cover bg-slate-200"/></td><td className="p-4 font-bold">{p.title}</td><td className="p-4">${p.price_1}</td><td className="p-4 hidden md:table-cell">{p.spec_details?.length || p.specs?.length || 0}</td><td className="p-4 hidden md:table-cell">{p.all_in_config?.enabled ? <CheckCircle className="w-4 h-4 text-emerald-500"/> : <span className="opacity-20">-</span>}</td><td className="p-4 text-xs opacity-70 hidden md:table-cell">{formatDate(p.deadline)}</td><td className="p-4"><button onClick={()=>handleToggleStatus(p)} className={`px-2 py-1 rounded text-xs font-bold ${p.status==='open'?'bg-emerald-100 text-emerald-600':'bg-slate-100 text-slate-500'}`}>{p.status==='open'?'開團中':'已截止'}</button></td><td className="p-4 flex gap-2"><button onClick={()=>setEditingProduct(p)} className="px-3 py-1 rounded bg-blue-50 text-blue-600 font-bold hover:bg-blue-100">編輯</button><button onClick={()=>setViewStatsProduct(p)} className="px-3 py-1 rounded bg-amber-50 text-amber-600 font-bold hover:bg-amber-100"><BarChart3 className="w-4 h-4"/></button><button onClick={async()=>{if(confirm('刪除?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','products',p.id))}} className="px-3 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table>
                      </div>
                  </div>
              )}
              {tab === 'calculator' && (
                  <div className="max-w-2xl mx-auto space-y-8">
                      <div className={getCardStyle(isDark)}>
                          <div className="flex flex-col gap-1 mb-6"><h2 className={`text-xl font-black flex items-center gap-2 ${getTextStyle(isDark)}`}><Scale className={`w-6 h-6 text-${theme.primary}-500`}/> 權重運費計算機</h2></div>
                          <div className="grid grid-cols-2 gap-4 mb-6"><div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>國際運費</label><input type="number" className={getInputStyle(theme, isDark)} value={calcData.totalFee} onChange={e => setCalcData({...calcData, totalFee: e.target.value})}/></div><div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>雜費</label><input type="number" className={getInputStyle(theme, isDark)} value={calcData.misc} onChange={e => setCalcData({...calcData, misc: e.target.value})}/></div></div>
                           <div className={`border rounded-3xl overflow-hidden mb-6 shadow-sm ${isDark ? 'border-slate-800' : 'border-slate-100'}`}><div className={`px-5 py-4 border-b flex justify-between items-center text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}><span>1. 勾選商品</span><span>單件實重(kg)</span></div><div className={`max-h-[300px] overflow-y-auto divide-y ${isDark ? 'divide-slate-800 bg-slate-900' : 'divide-slate-50 bg-white'}`}>
                                {products.map(p => { const isSelected = selectedProductIds.includes(p.id); return (<div key={p.id} className={`flex items-center p-4 gap-4 cursor-pointer ${isSelected ? (isDark ? `bg-${theme.primary}-900/20` : `bg-${theme.primary}-50/50`) : ''}`} onClick={() => handleToggleProductSelection(p.id, p.weight)}><input type="checkbox" checked={isSelected} onChange={() => {}} className={`w-5 h-5 rounded-lg border-slate-300 text-${theme.primary}-500 focus:ring-${theme.primary}-400`}/><div className="flex-1 text-sm font-bold truncate">{p.title} <span className="opacity-50 text-xs">({p.status==='open'?'開團中':'已截止'})</span></div>{isSelected && <div className="w-24"><input type="number" className={`w-full p-2 border-0 rounded-lg text-right text-sm font-bold shadow-sm ring-1 ring-slate-200 focus:ring-2 outline-none ${isDark ? 'bg-slate-800 ring-slate-700 text-white' : 'bg-white ring-slate-200'}`} value={productWeights[p.id]} onChange={(e) => setProductWeights({...productWeights, [p.id]: e.target.value})} onClick={(e) => e.stopPropagation()}/></div>}</div>); })}</div></div>
                           <button onClick={handleCalculate} className={getBtnPrimary(theme)}>開始分攤計算</button>
                      </div>
                  </div>
              )}
              {tab === 'settings' && (
                  <div className="max-w-2xl mx-auto space-y-8">
                      <div className={getCardStyle(isDark)}>
                          <h2 className={`text-xl font-black flex items-center gap-2 mb-6 ${getTextStyle(isDark)}`}>
                              <SettingsIcon className={`w-6 h-6 text-${theme.primary}-500`}/> 系統設定
                          </h2>
                          <div className="space-y-6">
                              {/* --- Basic Settings --- */}
                              <div>
                                  <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>首頁標題</label>
                                  <input type="text" className={getInputStyle(theme, isDark)} placeholder="海棠很高興" value={localSettings.home_title || ''} onChange={e => setLocalSettings({...localSettings, home_title: e.target.value})}/>
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>首頁副標題</label>
                                  <input type="text" className={getInputStyle(theme, isDark)} placeholder="DYXX Begonia ™" value={localSettings.home_subtitle || ''} onChange={e => setLocalSettings({...localSettings, home_subtitle: e.target.value})}/>
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>首頁封面圖</label>
                                  <div className="flex gap-3">
                                    <input type="text" className={getInputStyle(theme, isDark)} placeholder="輸入圖片網址 或 上傳 ->" value={localSettings.home_banner_url || ''} onChange={e => setLocalSettings({...localSettings, home_banner_url: e.target.value})}/>
                                    <label className={`cursor-pointer border p-4 rounded-2xl flex items-center justify-center shrink-0 w-16 shadow-sm transition-all active:scale-95 ${isDark ? `bg-${theme.primary}-900/20 hover:bg-${theme.primary}-900/40 text-${theme.primary}-400 border-${theme.primary}-900` : `bg-${theme.primary}-50 hover:bg-${theme.primary}-100 text-${theme.primary}-600 border-${theme.primary}-100`}`}><UploadCloud className="w-6 h-6"/><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'home_banner')} /></label>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-2 font-medium ml-1">建議尺寸 800x400。點擊圖示可直接上傳 (自動壓縮轉碼)。</p>
                              </div>
                              {localSettings.home_banner_url && (
                                  <div className={`rounded-2xl overflow-hidden border-4 shadow-md h-40 w-full relative group ${isDark ? 'border-slate-800' : 'border-slate-50'}`}><img src={localSettings.home_banner_url} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div></div>
                              )}
                              
                              {/* --- Order ID Rules --- */}
                              <div className={`py-6 border-t border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                  <h3 className={`font-bold flex items-center gap-2 mb-4 ${getTextStyle(isDark)}`}>
                                      <Hash className={`w-5 h-5 text-${theme.primary}-500`}/> 訂單編號規則設定
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>編號前綴 (Prefix)</label>
                                          <input type="text" className={getInputStyle(theme, isDark)} placeholder="例如: OD" value={localSettings.id_rules?.order_prefix || ''} onChange={e => setLocalSettings({...localSettings, id_rules: {...localSettings.id_rules, order_prefix: e.target.value}})}/>
                                      </div>
                                      <div>
                                          <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>包含日期 (YYYYMMDD)</label>
                                          <div className={`flex items-center h-[58px] px-4 rounded-2xl border-2 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                              <input type="checkbox" className={`w-5 h-5 rounded border-slate-300 text-${theme.primary}-500 focus:ring-${theme.primary}-400 mr-2`} checked={localSettings.id_rules?.include_date !== false} onChange={e => setLocalSettings({...localSettings, id_rules: {...localSettings.id_rules, include_date: e.target.checked}})}/>
                                              <span className={`font-bold ${getTextStyle(isDark)}`}>啟用日期戳記</span>
                                          </div>
                                      </div>
                                      <div>
                                          <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>隨機碼長度</label>
                                          <select className={getInputStyle(theme, isDark)} value={localSettings.id_rules?.random_length || 4} onChange={e => setLocalSettings({...localSettings, id_rules: {...localSettings.id_rules, random_length: parseInt(e.target.value)}})}>
                                              <option value="3">3碼</option><option value="4">4碼</option><option value="5">5碼</option><option value="6">6碼</option>
                                          </select>
                                      </div>
                                      <div className="flex items-end pb-1"><div className={`text-sm p-3 rounded-xl w-full border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}><span className="font-bold">預覽：</span> {generateReadableOrderId(localSettings.id_rules)}</div></div>
                                  </div>
                              </div>

                              {/* --- Bank Info Settings --- */}
                              <div className={`py-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                  <h3 className={`font-bold flex items-center gap-2 mb-4 ${getTextStyle(isDark)}`}>
                                      <Banknote className={`w-5 h-5 text-${theme.primary}-500`}/> 匯款帳號設定
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>銀行代碼 (3碼)</label><input type="text" maxLength={3} className={getInputStyle(theme, isDark)} placeholder="822" value={localSettings.bank_info?.bank_code || ''} onChange={e => setLocalSettings({...localSettings, bank_info: {...localSettings.bank_info, bank_code: e.target.value.replace(/\D/g,'')}})}/></div>
                                      <div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>銀行名稱</label><input type="text" className={getInputStyle(theme, isDark)} placeholder="中國信託" value={localSettings.bank_info?.bank_name || ''} onChange={e => setLocalSettings({...localSettings, bank_info: {...localSettings.bank_info, bank_name: e.target.value}})}/></div>
                                      <div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>銀行帳號 (11-14碼)</label><input type="text" maxLength={14} className={getInputStyle(theme, isDark)} placeholder="12345678901234" value={localSettings.bank_info?.account_no || ''} onChange={e => setLocalSettings({...localSettings, bank_info: {...localSettings.bank_info, account_no: e.target.value.replace(/\D/g,'')}})}/></div>
                                      
                                  </div>
                              </div>

                              {/* --- Theme Settings --- */}
                              <div>
                                  <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>介面色系</label>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                      {Object.entries(THEMES).map(([key, t]) => (
                                          <button key={key} onClick={() => setLocalSettings({...localSettings, theme_color: key})} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme_color === key ? (isDark ? `border-${t.primary}-500 bg-${t.primary}-900/30 shadow-md transform scale-105` : `border-${t.primary}-400 bg-${t.primary}-50 shadow-md transform scale-105`) : (isDark ? 'border-slate-800 bg-slate-800 hover:border-slate-700' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50')}`}>
                                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-${t.primary}-400 to-${t.primary}-600 shadow-sm`}></div>
                                              <span className={`text-xs font-bold ${localSettings.theme_color === key ? (isDark ? `text-${t.primary}-400` : `text-${t.primary}-700`) : 'text-slate-500'}`}>{t.label}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>外觀模式 (預設)</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      <button onClick={() => setLocalSettings({...localSettings, theme_mode: 'light'})} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${localSettings.theme_mode !== 'dark' ? `border-${theme.primary}-400 bg-${theme.primary}-50 text-${theme.primary}-700 shadow-md` : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}><Sun className="w-5 h-5"/> 淺色模式</button>
                                      <button onClick={() => setLocalSettings({...localSettings, theme_mode: 'dark'})} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${localSettings.theme_mode === 'dark' ? `border-${theme.primary}-500 bg-slate-800 text-${theme.primary}-400 shadow-md` : 'border-slate-100 bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Moon className="w-5 h-5"/> 深色模式</button>
                                  </div>
                              </div>
                              <div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>同意聲明書內容</label><textarea className={`${getInputStyle(theme, isDark)} h-32 resize-none`} placeholder="請輸入條款內容..." value={localSettings.agreement_text || ''} onChange={e => setLocalSettings({...localSettings, agreement_text: e.target.value})}/></div>
                              <div className={`pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}><div><label className={`block text-sm font-bold mb-2 ml-1 ${getTextStyle(isDark, 'secondary')}`}>賣貨便連結</label><input type="text" className={getInputStyle(theme, isDark)} value={localSettings.myship_link} onChange={e => setLocalSettings({...localSettings, myship_link: e.target.value})}/><p className="text-xs text-slate-400 mt-2 font-medium ml-1">此連結將顯示在買家後台的「待補運費」區塊中。</p></div></div>
                          </div>
                          <div className="mt-8"><button onClick={handleSaveSettings} className={getBtnPrimary(theme)}>儲存設定</button></div>
                      </div>
                  </div>
              )}
          </div>
      </div>
      {editingProduct && <ProductEditModal product={editingProduct} onClose={()=>setEditingProduct(null)} onSave={handleUpdateProduct} isDark={isDark} theme={theme}/>}
      {viewStatsProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${getCardStyle(isDark)}`}>
                  <div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-black ${getTextStyle(isDark)}`}>銷售統計: {viewStatsProduct.title}</h3><button onClick={()=>setViewStatsProduct(null)}><X className="w-6 h-6"/></button></div>
                  <div className="space-y-2">{Object.entries(getProductStats(viewStatsProduct.id)).map(([spec, count]) => (<div key={spec} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800"><span className="font-bold">{spec}</span><span className={`text-lg font-black text-${theme.primary}-500`}>{count} <span className="text-xs font-normal opacity-50">個</span></span></div>))}</div>
              </div>
          </div>
      )}
    </div>
  );
};

// --- Main Application Component ---
export default function ProxyGOApp() {
    const [user, setUser] = useState(null); 
    const [view, setView] = useState('home'); 
    const [currentUserData, setCurrentUserData] = useState(null); 
    const [notification, setNotification] = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [settings, setSettings] = useState({});
  // 🔥 新增：監聽資料庫的設定檔變更 (Real-time)
  useEffect(() => {
    // 定義資料庫路徑：artifacts -> {shopId} -> public -> data -> system_settings -> config
    // 這是對應你的後台儲存位置
    const shopName = currentShop || 'default'; // 確保有店鋪名
    const settingsRef = doc(db, "artifacts", shopName, "public", "data", "system_settings", "config");

    // 開啟監聽器 (onSnapshot)
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("🔥 成功讀取到設定檔:", docSnap.data()); // 可以在 F12 看到
        setSettings(prev => ({
          ...prev,           // 保留原本的預設值
          ...docSnap.data()  // 用資料庫的數據覆蓋它
        }));
      } else {
        console.log("⚠️ 設定檔不存在，使用預設值");
      }
    }, (error) => {
      console.error("讀取設定失敗:", error);
    });

    // 當使用者離開或切換店鋪時，取消監聽
    return () => unsubscribe();
  }, [currentShop]); // 只要店鋪換了，就重新執行
    const [localMode, setLocalMode] = useState(localStorage.getItem('theme_mode'));
    const toggleTheme = () => { const m = (localMode==='dark'||(!localMode&&settings.theme_mode==='dark'))?'light':'dark'; setLocalMode(m); localStorage.setItem('theme_mode', m); };
    const isDark = localMode ? localMode==='dark' : settings.theme_mode==='dark';
    
    useEffect(() => { 
        const init = async () => { 
            // 🔥 如果有舊 token 就用舊的，不然就開匿名登入 (作為 Google 登入前的備案)
            if(typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); 
            else await signInAnonymously(auth); 
        }; 
        init(); 
        onAuthStateChanged(auth, setUser); 
    }, []);

   // 🔓 第一道門：【商品】是公開的，不需要管 user 有沒有登入，一律抓取
    useEffect(() => {
        const unsubP = onSnapshot(collection(db,'artifacts',appId,'public','data','products'), s=>setProducts(s.docs.map(d=>({id:d.id,...d.data()}))));
        return () => unsubP();
    }, [appId]); // 依賴陣列把 user 拿掉

    // 🔐 第二道門：【訂單】與【會員資料】是私密的，必須等 user 登入後才抓取
    useEffect(() => {
        if(!user || user.isAnonymous) return; // 沒登入就擋下來
        const unsubO = onSnapshot(collection(db,'artifacts',appId,'public','data','orders'), s=>setOrders(s.docs.map(d=>({id:d.id,...d.data()}))));
        const unsubC = onSnapshot(collection(db,'artifacts',appId,'public','data','customers'), s=>setCustomers(s.docs.map(d=>({id:d.id,...d.data()}))));
        return () => { unsubO(); unsubC();};
    }, [user, appId]);

    const showNotify = (msg, type='success') => { setNotification({msg, type}); setTimeout(()=>setNotification(null), 3000); };

    return (
        <div className={`min-h-screen font-sans ${isDark?'bg-slate-950 text-slate-100':'bg-[#FDFDFD] text-slate-800'}`}>
            {notification && <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 border bg-white text-slate-800`}>{notification.msg}</div>}
            {view === 'home' && <HomeView setView={setView} appConfig={settings} isDark={isDark} toggleTheme={toggleTheme} showNotify={showNotify} adminList={SHOP_ADMIN_EMAILS} />}
            {/* 🔥 傳入 db 與 appId 給 LoginView 用於註冊 */}
            {view === 'login' && <LoginView setView={setView} customers={customers} setCurrentUserData={setCurrentUserData} showNotify={showNotify} appConfig={settings} isDark={isDark} toggleTheme={toggleTheme} db={db} appId={appId} />}
            {/* 🔥 傳入 orders 給 CheckoutView 進行限購檢查 */}
            {view === 'checkout' && <CheckoutView setView={setView} products={products} customers={customers} orders={orders} db={db} appId={appId} showNotify={showNotify} user={user} appConfig={settings} isDark={isDark} toggleTheme={toggleTheme} />}
            {view === 'dashboard' && currentUserData && <DashboardView currentUserData={currentUserData} setCurrentUserData={setCurrentUserData} setView={setView} orders={orders} products={products} appConfig={settings} showNotify={showNotify} isDark={isDark} toggleTheme={toggleTheme} />}
            {view === 'admin' && <AdminView setView={setView} orders={orders} products={products} customers={customers} db={db} appId={appId} showNotify={showNotify} appConfig={settings} isDark={isDark} toggleTheme={toggleTheme} />}
        </div>
    );
}
