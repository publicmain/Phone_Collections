import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
  Users,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { AppBackupData } from '../types';
import {
  createBackupData,
  downloadBackupJsonFile,
  parseAndValidateBackup,
  restoreFromBackupData,
  clearAllRecords,
  getDemoSeedRecords,
  saveInspectionRecords,
} from '../utils/storage';
import { batchSyncRecordsToCloud, syncClassDataToCloud } from '../utils/cloudSync';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  
  // Export state
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const currentBackup = createBackupData();

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<AppBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  // Reset state
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle download
  const handleExport = () => {
    downloadBackupJsonFile();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setPreviewData(null);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseAndValidateBackup(content);
      if (result.valid && result.data) {
        setPreviewData(result.data);
      } else {
        setParseError(result.error || '文件解析失败，请确保是有效的备份 JSON 文件。');
      }
    };
    reader.onerror = () => {
      setParseError('读取文件失败，请重试。');
    };
    reader.readAsText(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Execute restore
  const handleConfirmRestore = () => {
    if (!previewData) return;
    setIsRestoring(true);

    setTimeout(async () => {
      const result = restoreFromBackupData(previewData, restoreMode);
      setIsRestoring(false);
      if (result.success) {
        // Also sync to Cloud Firestore
        if (previewData.data.records) {
          batchSyncRecordsToCloud(previewData.data.records).catch(console.error);
        }
        if (previewData.data.students) {
          syncClassDataToCloud(previewData.data.className, previewData.data.students).catch(console.error);
        }

        setRestoreSuccessMsg(result.message);
        onDataRestored();
        setTimeout(() => {
          setRestoreSuccessMsg(null);
        }, 4000);
      } else {
        setParseError(result.message);
      }
    }, 300);
  };

  // Reset to initial demo records
  const handleResetDemoData = () => {
    clearAllRecords();
    const seeds = getDemoSeedRecords();
    saveInspectionRecords(seeds);
    batchSyncRecordsToCloud(seeds).catch(console.error);
    setResetSuccess(true);
    onDataRestored();
    setTimeout(() => {
      setResetSuccess(false);
      setResetConfirmText('');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">数据安全备份与一键恢复</h3>
              <p className="text-xs text-zinc-500">方案3：JSON 全量数据导入/导出，防丢换机无忧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-1.5 bg-zinc-100/80 border-b border-zinc-200 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('export');
              setRestoreSuccessMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'export'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>导出完整备份</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setRestoreSuccessMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'import'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>导入文件恢复</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('reset');
              setRestoreSuccessMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'reset'
                ? 'bg-white text-zinc-800 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>恢复初始演示</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    当前系统数据概况
                  </span>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    本地安全沙盒
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="text-[11px] text-zinc-500">班级名称</div>
                    <div className="text-sm font-bold text-zinc-900 truncate">
                      {currentBackup.className}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="text-[11px] text-zinc-500">学生花名册</div>
                    <div className="text-sm font-bold text-zinc-900">
                      {currentBackup.studentsCount} 人
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="text-[11px] text-zinc-500">历史点验流水</div>
                    <div className="text-sm font-bold text-blue-600">
                      {currentBackup.recordsCount} 条记录
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
                <p className="font-semibold text-zinc-800">💡 备份说明：</p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-600">
                  <li>导出的 <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 font-mono text-[11px]">.json</code> 文件包含<strong>学生名单配置</strong>与<strong>每一次点验的未交明细与日期时间</strong>。</li>
                  <li>建议每周五或月末点击一次导出，存到电脑、微信收藏或网盘中，防止误删浏览器缓存。</li>
                  <li>如果以后更换手机或电脑，只需导入此文件即可瞬间完整还原。</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExport}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                      <span>备份文件已成功下载！</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>立即导出并下载备份文件 (.json)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 hover:border-blue-500 bg-zinc-50/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <FileJson className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-zinc-800">
                  {selectedFile ? selectedFile.name : '点击选择备份文件，或将 .json 文件拖拽至此'}
                </div>
                <p className="text-xs text-zinc-500">
                  支持本系统导出的完整备份 JSON 文件
                </p>
              </div>

              {/* Error Message */}
              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Success Message */}
              {restoreSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{restoreSuccessMsg}</span>
                </div>
              )}

              {/* Preview Card */}
              {previewData && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                    <span>备份文件解析成功：</span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      版本 v{previewData.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] block">目标班级</span>
                      <span className="font-bold text-zinc-900 truncate block">
                        {previewData.className}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] block">包含学生</span>
                      <span className="font-bold text-zinc-900 block">
                        {previewData.studentsCount} 人
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                      <span className="text-zinc-500 text-[10px] block">包含点验记录</span>
                      <span className="font-bold text-blue-600 block">
                        {previewData.recordsCount} 条
                      </span>
                    </div>
                  </div>

                  {/* Mode Select */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-zinc-700 block">恢复模式选择：</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('overwrite')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          restoreMode === 'overwrite'
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <div>🔄 覆盖还原（推荐）</div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                          在新手机/新电脑上完全还原备份中的状态
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          restoreMode === 'merge'
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <div>➕ 合并导入</div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                          将备份记录与现有记录合并去重
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmRestore}
                    disabled={isRestoring}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isRestoring ? (
                      <span>正在恢复数据...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>确认执行恢复 ({restoreMode === 'overwrite' ? '覆盖还原' : '合并导入'})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESET DEMO DATA */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>重置为系统出厂演示数据说明</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  此操作将清空当前所有自定义点验流水，并重新载入包含 34 位同学最近 5 个教学日的出厂演示流水记录。
                </p>
              </div>

              {resetSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold">
                  🎉 已成功重置为初始演示数据！
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-600">
                      如确定重置，请在下方输入 <span className="font-mono font-bold text-zinc-900">重置</span> 确认：
                    </label>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="输入 重置 确认"
                      className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    onClick={handleResetDemoData}
                    disabled={resetConfirmText !== '重置'}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>确认重置为初始演示数据</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
          <span>文件格式：标准 JSON 数据包</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg font-semibold transition-colors shadow-2xs"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
