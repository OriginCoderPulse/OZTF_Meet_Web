import TRTCSDK, { TRTCEventTypes } from "trtc-sdk-v5";
import { generateRandomId } from "./IdGenerator";

class TRTC {
  private _sdkAppId: number = Number(import.meta.env.VITE_TRTC_APP_ID);
  private _userId: string = "";
  private _userSig: string = "";
  private _rooms: Map<number, TRTCSDK> = new Map();
  private _initialized: boolean = false;
  private _userInteractionHappened: boolean = false;

  constructor() {
    // 监听用户交互，解决 AudioContext 问题
    this._setupUserInteractionListener();
  }

  /**
   * 设置用户交互监听器，解决 AudioContext 自动开始问题
   */
  private _setupUserInteractionListener() {
    const events = ["click", "touchstart", "keydown"];
    const handler = () => {
      this._userInteractionHappened = true;
      events.forEach((event) => {
        document.removeEventListener(event, handler);
      });
    };
    events.forEach((event) => {
      document.addEventListener(event, handler, { once: true });
    });
  }

  /**
   * 懒加载初始化，只在第一次使用时调用
   * 如果传入了新的 userId，会更新内部 userId 并重新获取 userSig
   */
  private ensureInitialized(userId?: string) {
    return new Promise<void>((resolve, reject) => {
      // 如果传入了新的 userId 且与当前不同，更新 userId 并重新获取 userSig
      if (userId && userId !== this._userId) {
        this._userId = userId;
        // 如果已经初始化过，需要重新获取 userSig
        if (this._initialized) {
          this._fetchUserSigFromBackend(userId)
            .then(() => resolve())
            .catch(reject);
          return;
        }
      }

      if (this._initialized) {
        resolve();
        return;
      }

      // 如果还没有用户交互，等待用户交互
      if (!this._userInteractionHappened) {
        const checkInteraction = () => {
          if (this._userInteractionHappened) {
            this._doInitialize(userId).then(resolve).catch(reject);
          } else {
            setTimeout(checkInteraction, 100);
          }
        };
        checkInteraction();
        return;
      }

      this._doInitialize(userId).then(resolve).catch(reject);
    });
  }

