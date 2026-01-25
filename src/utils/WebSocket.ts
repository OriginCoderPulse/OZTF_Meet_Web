import { io, Socket } from "socket.io-client";

class WebSocketManager {
    private meetSocket: Socket | null = null;
    private isConnected = false;
    private wsUrl: string;

    constructor() {
        // 从环境变量或配置中获取 WebSocket URL
        this.wsUrl = $config.wsUrl;
    }

    /**
     * 初始化会议 WebSocket 连接
     */
    public initMeetWebSocket() {
        if (this.meetSocket) {
            return;
        }

        // 创建 WebSocket 连接
        this.meetSocket = io(`${this.wsUrl}/meet`, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.meetSocket.on("connect", () => {
            this.isConnected = true;
            // 订阅会议列表更新
            this.meetSocket?.emit("subscribe");
        });

        this.meetSocket.on("subscribed", () => {
            // 订阅成功
        });

        this.meetSocket.on("meetStatusChange", (data: {
            changes?: Array<{ meetId: string; status: string; oldStatus: string }>;
            meetId?: string;
            status?: string;
            oldStatus?: string;
            count?: number;
            timestamp: string;
            type: string;
        }) => {
            // 通过事件总线下发事件
            // 支持批量变更和单个变更两种格式
            if (data.changes && Array.isArray(data.changes)) {
                // 批量变更：为每个变更发送一个事件
                data.changes.forEach((change) => {
                    $event.emit("meetStatusChange", {
                        meetId: change.meetId,
                        status: change.status,
                        oldStatus: change.oldStatus,
                        timestamp: data.timestamp,
                        type: data.type,
                    });
                });
            } else if (data.meetId) {
                // 单个变更（向后兼容）
                $event.emit("meetStatusChange", data);
            }
        });

        this.meetSocket.on("error", () => {
            // WebSocket 错误
        });

        this.meetSocket.on("disconnect", () => {
            this.isConnected = false;
        });
    }

    /**
     * 断开会议 WebSocket 连接
     */
    public disconnectMeetWebSocket() {
        if (this.meetSocket) {
            this.meetSocket.emit("unsubscribe");
            this.meetSocket.disconnect();
            this.meetSocket = null;
            this.isConnected = false;
        }
    }

    /**
     * 获取连接状态
     */
    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    /**
     * 销毁所有连接
     */
    public destroy() {
        this.disconnectMeetWebSocket();
    }
}

// 全局单例实例
let wsManagerInstance: WebSocketManager | null = null;

export default {
    install(app: any) {
        // 创建单例，确保全局只有一个 WebSocketManager 实例
        if (!wsManagerInstance) {
            wsManagerInstance = new WebSocketManager();
            app.config.globalProperties.$ws = wsManagerInstance;
            window.$ws = wsManagerInstance;

            // 应用启动时立即连接 WebSocket（只连接一次）
            wsManagerInstance.initMeetWebSocket();
        } else {
            // 如果已经存在实例，直接使用
            app.config.globalProperties.$ws = wsManagerInstance;
            window.$ws = wsManagerInstance;
        }
    },
};
