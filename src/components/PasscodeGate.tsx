import React, { useEffect, useState } from 'react';
import { Lock, LoaderCircle } from 'lucide-react';
import {
  PASSCODE_HASH,
  REMEMBER_MS,
  ACCESS_STORAGE_KEY,
  sha256Hex,
} from '../config/access';

interface StoredAccess {
  hash: string;
  passcode: string;
  grantedAt: number;
}

function readStoredAccess(): StoredAccess | null {
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAccess;
    if (parsed.hash !== PASSCODE_HASH) return null;
    if (Date.now() - parsed.grantedAt > REMEMBER_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStoredAccess() {
  try {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface Props {
  /** 校验通过后渲染的内容；参数为明文口令（用于派生云端数据路径）。 */
  children: (passcode: string) => React.ReactNode;
}

export function PasscodeGate({ children }: Props) {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredAccess();
    if (stored) setPasscode(stored.passcode);
    setReady(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = input.trim();
    if (!candidate) return;

    setChecking(true);
    setError('');
    try {
      const hash = await sha256Hex(candidate);
      if (hash !== PASSCODE_HASH) {
        setError('口令不正确，请向管理老师确认。');
        setInput('');
        return;
      }
      localStorage.setItem(
        ACCESS_STORAGE_KEY,
        JSON.stringify({ hash, passcode: candidate, grantedAt: Date.now() }),
      );
      setPasscode(candidate);
    } catch {
      setError('校验失败：请确认使用 https:// 打开本页面。');
    } finally {
      setChecking(false);
    }
  };

  // 避免刷新时先闪一下口令框
  if (!ready) return null;

  if (passcode) return <>{children(passcode)}</>;

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center px-4 py-10 antialiased">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-base font-bold text-slate-900">
            学生手机定点存放管理系统
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            本系统含学生实名信息，仅限任课与管理老师使用。
            <br />
            请输入访问口令。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="访问口令"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />

          {error && (
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
          )}

          <button
            type="submit"
            disabled={checking || !input.trim()}
            className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            {checking && <LoaderCircle className="w-4 h-4 animate-spin" />}
            进入系统
          </button>
        </form>

        <p className="text-[11px] text-slate-400 mt-5 leading-relaxed text-center">
          验证通过后本机将记住 180 天，无需重复输入。
        </p>
      </div>
    </div>
  );
}
