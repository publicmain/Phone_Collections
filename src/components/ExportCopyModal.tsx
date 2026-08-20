import React, { useState } from 'react';
import { Student } from '../types';
import { Copy, Check, Download, FileText, X, FileCheck } from 'lucide-react';

interface ExportCopyModalProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
  onOpenPdfModal?: () => void;
}

export const ExportCopyModal: React.FC<ExportCopyModalProps> = ({
  students,
  isOpen,
  onClose,
  onOpenPdfModal,
}) => {
  const [format, setFormat] = useState<
    'pure-newline' | 'pure-comma' | 'code-name' | 'detail-table' | 'json'
  >('pure-newline');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateContent = () => {
    switch (format) {
      case 'pure-newline':
        return students.map((s) => s.name).join('\n');
      case 'pure-comma':
        return students.map((s) => s.name).join('、');
      case 'code-name':
        return students.map((s) => `${s.code} ${s.name}`).join('\n');
      case 'detail-table':
        return [
          '序号\t姓名\t拼音/英文',
          ...students.map((s) => `${s.code}\t${s.name}\t${s.pinyinOrEn || ''}`),
        ].join('\n');
      case 'json':
        return JSON.stringify(
          students.map(({ code, name, pinyinOrEn, chineseName }) => ({
            code,
            name,
            pinyinOrEn,
            chineseName,
          })),
          null,
          2
        );
      default:
        return '';
    }
  };

  const textContent = generateContent();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `学生花名册_${students.length}人.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const csvHeader = '\uFEFF序号,姓名,拼音或英文\n';
    const csvRows = students
      .map((s) => `"${s.code}","${s.name}","${s.pinyinOrEn || ''}"`)
      .join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `学生名单_手机编号表_${students.length}人.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">导出与一键复制学生姓名</h3>
            <p className="text-xs text-zinc-600">
              已包含新同学【叶文轩】共计 {students.length} 位学生
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-600 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Highlight Banner */}
        <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center justify-center">
              PDF
            </div>
            <div>
              <p className="text-xs font-bold text-red-950">
                A4 横版 PDF（每行 9 人 · 左右各留白 2cm）
              </p>
              <p className="text-[11px] text-red-700">严格符合打印尺寸要求，支持一键下载或打印</p>
            </div>
          </div>
          {onOpenPdfModal && (
            <button
              onClick={() => {
                onClose();
                onOpenPdfModal();
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors shadow-2xs"
            >
              生成此 PDF
            </button>
          )}
        </div>

        {/* Format Selector Tabs */}
        <div className="flex flex-wrap gap-2 my-3">
          <button
            onClick={() => setFormat('pure-newline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              format === 'pure-newline'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            纯姓名（换行）
          </button>
          <button
            onClick={() => setFormat('pure-comma')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              format === 'pure-comma'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            纯姓名（顿号分隔）
          </button>
          <button
            onClick={() => setFormat('code-name')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              format === 'code-name'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            编号 + 姓名
          </button>
          <button
            onClick={() => setFormat('detail-table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              format === 'detail-table'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Excel 制表符格式
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              format === 'json'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            JSON
          </button>
        </div>

        {/* Text Preview Box */}
        <div className="relative my-3">
          <textarea
            readOnly
            value={textContent}
            rows={8}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 font-mono text-xs text-zinc-800 focus:outline-hidden resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              下载 .txt
            </button>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              下载 .csv
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  已复制到剪贴板
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  一键复制全部姓名
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
