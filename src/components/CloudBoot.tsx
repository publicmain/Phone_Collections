import React, { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { initClassDocId } from '../utils/cloudSync';

interface Props {
  passcode: string;
  children: React.ReactNode;
}

/**
 * 在渲染主界面之前，先用口令确定云端数据路径（并完成一次性迁移）。
 * 否则子组件可能抢先按默认路径读写，导致数据落在错误的位置。
 */
export function CloudBoot({ passcode, children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initClassDocId(passcode).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [passcode]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="w-6 h-6 animate-spin" />
        <p className="text-xs">正在连接云端数据…</p>
      </div>
    );
  }

  return <>{children}</>;
}
