import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  Download,
  Printer,
  X,
  FileText,
  Check,
  Settings2,
  Sparkles,
  Eye,
  Sliders,
  ZoomIn,
} from 'lucide-react';

interface A4LandscapePdfModalProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
}

export const A4LandscapePdfModal: React.FC<A4LandscapePdfModalProps> = ({
  students,
  isOpen,
  onClose,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Customization options
  const [title, setTitle] = useState('学生姓名表');
  const [subtitle, setSubtitle] = useState('横版 A4 · 每行 9 人 · 左右各空 2cm');
  const [showCode, setShowCode] = useState(true);
  const [showPinyin, setShowPinyin] = useState(false);
  const [cellStyle, setCellStyle] = useState<'grid' | 'cards' | 'clean'>('grid');
  
  // Dynamic customizable box size & spacing controls
  const [boxHeightCm, setBoxHeightCm] = useState<number>(1.3); // 0.8cm ~ 2.5cm
  const [boxWidthCm, setBoxWidthCm] = useState<number>(2.6); // 1.5cm ~ 3.5cm
  const [colGapPx, setColGapPx] = useState<number>(10); // 0px ~ 30px (left-anchored spacing)
  const [rowGapPx, setRowGapPx] = useState<number>(16); // 4px ~ 36px
  const [fontSizePx, setFontSizePx] = useState<number>(12); // 9px ~ 18px
  const [showRowLabel, setShowRowLabel] = useState<boolean>(true);
  const [borderWidth, setBorderWidth] = useState<number>(1); // 1px ~ 3px
  const [borderRadiusPx, setBorderRadiusPx] = useState<number>(4); // 0px ~ 16px

  if (!isOpen) return null;

  // Chunk students into rows of 9
  const rows: Student[][] = [];
  for (let i = 0; i < students.length; i += 9) {
    rows.push(students.slice(i, i + 9));
  }

  // Generate PDF file using html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) return;
    setIsGenerating(true);

    try {
      // 1. Capture the element with html2canvas at high resolution (scale 3)
      const element = printSheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // 2. Create A4 Landscape jsPDF document (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // A4 landscape width = 297mm, height = 210mm
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

      // 3. Save PDF
      pdf.save(`学生姓名表_A4横版_每行9人_${students.length}人.pdf`);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('生成 PDF 遇到问题，您可以点击“直接打印”选择保存为 PDF。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-100 rounded-2xl max-w-6xl w-full shadow-2xl border border-zinc-300 flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-white px-5 py-3.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              PDF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900">
                  A4 横版 PDF 生成器 (每行 9 个名字 · 左右各留白 2cm)
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  共 {students.length} 人
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                标准 A4 尺寸 (297mm × 210mm) · 左边距 20mm · 右边距 20mm · 每行 9 人
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              title="调用浏览器原生打印 (可选择保存为PDF)"
            >
              <Printer className="w-4 h-4 text-zinc-600" />
              直接打印 (A4横向)
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                isSuccess
                  ? 'bg-emerald-600'
                  : isGenerating
                  ? 'bg-zinc-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 active:scale-95'
              }`}
            >
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  PDF 已成功下载！
                </>
              ) : isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在生成高清 A4 PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  生成并下载 A4 PDF
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl ml-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-white border-b border-zinc-200 px-5 py-3 text-xs shrink-0 space-y-2.5">
          {/* Top Options Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-700">标题：</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-2 py-1 bg-zinc-50 border border-zinc-300 rounded-lg text-xs w-28 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-700">表格样式：</span>
                <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => setCellStyle('grid')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      cellStyle === 'grid' ? 'bg-white shadow-2xs text-zinc-900 font-bold' : 'text-zinc-600'
                    }`}
                  >
                    经典网格
                  </button>
                  <button
                    onClick={() => setCellStyle('cards')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      cellStyle === 'cards' ? 'bg-white shadow-2xs text-zinc-900 font-bold' : 'text-zinc-600'
                    }`}
                  >
                    圆角卡片
                  </button>
                  <button
                    onClick={() => setCellStyle('clean')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      cellStyle === 'clean' ? 'bg-white shadow-2xs text-zinc-900 font-bold' : 'text-zinc-600'
                    }`}
                  >
                    极简下划线
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCode}
                  onChange={(e) => setShowCode(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-zinc-700">显示序号徽标</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPinyin}
                  onChange={(e) => setShowPinyin(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-zinc-700">显示拼音/英文</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRowLabel}
                  onChange={(e) => setShowRowLabel(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-zinc-700">显示行号标题</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBoxHeightCm(1.3);
                  setBoxWidthCm(2.6);
                  setColGapPx(10);
                  setRowGapPx(16);
                  setFontSizePx(12);
                  setBorderRadiusPx(4);
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 underline font-medium"
              >
                重置默认尺寸
              </button>
            </div>
          </div>

          {/* Sizing & Spacing Interactive Sliders */}
          <div className="pt-2 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-200/80 text-[11px]">
            {/* 1. Box Height Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>📏 姓名框高度</span>
                <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                  {boxHeightCm.toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={boxHeightCm}
                onChange={(e) => setBoxHeightCm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0.8cm</span>
                <span>标准 1.3cm</span>
                <span>2.5cm</span>
              </div>
            </div>

            {/* 2. Box Width / Length Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>📐 姓名框长度(宽度)</span>
                <span className="font-mono font-bold text-zinc-900 bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                  {boxWidthCm.toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="3.5"
                step="0.1"
                value={boxWidthCm}
                onChange={(e) => setBoxWidthCm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-800"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>1.5cm</span>
                <span>推荐 2.6cm</span>
                <span>3.5cm</span>
              </div>
            </div>

            {/* 3. Horizontal Col Gap Slider (Anchored to Box 1) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span title="以第1个姓名框为左对齐固定基准，其余姓名框随间距滑动">↔️ 间距 (固定首框基准)</span>
                <span className="font-mono font-bold text-zinc-900 bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                  {colGapPx} px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={colGapPx}
                onChange={(e) => setColGapPx(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-800"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0px (紧贴)</span>
                <span>10px</span>
                <span>30px (宽松)</span>
              </div>
            </div>

            {/* 4. Vertical Row Gap Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>↕️ 行间距 (上下留白)</span>
                <span className="font-mono font-bold text-zinc-900 bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                  {rowGapPx} px
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="36"
                step="2"
                value={rowGapPx}
                onChange={(e) => setRowGapPx(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-800"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>紧凑 4px</span>
                <span>16px</span>
                <span>宽松 36px</span>
              </div>
            </div>

            {/* 5. Font Size Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>🔤 姓名文字大小</span>
                <span className="font-mono font-bold text-zinc-900 bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                  {fontSizePx} px
                </span>
              </div>
              <input
                type="range"
                min="9"
                max="18"
                step="1"
                value={fontSizePx}
                onChange={(e) => setFontSizePx(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-800"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>9px</span>
                <span>标准 12px</span>
                <span>18px</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Container */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-zinc-200/70">
          {/* A4 Landscape Paper Container (Aspect Ratio: 297 / 210 = 1.414) */}
          <div
            id="pdf-print-area"
            ref={printSheetRef}
            style={{
              width: '1122px', // Standard 96DPI approx for 297mm width
              minHeight: '793px', // Standard 96DPI approx for 210mm height
              height: '793px',
              paddingLeft: '75.6px', // 20mm = 2cm = 75.6px at 96DPI
              paddingRight: '75.6px', // 20mm = 2cm = 75.6px at 96DPI
              paddingTop: '32px',
              paddingBottom: '32px',
              boxSizing: 'border-box',
            }}
            className="bg-white shadow-xl flex flex-col justify-between select-none relative text-black print:shadow-none print:m-0"
          >
            {/* 2cm Left and Right Guideline indicator for user visual inspection */}
            <div className="absolute left-0 top-0 bottom-0 w-[75.6px] border-r border-dashed border-red-200 pointer-events-none flex items-center justify-center opacity-40">
              <span className="text-[10px] text-red-500 -rotate-90 whitespace-nowrap font-mono">
                ← 2cm 边距 →
              </span>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[75.6px] border-l border-dashed border-red-200 pointer-events-none flex items-center justify-center opacity-40">
              <span className="text-[10px] text-red-500 90 whitespace-nowrap font-mono">
                ← 2cm 边距 →
              </span>
            </div>

            {/* Document Header */}
            <div className="text-center pb-3 border-b-2 border-zinc-900 shrink-0">
              <h1 className="text-2xl font-black tracking-wider text-black font-sans">
                {title}
              </h1>
              <div className="flex items-center justify-between text-xs text-zinc-600 mt-1 px-1">
                <span>班级总人数：{students.length} 人</span>
                <span className="font-medium">{subtitle}</span>
                <span>生成日期：{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            {/* 9 Items Per Row Layout Area */}
            <div
              className="my-4 flex flex-col"
              style={{ gap: `${rowGapPx}px` }}
            >
              {rows.map((rowStudents, rowIdx) => (
                <div key={rowIdx} className="space-y-1">
                  {/* Row Label */}
                  {showRowLabel && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 px-1 font-mono">
                      <span>
                        第 {rowIdx + 1} 行 ({rowIdx * 9 + 1} ~{' '}
                        {Math.min((rowIdx + 1) * 9, students.length)})
                      </span>
                      <span>{rowStudents.length} 人 · 框高 {boxHeightCm}cm · 宽 {boxWidthCm}cm · 间距 {colGapPx}px</span>
                    </div>
                  )}

                  {/* Left-anchored Row of Items (Anchored at 1st item, expanding rightwards) */}
                  <div
                    className="flex flex-row items-center justify-start"
                    style={{ columnGap: `${colGapPx}px` }}
                  >
                    {rowStudents.map((student) => {
                      const heightPx = boxHeightCm * 37.795; // 1cm = 37.795px at 96DPI
                      const widthPx = boxWidthCm * 37.795;
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-center gap-1.5 px-1 text-center shrink-0 transition-all ${
                            cellStyle === 'grid'
                              ? 'border border-zinc-600 bg-zinc-50/70 rounded-xs'
                              : cellStyle === 'cards'
                              ? 'border border-zinc-300 shadow-2xs bg-white rounded-md'
                              : 'border-b border-zinc-500 bg-transparent'
                          }`}
                          style={{
                            width: `${widthPx}px`,
                            height: `${heightPx}px`,
                            minHeight: `${heightPx}px`,
                            maxHeight: `${heightPx}px`,
                            boxSizing: 'border-box',
                          }}
                        >
                          {/* Number badge */}
                          {showCode && (
                            <span
                              className="font-mono font-bold px-1 rounded bg-zinc-800 text-white shrink-0 inline-flex items-center justify-center leading-normal"
                              style={{ fontSize: `${Math.max(9, fontSizePx - 2)}px` }}
                            >
                              {student.code}
                            </span>
                          )}

                          {/* Student Name */}
                          <span
                            className="font-bold tracking-tight text-zinc-950 leading-normal whitespace-nowrap"
                            style={{
                              fontSize: `${student.name.length > 4 ? Math.max(9, fontSizePx - 1) : fontSizePx}px`,
                            }}
                          >
                            {student.name}
                          </span>

                          {/* Pinyin or English */}
                          {showPinyin && student.pinyinOrEn && student.pinyinOrEn !== student.name && (
                            <span
                              className="text-zinc-500 font-mono whitespace-nowrap shrink-0 leading-normal"
                              style={{ fontSize: `${Math.max(8, fontSizePx - 3)}px` }}
                            >
                              ({student.pinyinOrEn})
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Fill remaining empty cells in last row if < 9 to keep exact 9 column structure */}
                    {rowStudents.length < 9 &&
                      Array.from({ length: 9 - rowStudents.length }).map((_, emptyIdx) => {
                        const heightPx = boxHeightCm * 37.795;
                        const widthPx = boxWidthCm * 37.795;
                        return (
                          <div
                            key={`empty-${emptyIdx}`}
                            className="border border-dashed border-zinc-200 rounded-xs flex items-center justify-center px-1 opacity-30 shrink-0"
                            style={{
                              width: `${widthPx}px`,
                              height: `${heightPx}px`,
                              minHeight: `${heightPx}px`,
                              maxHeight: `${heightPx}px`,
                              boxSizing: 'border-box',
                            }}
                          >
                            <span className="text-[10px] text-zinc-300 font-mono leading-normal">
                              {rowIdx * 9 + rowStudents.length + emptyIdx + 1}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Clean empty blank space in between rows and footer */}
            <div className="flex-1 min-h-[40px]" />

            {/* Document Footer */}
            <div className="pt-2 border-t border-zinc-300 flex items-center justify-between text-[11px] text-zinc-500 font-sans shrink-0">
              <span>备注：上课前手机放入对应编号格位 · 下课后按编号取回</span>
              <span>A4 横向打印排版 · 框高 {boxHeightCm}cm · 宽 {boxWidthCm}cm · 每行 9 人 · 左右页边距 2.0 cm</span>
              <span>第 1 页 / 共 1 页</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Tips */}
        <div className="bg-white px-5 py-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              已为您自动按 <strong>每行 9 人</strong> 划分，全班共 {students.length} 人，第 1 个姓名框固定左对齐（距左边缘 2cm），其余框向右按间距精准延伸。
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="font-bold text-red-600 hover:text-red-700 underline"
            >
              点击立即下载 A4 PDF 文件 (.pdf)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
