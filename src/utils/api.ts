// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://oztf.site/oztf/api/v1';

/**
 * 添加外部参会人
 * 前端生成 18 位唯一 ID，传递给后端
 */
export async function addOutParticipant(meetId: string, participantId: string, participantInfo: {
    name: string;
    device: string;
    joinTime: string;
}): Promise<string> {
    try {
        const response = await fetch(`${API_BASE_URL}/meet/add-out-participant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                meetId,
                participantId, // 传递前端生成的 participantId
                participantInfo: JSON.stringify(participantInfo)
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.meta?.code !== '1024-S200') {
            throw new Error(result.meta?.message || '添加参会人失败');
        }

        // 返回 participantId（与传入的相同）
        return participantId;
    } catch (error: any) {
        console.error('添加外部参会人失败:', error);
        throw error;
    }
}

/**
 * 删除外部参会人
 * 根据 participantId 删除
 */
export async function removeOutParticipant(meetId: string, participantId: string): Promise<void> {
    try {
        if (!participantId) {
            console.warn('删除外部参会人失败: participantId 为空');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/meet/remove-out-participant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                meetId,
                participantId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.meta?.code !== '1024-S200') {
            throw new Error(result.meta?.message || '删除参会人失败');
        }
    } catch (error: any) {
        console.error('删除外部参会人失败:', error);
        // 不抛出错误，避免影响退出流程
    }
}

/**
 * 获取会议的所有参会人（内部和外部）
 */
export async function getMeetingParticipants(meetId: string): Promise<{
    innerParticipants: Array<{
        participantId: string;
        name: string;
        occupation: string;
        device: string;
        joinTime: string;
        type: 'inner';
    }>;
    outParticipants: Array<{
        participantId: string;
        name: string;
        occupation: string;
        device: string;
        joinTime: string;
        type: 'out';
    }>;
    totalCount: number;
} | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/meet/get-meeting-participants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                meetId
            })
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        if (result.meta?.code === '1024-S200' && result.data) {
            return result.data;
        }
        return null;
    } catch (error: any) {
        console.error('获取参会人列表失败:', error);
        return null;
    }
}

/**
 * 获取会议信息
 */
export async function getMeetingInfo(meetId: string): Promise<{
    meetId: string;
    topic: string;
    status: string;
    startTime: string;
    duration: number;
} | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/meet/get-meeting-by-meetid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                meetId
            })
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        if (result.meta?.code === '1024-S200' && result.data) {
            return result.data;
        }
        return null;
    } catch (error: any) {
        console.error('获取会议信息失败:', error);
        return null;
    }
}

/**
 * 检测是否为移动端设备
 */
export function isMobileDevice(): boolean {
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(ua) || (window.innerWidth <= 768);
}

/**
 * 获取设备信息
 */
export function getDeviceInfo(): string {
    const ua = navigator.userAgent;

    // 检测操作系统
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // 检测浏览器
    let browser = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';

    return `${os} - ${browser}`;
}

/**
 * 生成 18 位唯一 ID（数字字母组合）
 */
export function generateParticipantId(): string {
    // 使用时间戳 + 随机字符生成 18 位 ID
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    // 使用时间戳的后 8 位（确保唯一性）
    const timestamp = Date.now().toString(36).slice(-8);
    result += timestamp;

    // 补充随机字符到 18 位
    for (let i = result.length; i < 18; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}
