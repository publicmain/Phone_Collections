import React, { useState } from 'react';
import { Student } from '../types';
import { Printer, ArrowLeft, LayoutGrid, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface PrintableViewProps {
  students: Student[];
  onBack: () => void;
}

export const PrintableView: React.FC<PrintableViewProps> = ({ students, onBack }) => {
  const [layoutMode, setLayoutMode] = useState<'landscape-9' | 'portrait-3'>('landscape-9');
  const [isExporting, setIsExporting] = useState(false);

  // Dynamic layout controls
  const [boxHeightCm, setBoxHeightCm] = useState<number>(1.3);
  const [boxWidthCm, setBoxWidthCm] = useState<number>(2.6);
  const [colGapPx, setColGapPx] = useState<number>(10);
  const [rowGapPx, setRowGapPx] = useState<number>(16);
  const [fontSizePx, setFontSizePx] = useState<number>(12);

  const handlePrint = () => {
    window.print();
  };

  // Chunk students into rows of 9 for landscape mode
  const landscapeRows: Student[][] = [];
  for (let i = 0; i < students.length; i += 9) {
    landscapeRows.push(students.slice(i, i + 9));
  }

  const handleDownloadPdf = async () => {
    const el = document.getElementById('printable-document');
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const isLandscape = layoutMode === 'landscape-9';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      if (isLandscape) {
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`学生姓名表_${isLandscape ? 'A4横向每行9人' : 'A4竖向三列'}_${students.length}人.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-200/80 py-6 px-4 print:p-0 print:bg-white">
      {/* Print CSS styles injected for page layout */}
      <style>{`
        @page {
          size: ${layoutMode === 'landscape-9' ? 'A4 landscape' : 'A4 portrait'};
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #printable-document {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding-left: 20mm !important;
            padding-right: 20mm !important;
            width: ${layoutMode === 'landscape-9' ? '297mm' : '210mm'} !important;
            min-height: ${layoutMode === 'landscape-9' ? '210mm' : '297mm'} !important;
          }
        }
      `}</style>

      {/* Top Controller Bar */}
      <div className="max-w-6xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-sm border border-zinc-300 print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-950 px-3 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回管理系统
          </button>

          {/* Layout Switcher */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setLayoutMode('landscape-9')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layoutMode === 'landscape-9'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              A4 横向 · 每行9人 (左右留白2cm)
            </button>
            <button
              onClick={() => setLayoutMode('portrait-3')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layoutMode === 'portrait-3'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              A4 纵向 · 原版3列
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              {isExporting ? '生成中...' : '下载 A4 PDF 文件'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              立即打印
            </button>
          </div>
        </div>

        {/* Dynamic Sizing Controls for Landscape Mode */}
        {layoutMode === 'landscape-9' && (
          <div className="pt-2 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-200 text-[11px]">
            {/* Box Height */}
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
            </div>

            {/* Box Width (Length) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>📐 姓名框宽度(长度)</span>
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
            </div>

            {/* Column Gap (Anchored to Box 1) */}
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
            </div>

            {/* Row Gap */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>↕️ 行间距 (纵向)</span>
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
            </div>

            {/* Font Size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-700 font-medium">
                <span>🔤 文字大小</span>
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
            </div>
          </div>
        )}
      </div>

      {/* Main A4 Document Sheet */}
      {layoutMode === 'landscape-9' ? (
        /* A4 LANDSCAPE (297mm x 210mm) with EXACT 2cm Left/Right margins */
        <div className="flex justify-center overflow-x-auto">
          <div
            id="printable-document"
            style={{
              width: '1122px', // 297mm @ 96DPI
              minHeight: '793px', // 210mm @ 96DPI
              paddingLeft: '75.6px', // 20mm = 2cm
              paddingRight: '75.6px', // 20mm = 2cm
              paddingTop: '36px',
              paddingBottom: '36px',
              boxSizing: 'border-box',
            }}
            className="bg-white shadow-xl border border-zinc-300 flex flex-col justify-between text-black select-none print:shadow-none print:border-none"
          >
            {/* Header */}
            <div className="text-center pb-2.5 border-b-2 border-black">
              <h1 className="text-2xl font-black tracking-wider text-black font-sans">
                学生姓名表 · 手机存放编号
              </h1>
              <div className="flex items-center justify-between text-xs text-zinc-600 mt-1">
                <span>班级总人数：{students.length} 人</span>
                <span className="font-semibold text-zinc-800">
                  A4 横版打印 · 每行 9 人 · 左右各留白 2.0 cm · 框高 {boxHeightCm}cm · 宽 {boxWidthCm}cm
                </span>
                <span>生成日期：{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            {/* Rows of 9 names with left-anchored layout and dynamic gaps */}
            <div
              className="my-4 flex flex-col"
              style={{ gap: `${rowGapPx}px` }}
            >
              {landscapeRows.map((rowStudents, rIdx) => (
                <div key={rIdx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 px-1 font-mono">
                    <span>
                      第 {rIdx + 1} 行 ({rIdx * 9 + 1} ~{' '}
                      {Math.min((rIdx + 1) * 9, students.length)})
                    </span>
                    <span>{rowStudents.length} 人 · 框高 {boxHeightCm}cm · 宽 {boxWidthCm}cm · 间距 {colGapPx}px</span>
                  </div>

                  <div
                    className="flex flex-row items-center justify-start"
                    style={{ columnGap: `${colGapPx}px` }}
                  >
                    {rowStudents.map((st) => {
                      const heightPx = boxHeightCm * 37.795;
                      const widthPx = boxWidthCm * 37.795;
                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-center gap-1.5 px-1 border border-zinc-600 rounded-xs bg-zinc-50/70 text-center shrink-0"
                          style={{
                            width: `${widthPx}px`,
                            height: `${heightPx}px`,
                            minHeight: `${heightPx}px`,
                            maxHeight: `${heightPx}px`,
                            boxSizing: 'border-box',
                          }}
                        >
                          <span
                            className="font-mono font-bold px-1 rounded bg-zinc-800 text-white shrink-0 inline-flex items-center justify-center leading-normal"
                            style={{ fontSize: `${Math.max(9, fontSizePx - 2)}px` }}
                          >
                            {st.code}
                          </span>
                          <span
                            className="font-bold tracking-tight text-zinc-950 leading-normal whitespace-nowrap"
                            style={{
                              fontSize: `${st.name.length > 4 ? Math.max(9, fontSizePx - 1) : fontSizePx}px`,
                            }}
                          >
                            {st.name}
                          </span>
                        </div>
                      );
                    })}

                    {/* Fill remaining spaces in last row */}
                    {rowStudents.length < 9 &&
                      Array.from({ length: 9 - rowStudents.length }).map((_, eIdx) => {
                        const heightPx = boxHeightCm * 37.795;
                        const widthPx = boxWidthCm * 37.795;
                        return (
                          <div
                            key={`empty-${eIdx}`}
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
                              {rIdx * 9 + rowStudents.length + eIdx + 1}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Clean empty blank space in between */}
            <div className="flex-1 min-h-[40px]" />

            {/* Footer */}
            <div className="pt-2 border-t border-zinc-300 flex items-center justify-between text-[11px] text-zinc-500 font-sans shrink-0">
              <span>上课前放入对应编号格位 · 下课后按编号取回</span>
              <span>横向标准 A4 排版 (297mm × 210mm) · 框高 {boxHeightCm}cm · 每行 9 人</span>
              <span>第 1 页 / 共 1 页</span>
            </div>
          </div>
        </div>
      ) : (
        /* A4 PORTRAIT 3-column layout matching original */
        <div className="flex justify-center overflow-x-auto">
          <div
            id="printable-document"
            style={{
              width: '793px', // 210mm @ 96DPI
              minHeight: '1122px', // 297mm @ 96DPI
              paddingLeft: '75.6px', // 20mm = 2cm
              paddingRight: '75.6px', // 20mm = 2cm
              paddingTop: '40px',
              paddingBottom: '40px',
              boxSizing: 'border-box',
            }}
            className="bg-white shadow-xl border border-zinc-300 rounded-sm print:p-0 print:shadow-none print:border-none flex flex-col justify-between"
          >
            <div>
              <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-black text-black tracking-wide mb-1.5 font-sans">
                  手机存放编号表
                </h1>
                <p className="text-xs text-zinc-700 font-medium">
                  Phone Storage Number List · 请按自己的编号，将手机放入手机箱对应号位
                </p>
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-2 my-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center border border-zinc-400 rounded-lg overflow-hidden px-2.5 py-1.5 bg-white"
                  >
                    <span className="font-mono font-bold text-sm text-zinc-900 w-8 shrink-0">
                      {student.code}
                    </span>
                    <span className="border-r border-zinc-300 h-4 mr-2 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-zinc-950 text-xs tracking-tight truncate">
                        {student.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-zinc-300 text-center text-xs text-zinc-600">
              上课前放入 · 放完对一眼号码 · 放错位置请自行调整 · 下课后按编号取回
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
