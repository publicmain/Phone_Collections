/**
 * 访问口令配置。
 *
 * 仓库里只存口令的 SHA-256 摘要，不存明文。
 * 要更换口令，运行：  node scripts/set-passcode.mjs <新口令>
 *
 * 注意：更换口令会同时改变云端班级文档的路径（见 cloudSync.ts），
 * 相当于换了一个新的数据空间。换口令前请先用「备份/恢复」导出数据。
 */
export const PASSCODE_HASH =
  '47cb670dc94fbd9edcdb81d3480bf0f6210fa408bb12f93ae5ee453530c60e52';

/** 通过校验后在本机记住多久（毫秒）。默认 180 天。 */
export const REMEMBER_MS = 180 * 24 * 60 * 60 * 1000;

/** localStorage 键名 */
export const ACCESS_STORAGE_KEY = 'phone_mgmt_access_v1';

/** 计算字符串的 SHA-256（十六进制）。浏览器需 HTTPS 或 localhost。 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 由口令派生云端班级文档 ID —— 不知道口令就猜不到数据路径。 */
export async function deriveClassDocId(passcode: string): Promise<string> {
  return 'cls_' + (await sha256Hex('classdoc:' + passcode)).slice(0, 24);
}
