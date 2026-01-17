/**
 * 简单的字符串哈希函数，将字符串转换为数字
 * @param str 输入字符串
 * @returns 哈希值（数字）
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }
  return Math.abs(hash);
}

class RoomFormat {
  /**
   * 将 roomId（格式：xxx-xxxx-xxxx）转换为数字类型
   * TRTC SDK 要求 roomId 必须在 1 到 4294967294 之间
   * @param roomId 字符串格式的 roomId，如 "123-4567-8901"
   * @returns 数字类型的 roomId（在有效范围内）
   */
  roomIdToNumber(roomId: string | number): number {
    if (typeof roomId === 'number') {
      // 验证数字是否在有效范围内
      if (roomId < 1 || roomId > 4294967294) {
        throw new Error(`Invalid roomId: ${roomId} is out of range [1, 4294967294]`);
      }
      return Math.floor(roomId); // 确保是整数
    }

    if (!roomId || typeof roomId !== 'string') {
      throw new Error('Invalid roomId: must be a string or number');
    }

    // 移除所有横线
    const cleanRoomId = roomId.replace(/-/g, '');

    // 验证格式（应该是 11 位数字）
    if (!/^\d{11}$/.test(cleanRoomId)) {
      throw new Error(`Invalid roomId format: ${roomId}. Expected format: xxx-xxxx-xxxx (11 digits)`);
    }

    // 直接转换为数字可能会超出范围，使用哈希函数映射到有效范围
    // 使用哈希确保相同的 roomId 总是映射到相同的数字
    const hash = hashString(cleanRoomId);

    // 映射到有效范围 [1, 4294967294]
    // 使用模运算确保在范围内，+1 确保最小值为 1
    const numericId = (hash % 4294967293) + 1;

    return numericId;
  }

  /**
   * 将数字类型的 roomId 转换为字符串格式（xxx-xxxx-xxxx）
   * @param numericRoomId 数字类型的 roomId
   * @returns 字符串格式的 roomId
   */
  numberToRoomId(numericRoomId: number): string {
    const str = numericRoomId.toString();

    // 如果长度不足，前面补0
    const padded = str.padStart(11, '0');

    // 格式化为 xxx-xxxx-xxxx
    return `${padded.slice(0, 3)}-${padded.slice(3, 7)}-${padded.slice(7, 11)}`;
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$roomformat = new RoomFormat();
    window.$roomformat = new RoomFormat();
  },
};
