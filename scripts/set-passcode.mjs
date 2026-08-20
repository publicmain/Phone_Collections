#!/usr/bin/env node
/**
 * 更换访问口令：  node scripts/set-passcode.mjs <新口令>
 *
 * 只把口令的 SHA-256 摘要写进 src/config/access.ts，明文不入库。
 * 改完记得 git commit && git push —— GitHub Actions 会自动重新部署。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const passcode = process.argv[2];
if (!passcode || passcode.length < 6) {
  console.error('用法: node scripts/set-passcode.mjs <新口令>   （至少 6 位）');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/config/access.ts');

const hash = createHash('sha256').update(passcode).digest('hex');
const classId =
  'cls_' + createHash('sha256').update('classdoc:' + passcode).digest('hex').slice(0, 24);

const src = readFileSync(target, 'utf8');
const next = src.replace(
  /export const PASSCODE_HASH =\s*\n?\s*'[0-9a-f]{64}';/,
  `export const PASSCODE_HASH =\n  '${hash}';`,
);

if (next === src) {
  console.error('没找到 PASSCODE_HASH，请检查 src/config/access.ts 是否被改动过。');
  process.exit(1);
}

writeFileSync(target, next, 'utf8');
console.log('已更新 src/config/access.ts');
console.log('  口令      :', passcode);
console.log('  云端班级ID:', classId);
console.log('\n提醒：换口令等于换云端数据路径，旧数据不会自动搬过去。');
console.log('      请先在旧口令下用「备份/恢复」导出，再用新口令导入。');