  /**
   * 执行初始化
   */
  private _doInitialize(userId?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let finalUserId = userId || this._userId;
      // 如果 userId 仍然为空，生成一个临时的 userId
      if (!finalUserId || finalUserId.trim() === "") {
        finalUserId = generateRandomId();
      }
      this._userId = finalUserId;

      // 从后端获取 UserSig
      this._fetchUserSigFromBackend(finalUserId)
        .then(() => {
          this._initialized = true;
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * 从后端获取 UserSig（必须成功，失败则不允许进入房间）
   */
  private _fetchUserSigFromBackend(userId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      $network.request(
        "meetGenerateUserSig",
        { userId },
        (data: any) => {
          if (data.sdkAppId) {
            this._sdkAppId = data.sdkAppId;
          }
          if (data.userSig) {
            this._userSig = data.userSig;
            resolve();
          } else {
            reject(new Error("后端返回的 UserSig 为空，无法进入房间"));
          }
        },
        (error: any) => {
          reject(new Error(`无法从后端获取 UserSig，无法进入房间: ${error}`));
        }
      );
    });
  }

  /**
   * 检查媒体设备是否可用
   */
  private checkMediaDevicesSupport(): boolean {
    return (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices !== undefined &&
      navigator.mediaDevices.getUserMedia !== undefined
    );
  }

  /**
   * 实际请求媒体设备权限
   */
  private async requestMediaPermissions(): Promise<{ audio: boolean; video: boolean }> {
    if (!this.checkMediaDevicesSupport()) {
      return { audio: false, video: false };
    }

    try {
      // 请求音频和视频权限
      // 在 Windows 上，需要明确的权限请求，使用更详细的配置
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
      });

      // 获取权限状态
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      const audioGranted = audioTracks.length > 0 && audioTracks[0].readyState === "live";
      const videoGranted = videoTracks.length > 0 && videoTracks[0].readyState === "live";

      // 不立即停止流，保持权限状态
      // 注意：这里不停止流，让 TRTC SDK 在需要时使用
      // 如果后续不需要这个流，可以在 joinRoom 后再处理

      return { audio: audioGranted, video: videoGranted };
    } catch (error: any) {
      // 如果用户拒绝权限，返回 false
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        return { audio: false, video: false };
      }
      // 其他错误（如设备不存在）也返回 false
      return { audio: false, video: false };
    }
  }

  createTRTC(
    roomId: number,
    userId?: string
  ): Promise<{ audio: boolean; video: boolean; status: boolean }> {
    return this.ensureInitialized(userId).then(async () => {
      return new Promise<{ audio: boolean; video: boolean; status: boolean }>(
        async (resolve, reject) => {
          if (!this._initialized || !this._userSig) {
            reject(new Error("TRTC 未初始化"));
            return;
          }

          // 如果传入了新的 userId 且与当前不同，更新 userId 并重新获取 userSig
          if (userId && userId !== this._userId) {
            this._userId = userId;
            // 从后端获取新的 UserSig
            try {
              await this._fetchUserSigFromBackend(userId);
            } catch (error) {
              reject(new Error("Failed to get UserSig from backend"));
              return;
            }
          }

          try {
            const room = TRTCSDK.create();
            this._rooms.set(roomId, room);

            // 实际请求权限
            const permissions = await this.requestMediaPermissions();
            resolve({
              audio: permissions.audio,
              video: permissions.video,
              status: true,
            });
          } catch (error: any) {
            resolve({ audio: false, video: false, status: false });
          }
        }
      );
    });
  }

  joinRoom(roomId: number): Promise<void> {
    return this.ensureInitialized().then(() => {
      return this._joinRoomInternal(roomId);
    });
  }

  closeRoom(roomId: number) {
    this._rooms.delete(roomId);
  }

  /**
   * 检查房间是否存在
   */
  hasRoom(roomId: number): boolean {
    return this._rooms.has(roomId);
  }

  exitRoom(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.exitRoom().then(() => {
      room.destroy();
      this._rooms.delete(roomId);
    }) as Promise<void>;
  }

  openLocalAudio(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.startLocalAudio({
      option: {
        profile: "high-stereo",
      },
    }) as Promise<void>;
  }

  closeLocalAudio(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.stopLocalAudio() as Promise<void>;
  }

  openLocalVideo(roomId: number, view: string): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }

    // 检查 DOM 元素是否存在
    const element = document.getElementById(view) || document.querySelector(`.${view}`);
    if (!element) {
      return Promise.reject(new Error(`View element '${view}' not found in document`));
    }

    return room.startLocalVideo({ view }) as Promise<void>;
  }

  closeLocalVideo(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.stopLocalVideo() as Promise<void>;
  }

  /**
   * 控制远端音频的播放/停止（静音/取消静音）
   * @param roomId 房间ID
   * @param userId 远端用户ID
   * @param mute 是否静音，true=静音（停止播放），false=取消静音（播放）
   */
  muteRemoteAudio(roomId: number, userId: string, mute: boolean): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.muteRemoteAudio(userId, mute) as Promise<void>;
  }

  /**
   * 启动远端视频
   * @param roomId 房间ID
   * @param userId 远端用户ID
   * @param streamType 流类型，'main' 或 'sub'
   * @param view 视频容器元素ID
   */
  muteRemoteVideo(
    roomId: number,
    userId: string,
    streamType: string | number,
    view: string
  ): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    // 确保 streamType 是字符串格式
    let normalizedStreamType: string;
    if (typeof streamType === "string") {
      normalizedStreamType = streamType === "sub" ? "sub" : "main";
    } else {
      normalizedStreamType = streamType === 1 ? "sub" : "main";
    }
    return room.startRemoteVideo({
      userId,
      streamType: normalizedStreamType as any,
      view,
    }) as Promise<void>;
  }

  startRemoteScreen(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.startScreenShare({
      option: {
        profile: {
          width: 1920,
          height: 1080,
          frameRate: 60,
          bitrate: 10000,
        },
        fillMode: "cover",
      },
    }) as Promise<void>;
  }

  stopRemoteScreen(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    return room.stopScreenShare() as Promise<void>;
  }

  listenRoomProperties(
    roomId: number,
    event: keyof TRTCEventTypes,
    callback: (event: any, room: TRTCSDK) => void
  ) {
    this._rooms.get(roomId)?.on(event, ((...args: any[]) => {
      callback(args[0], this._rooms.get(roomId) as TRTCSDK);
    }) as any);
  }

  private _joinRoomInternal(roomId: number): Promise<void> {
    const room = this._rooms.get(roomId);
    if (!room) {
      return Promise.reject(new Error(`Room ${roomId} does not exist`));
    }
    // 确保 userId 和 userSig 匹配
    return room.enterRoom({
      sdkAppId: this._sdkAppId,
      userId: this._userId,
      userSig: this._userSig,
      roomId,
    }) as Promise<void>;
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$trtc = new TRTC();
    window.$trtc = new TRTC();
  },
};
