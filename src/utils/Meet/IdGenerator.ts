/**
 * 生成18位随机字母数字ID
 * 格式：时间戳后8位 + 10位随机字符
 */
export function generateRandomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const timestamp = Date.now().toString().slice(-8);
  id += timestamp;
  for (let i = id.length; i < 18; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
