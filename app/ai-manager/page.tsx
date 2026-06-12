'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, FileText, Upload, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ConvertedLink {
  id: number;
  name: string;
  original: string;
  converted: string;
  category: string;
  createdAt: string;
}

export interface AIOperation {
  type: 'CREATE_CATEGORY' | 'CREATE_LINK' | 'UPDATE_LINK_URL' | 'DELETE_LINK' | 'REPLACE_CATEGORY_LINKS';
  categoryName?: string;
  linkName?: string;
  linkId?: number;
  originalUrl?: string;
  links?: {
    name: string;
    originalUrl: string;
  }[];
}

export default function AILinkManager() {
  const [prompt, setPrompt] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<AIOperation[] | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const [currentLinks, setCurrentLinks] = useState<ConvertedLink[]>([]);
  const [currentCategories, setCurrentCategories] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCurrentState();
  }, []);

  const loadCurrentState = async () => {
    try {
      const response = await fetch('/api/links');
      if (response.ok) {
        const data = await response.json();
        setCurrentLinks(data.links || []);
        setCurrentCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to load current state:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileText(text);
    };
    reader.onerror = () => {
      setError('فشل قراءة الملف. يرجى المحاولة مرة أخرى.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileText(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setFileName('');
    setFileText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!prompt.trim() && !fileText.trim()) {
      setError('يرجى كتابة أمر أو رفع ملف قنوات أولاً للتحليل.');
      return;
    }

    setLoading(true);
    setError(null);
    setActions(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          fileText,
          currentLinks,
          currentCategories
        })
      });

      const res = await response.json();
      if (response.ok && res.actions) {
        setActions(res.actions);
        if (res.actions.length === 0) {
          setError('لم يتمكن الذكاء الاصطناعي من تحديد أي عمليات بناءً على المدخلات المحددة.');
        }
      } else {
        setError(res.error || 'فشل تحليل المدخلات.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!actions || actions.length === 0) return;

    setExecuting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      for (const action of actions) {
        if (action.type === 'CREATE_CATEGORY' && action.categoryName) {
          await fetch('/api/links/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: action.categoryName })
          });
        } 
        
        else if (action.type === 'CREATE_LINK' && action.linkName) {
          await fetch('/api/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: action.linkName,
              original: action.originalUrl || '',
              category: action.categoryName || 'Uncategorized'
            })
          });
        } 
        
        else if (action.type === 'UPDATE_LINK_URL' && action.originalUrl) {
          let linkId = action.linkId;
          if (!linkId && action.linkName) {
            const match = currentLinks.find((l: any) => l.name.toLowerCase() === action.linkName.toLowerCase());
            if (match) linkId = match.id;
          }
          if (linkId) {
            await fetch(`/api/links/${linkId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ original: action.originalUrl })
            });
          }
        } 
        
        else if (action.type === 'DELETE_LINK') {
          let linkId = action.linkId;
          let category = '';
          if (!linkId && action.linkName) {
            const match = currentLinks.find((l: any) => l.name.toLowerCase() === action.linkName.toLowerCase());
            if (match) {
              linkId = match.id;
              category = match.category;
            }
          }
          if (linkId) {
            await fetch('/api/links', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                linksToDelete: [{ id: linkId, category }]
              })
            });
          }
        } 
        
        else if (action.type === 'REPLACE_CATEGORY_LINKS' && action.categoryName) {
          // Delete current links in category
          const linksToDelete = currentLinks
            .filter((l: any) => l.category.toLowerCase() === action.categoryName.toLowerCase())
            .map((l: any) => ({ id: l.id, category: l.category }));
          
          if (linksToDelete.length > 0) {
            await fetch('/api/links', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linksToDelete })
            });
          }

          // Ensure category exists
          await fetch('/api/links/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: action.categoryName })
          });

          // Create new links
          if (action.links && action.links.length > 0) {
            for (const ch of action.links) {
              await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: ch.name,
                  original: ch.originalUrl,
                  category: action.categoryName
                })
              });
            }
          }
        }
      }

      setSuccessMessage('تم تطبيق كافة التعديلات وحفظها بنجاح! 🚀');
      toast.success('تم حفظ التعديلات بنجاح');
      setActions(null);
      setPrompt('');
      clearFile();
      await loadCurrentState();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تطبيق العمليات.');
      toast.error('فشل تطبيق التعديلات');
    } finally {
      setExecuting(false);
    }
  };

  const getActionBadgeColor = (type: string) => {
    switch (type) {
      case 'CREATE_CATEGORY': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CREATE_LINK': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE_LINK_URL': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETE_LINK': return 'bg-red-100 text-red-800 border-red-200';
      case 'REPLACE_CATEGORY_LINKS': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'CREATE_CATEGORY': return 'إنشاء تصنيف جديد';
      case 'CREATE_LINK': return 'إنشاء رابط جديد';
      case 'UPDATE_LINK_URL': return 'تحديث رابط التوجيه';
      case 'DELETE_LINK': return 'حذف رابط';
      case 'REPLACE_CATEGORY_LINKS': return 'استبدال روابط التصنيف بالكامل';
      default: return type;
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gray-50 text-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-6">
          <div className="text-center sm:text-right">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-950 flex items-center justify-center sm:justify-start gap-2">
              <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
              مدير الروابط بالذكاء الاصطناعي (Gemini AI)
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              قم بإدارة وإضافة واستبدال روابط القنوات والمجموعات بسهولة عن طريق الأوامر النصية أو ملفات M3U.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">إدارة الروابط الحالية</Button>
          </Link>
        </div>

        {/* Input & Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            
            {/* Prompt Card */}
            <div className="bg-white shadow rounded-xl p-6 border space-y-4">
              <label className="block text-sm font-semibold text-gray-700">اكتب أمرك للذكاء الاصطناعي:</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="مثال: أضف هذه القنوات في تصنيف 'beinfhd'..."
                rows={5}
                className="w-full text-sm font-sans"
              />
              <p className="text-xs text-gray-400">مثال: "أنشئ تصنيف beinfhd واضف القنوات المرفقة فيه" أو "استبدل قنوات beinfhd بقنوات الملف".</p>
            </div>

            {/* Dropzone Card */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 transition flex flex-col items-center justify-center text-center cursor-pointer relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".m3u,.txt,.json"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              
              {fileName ? (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{fileName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="p-0.5 hover:bg-blue-150 rounded text-blue-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">اسحب وأفلت ملف M3U هنا أو اضغط للتصفح</p>
                  <p className="text-xs text-gray-400 mt-1">يدعم ملفات (.m3u, .txt, .json)</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleAnalyze}
              disabled={loading || (!prompt.trim() && !fileText.trim())}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium text-base shadow"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  جاري تحليل البيانات مع Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  تحليل البيانات بالذكاء الاصطناعي
                </>
              )}
            </Button>
          </div>

          {/* Quick Help Column */}
          <div className="bg-white shadow rounded-xl p-6 border space-y-4 h-fit">
            <h3 className="font-bold text-gray-800 border-b pb-2">أمثلة للأوامر</h3>
            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={() => setPrompt("أنشئ تصنيف جديد باسم 'BEIN SPORTS'")}
                className="w-full text-right justify-start text-xs text-gray-500 hover:text-blue-600"
              >
                1. إنشاء تصنيف جديد باسم 'BEIN SPORTS'
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPrompt("أضف القنوات المرفقة في الملف إلى تصنيف beinfhd")}
                className="w-full text-right justify-start text-xs text-gray-500 hover:text-blue-600"
              >
                2. إضافة القنوات المرفقة إلى تصنيف beinfhd
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPrompt("استبدل القنوات الحالية في تصنيف beinfhd بقنوات الملف")}
                className="w-full text-right justify-start text-xs text-gray-500 hover:text-blue-600"
              >
                3. استبدال قنوات تصنيف beinfhd بقنوات الملف
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPrompt("احذف القناة المسماة 'Test Channel'")}
                className="w-full text-right justify-start text-xs text-gray-500 hover:text-blue-600"
              >
                4. حذف قناة معينة بالاسم
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">خطأ: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start gap-4 text-green-700">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-green-600" />
            <div>
              <h4 className="font-bold text-lg mb-1">تمت العملية بنجاح!</h4>
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Action Preview List */}
        {actions && actions.length > 0 && (
          <div className="bg-white shadow rounded-xl p-6 border space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">معاينة العمليات المقترحة ({actions.length})</h3>
                <p className="text-xs text-gray-500 mt-0.5">راجع التعديلات التي سيقوم الذكاء الاصطناعي بتطبيقها.</p>
              </div>
              
              <Button
                onClick={handleApply}
                disabled={executing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    جاري تطبيق التعديلات...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    تأكيد وتطبيق التعديلات
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {actions.map((act, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getActionBadgeColor(act.type)}`}>
                      {getActionLabel(act.type)}
                    </span>
                  </div>

                  <div className="text-sm space-y-1 mt-1">
                    {act.categoryName && (
                      <p className="text-gray-700">
                        <span className="text-gray-400">التصنيف:</span> {act.categoryName}
                      </p>
                    )}
                    {act.linkName && (
                      <p className="text-gray-700">
                        <span className="text-gray-400">اسم القناة:</span> {act.linkName}
                      </p>
                    )}
                    {act.originalUrl && (
                      <p className="text-gray-700 truncate font-mono text-xs">
                        <span className="text-gray-400 font-sans text-sm">الرابط:</span> {act.originalUrl}
                      </p>
                    )}
                    {act.links && act.links.length > 0 && (
                      <div className="bg-white border rounded-lg p-3 mt-1 max-h-32 overflow-y-auto">
                        <span className="text-xs text-gray-400 font-bold block mb-1">القنوات المستوردة ({act.links.length}):</span>
                        {act.links.map((link, lIdx) => (
                          <div key={lIdx} className="text-xs py-1 border-b last:border-0 flex justify-between gap-4">
                            <span className="font-semibold text-gray-700">{link.name}</span>
                            <span className="text-gray-400 truncate max-w-xs">{link.originalUrl}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
