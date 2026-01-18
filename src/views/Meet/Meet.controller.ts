import { ref } from "vue";
import { Router } from "vue-router";
import TRTCSDK from "trtc-sdk-v5";
import { generateRandomId } from "@/utils/Meet/IdGenerator";

interface Participant {
  participantId: string; // 内部参与人保留，用于获取姓名；外部参与人可能不存在
  trtcId: string; // TRTC 用户 ID，用于视频流标识
  name: string;
  occupation: string;
  device: string;
  joinTime: string;
  type: "inner" | "out";
}

export class MeetRoomController {
  public showParticipant = ref(false);
  public microphoneState = ref(false);
  public cameraState = ref(false);
  public canOpenMicrophone = ref(false);
  public participantList = ref<Participant[]>([]); // 所有参会人列表（内部和外部）
  public userId = ref<string>("");
  public screenShareState = ref(false);
  public canOpenCamera = ref(false);
  public canOpenScreenShare = ref(true);
  public networkState = ref("unknown");
  public participantNickname = ref<string>("");
  public loading = ref(true); // 加载状态：创建外部参会人和获取参会人列表期间显示加载动画
  private _roomId = ref<number>(0);
  private _meetId = ref<string>("");
  private _trtcId = ref<string>(""); // 当前用户的 TRTC ID
  // 跟踪每个参与人的视频流状态（使用 trtcId 作为 key）
  private _participantVideoStates = ref<Map<string, boolean>>(new Map());
  private router: Router | null = null;

  /**
   * 设置路由器实例
   */
  public setRouter(router: Router) {
    this.router = router;
  }

  /**
   * 初始化会议房间 - 在组件挂载时调用
   */
  public async initRoom(meetId: string, roomId: number) {
    this._roomId.value = roomId;
    this._meetId.value = meetId;

    // 模拟一次用户点击操作，触发浏览器的用户交互检测（用于后续媒体权限请求）
    // 创建一个临时的隐藏按钮并模拟点击
    const tempButton = document.createElement("button");
    tempButton.style.position = "fixed";
    tempButton.style.top = "-9999px";
    tempButton.style.left = "-9999px";
    tempButton.style.width = "1px";
    tempButton.style.height = "1px";
    tempButton.style.opacity = "0";
    tempButton.style.pointerEvents = "none";
    document.body.appendChild(tempButton);
    tempButton.click();
    document.body.removeChild(tempButton);

    // 生成18位随机字母数字作为 userId
    const userId = generateRandomId();
    this.userId.value = userId;
    try {
      // 创建房间并检查权限，传递 userId
      const result = await $trtc.createTRTC(roomId, userId);
      if (result.status) {
        this.canOpenMicrophone.value = result.audio;
        this.canOpenCamera.value = result.video;
        if (!result.audio || !result.video) {
          $message.error({
            message: "麦克风或摄像头权限未授予",
          });
        }
        $trtc
          .joinRoom(roomId)
          .then(async () => {
            try {
              // 检查是否有昵称（从 InfoPage 传递的），如果有则添加外部参会人
              const hasNickname = !!(window as any).__tempNickname;

              if (hasNickname) {
                // 首次进入：添加外部参会人
                this.addOutParticipant(meetId).then(() => {
                  // 稍微延迟一下，确保后端数据已完全保存
                  setTimeout(() => {
                    this.fetchParticipants(meetId).then(() => {
                      const viewIdVideo = `${this.userId.value}_remote_video`;
                      const viewScreen = `meet-video`;
                      this.startRemoteVideoWithRetry(this._roomId.value, this.userId.value, "main", viewIdVideo, 0);
                      this.startRemoteVideoWithRetry(this._roomId.value, this.userId.value, "sub", viewScreen, 0);
                    });
                  }, 200);
                });
              } else {
                // 刷新重进：直接获取参会人列表
                this.fetchParticipants(meetId).then(() => {
                  const viewIdVideo = `${this.userId.value}_remote_video`;
                  const viewScreen = `meet-video`;
                  this.startRemoteVideoWithRetry(this._roomId.value, this.userId.value, "main", viewIdVideo, 0);
                  this.startRemoteVideoWithRetry(this._roomId.value, this.userId.value, "sub", viewScreen, 0);
                });
              }
            } finally {
              // 完成后关闭加载状态
              this.loading.value = false;
            }

            // Web端：TRTC userId 就是 trtcId
            // 对于其他参与人，在 REMOTE_USER_ENTER 事件中建立映射

            $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.NETWORK_QUALITY, () => { });

            // 监听远端音频可用事件 - 当远端用户发布音频时触发
            $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_AUDIO_AVAILABLE, (event) => {
              // 取消静音，开始播放远端音频
              $trtc.muteRemoteAudio(roomId, event.userId, false).catch(() => {
                this.microphoneState.value = false;
              });
            });

            $trtc.listenRoomProperties(
              roomId,
              TRTCSDK.EVENT.REMOTE_VIDEO_AVAILABLE,
              ({ userId, streamType }) => {
                // 忽略自己的视频流
                if (userId === this.userId.value) {
                  return;
                }

                // 使用 TRTC userId 作为 trtcId
                const trtcId = userId;

                if (streamType === TRTCSDK.TYPE.STREAM_TYPE_MAIN) {
                  // 设置该用户的视频流状态为可用（使用 trtcId）
                  this._participantVideoStates.value.set(trtcId, true);
                  // 使用 trtcId 作为 view id，确保与 DOM 中的 id 匹配
                  const viewId = `${trtcId}_remote_video`;
                  const normalizedStreamType = this.normalizeStreamType(streamType);

                  // 尝试启动远端视频，如果 DOM 元素不存在则重试（使用 TRTC userId）
                  this.startRemoteVideoWithRetry(roomId, userId, normalizedStreamType, viewId, 0);
                } else {
                  // 屏幕共享流（STREAM_TYPE_SUB）
                  // 打开屏幕共享后，摄像头继续发流，所以不关闭本地视频流
                  const viewId = `meet-video`;
                  const normalizedStreamType = this.normalizeStreamType(streamType);
                  this.startRemoteVideoWithRetry(roomId, userId, normalizedStreamType, viewId, 0);
                  this.canOpenScreenShare.value = false;
                }
              }
            );

            // 监听远端视频不可用事件 - 当远端用户关闭摄像头时触发
            $trtc.listenRoomProperties(
              roomId,
              TRTCSDK.EVENT.REMOTE_VIDEO_UNAVAILABLE,
              ({ userId, streamType }) => {
                // 忽略自己的视频流
                if (userId === this.userId.value) {
                  return;
                }

                if (streamType === TRTCSDK.TYPE.STREAM_TYPE_SUB) {
                  // 屏幕共享流停止
                  if (this.cameraState.value) {
                    // 如果摄像头状态是开着的：仅关闭屏幕共享流，在主视频页面打开本地视频流，远端的流也要继续发
                    const viewId = `meet-video`;
                    $trtc.openLocalVideo(roomId, viewId).catch(() => {
                      // 静默处理错误
                    });
                  } else {
                    // 如果摄像头状态是关的：主视频窗口什么都不显示，关闭本地视频流，远端视频流，共享屏幕流
                    $trtc.closeLocalVideo(roomId).catch(() => {
                      // 静默处理错误
                    });
                  }
                  this.canOpenScreenShare.value = true;
                } else {
                  // 使用 TRTC userId 作为 trtcId
                  const trtcId = userId;
                  // 设置该用户的视频流状态为不可用（使用 trtcId）
                  this._participantVideoStates.value.set(trtcId, false);
                }
              }
            );

            $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.SCREEN_SHARE_STOPPED, () => {
              // 关闭屏幕共享后
              if (this.cameraState.value) {
                // 如果摄像头状态是开着的：仅关闭屏幕共享流，在主视频页面打开本地视频流，远端的流也要继续发
                const viewId = `meet-video`;
                $trtc.openLocalVideo(roomId, viewId).catch(() => {
                  // 静默处理错误
                });
              } else {
                // 如果摄像头状态是关的：主视频窗口什么都不显示，关闭本地视频流，远端视频流，共享屏幕流
                $trtc.closeLocalVideo(roomId).catch(() => {
                  // 静默处理错误
                });
              }
              this.canOpenScreenShare.value = true;
            });

            // 监听远端用户进入房间事件
            $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_USER_ENTER, (event) => {
              // 忽略自己的事件
              if (event.userId === this.userId.value) {
                return;
              }

              // 取消静音，开始播放远端音频
              $trtc.muteRemoteAudio(roomId, event.userId, false).catch(() => {
                this.microphoneState.value = false;
              });

              // 主动订阅远端用户的视频流（刷新重进后，已存在的用户可能不会触发 REMOTE_VIDEO_AVAILABLE）
              const trtcId = event.userId;
              const viewId = `${trtcId}_remote_video`;
              // 尝试订阅主视频流
              this.startRemoteVideoWithRetry(roomId, event.userId, "main", viewId, 0);

              // 延迟一下再拉取，确保后端数据已更新
              setTimeout(() => {
                const meetId = this._meetId.value;
                if (meetId) {
                  this.fetchParticipants(meetId);
                }
              }, 500);
            });

            $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.CUSTOM_MESSAGE, (event) => {
              switch (event.cmdId) {
                case 1:
                  $popup.alert("会议已结束", {
                    buttonCount: 1,
                    btnOnlyText: "我知道了",
                    onBtnOnly: () => {
                      this.exitAction(roomId);
                    },
                  });
                  break;
                default:
                  break;
              }
            });

            // 监听远端用户离开房间事件 - 清除状态
            $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_USER_EXIT, (event) => {
              // 使用 TRTC userId 作为 trtcId 清除状态
              const trtcId = event.userId;
              this._participantVideoStates.value.delete(trtcId);
              // 延迟一下再拉取，确保后端数据已更新
              setTimeout(() => {
                const meetId = this._meetId.value;
                if (meetId) {
                  this.fetchParticipants(meetId);
                }
              }, 500);
            });
          })
          .catch(() => {
            // Web端退出会议：使用Vue Router导航
            if (this.router) {
              this.router.push("/");
            } else {
              window.location.href = "/";
            }
          });
      }
    } catch (error: any) {
      // Web端退出会议：使用Vue Router导航
      if (this.router) {
        this.router.push("/");
      } else {
        window.location.href = "/";
      }
    }
  }

  /**
   * 将 streamType 转换为有效的字符串格式
   */
  private normalizeStreamType(streamType: any): string {
    if (typeof streamType === "string") {
      // 如果是字符串，检查是否为 'main' 或 'sub'
      return streamType === "sub" ? "sub" : "main";
    }
    // 如果是数字，0 或 falsy 值表示主视频流，其他值表示子视频流
    return streamType === 1 || streamType === "sub" ? "sub" : "main";
  }

  /**
   * 启动远端视频，如果 DOM 元素不存在则重试
   */
  private startRemoteVideoWithRetry(
    roomId: number,
    userId: string,
    streamType: string,
    viewId: string,
    retryCount: number,
    maxRetries: number = 5
  ) {
    // 忽略自己的视频流
    if (userId === this.userId.value) {
      return;
    }

    const element = document.getElementById(viewId);
    if (element) {
      // DOM 元素存在，启动远端视频
      $trtc.muteRemoteVideo(roomId, userId, streamType, viewId).catch((error: any) => {
        // 如果是"用户未发布流"的错误，静默处理（等待用户发布流）
        if (error?.message?.includes("does not publishing stream")) {
          return;
        }
      });
    } else {
      // DOM 元素不存在，延迟重试
      if (retryCount < maxRetries) {
        setTimeout(
          () => {
            this.startRemoteVideoWithRetry(
              roomId,
              userId,
              streamType,
              viewId,
              retryCount + 1,
              maxRetries
            );
          },
          200 * (retryCount + 1)
        ); // 递增延迟：200ms, 400ms, 600ms...
      }
    }
  }

  /**
   * 获取所有参会人（内部和外部）
   */
  public async fetchParticipants(meetId: string) {
    return new Promise<Participant[]>((resolve, reject) => {
      try {
        if (!meetId) {
          resolve([]);
          return;
        }
        $network.request(
          "meetGetRoomProperties",
          { meetId },
          (data: any) => {
            try {
              // 合并内部和外部参会人
              const allParticipants: Participant[] = [
                ...(data.innerParticipants || []),
                ...(data.outParticipants || []),
              ];

              // 过滤掉自己（使用 trtcId 匹配）
              const filteredParticipants = allParticipants.filter((participant) => {
                return participant.trtcId !== this.userId.value;
              });

              // 确保每个参会人都有 name 字段，如果没有则使用默认值
              const participantsWithName = filteredParticipants.map((p) => ({
                ...p,
                name: p.name || "Web用户",
              }));

              // 确保使用新的数组引用，触发响应式更新
              this.participantList.value = [...participantsWithName];
              this.showParticipant.value = filteredParticipants.length > 0;

              resolve(allParticipants);
            } catch (error: any) {
              reject(error);
            }
          },
          (error: any) => {
            reject(error);
          }
        );
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * 切换参与者显示
   */
  public toggleParticipant() {
    this.showParticipant.value = !this.showParticipant.value;
  }

  /**
   * 切换麦克风状态
   */
  public toggleMicrophone() {
    this.microphoneState.value = !this.microphoneState.value;
    if (this.microphoneState.value) {
      $trtc.openLocalAudio(this._roomId.value).catch((error: any) => {
        $message.error({
          message: "开启麦克风失败: " + (error?.message || "未知错误"),
        });
      });
    } else {
      $trtc.closeLocalAudio(this._roomId.value).catch((error: any) => {
        $message.error({
          message: "关闭麦克风失败: " + (error?.message || "未知错误"),
        });
      });
    }
  }

  /**
   * 切换摄像头状态
   */
  public toggleCamera(view: string) {
    this.cameraState.value = !this.cameraState.value;
    if (this.cameraState.value) {
      // 使用 nextTick 确保 DOM 已更新
      setTimeout(() => {
        $trtc.openLocalVideo(this._roomId.value, view).catch((error: any) => {
          $message.error({
            message: "开启摄像头失败: " + (error?.message || "未知错误"),
          });
          // 如果失败，恢复状态
          this.cameraState.value = false;
        });
      }, 0);
    } else {
      // 关闭摄像头时，停止摄像头发流并关闭本地视频
      // 屏幕共享流是独立的，不会受到影响
      $trtc.closeLocalVideo(this._roomId.value).catch((error: any) => {
        $message.error({
          message: "关闭摄像头失败: " + (error?.message || "未知错误"),
        });
      });
    }
  }

  /**
   * 启动远端屏幕共享
   */
  public startRemoteScreen() {
    $trtc
      .startRemoteScreen(this._roomId.value)
      .then(() => {
        this.screenShareState.value = true;
      })
      .catch(() => { });
  }

  /**
   * 停止远端屏幕共享
   */
  public stopRemoteScreen() {
    $trtc
      .stopRemoteScreen(this._roomId.value)
      .then(() => {
        this.screenShareState.value = false;
      })
      .catch(() => { });
  }

  /**
   * 添加外部参会人
   */
  private async addOutParticipant(meetId: string) {
    // 从 window 对象获取昵称（InfoPage 传递的临时值）
    const nickname = (window as any).__tempNickname || "Web用户";
    // 立即清除，避免泄露
    delete (window as any).__tempNickname;

    // Web 端：TRTC userId 就是 trtcId
    const trtcId = this.userId.value;

    // 获取设备信息
    const ua = navigator.userAgent;
    let os = "Unknown";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    let browser = "Unknown";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Opera")) browser = "Opera";
    const device = `${os} - ${browser}`;
    const joinTime = new Date().toISOString();

    // 保存 trtcId 以便退出时使用
    this._trtcId.value = trtcId;

    // 调用添加外部参会人接口
    return new Promise<void>((resolve, reject) => {
      $network.request(
        "meetAddOutParticipant",
        {
          meetId,
          trtcId: trtcId,
          participantInfo: JSON.stringify({
            name: nickname,
            device: device,
            joinTime: joinTime,
          }),
        },
        () => {
          resolve();
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  /**
   * 删除外部参会人
   */
  private async removeOutParticipant(meetId: string, trtcId: string) {
    if (!meetId || !trtcId) {
      return;
    }

    $network.request(
      "meetRemoveOutParticipant",
      {
        meetId,
        trtcId,
      },
      () => { },
      () => { }
    );
  }

  private exitAction = async (roomId: number) => {
    // Web端：删除外部参会人
    if (this._meetId.value && this._trtcId.value) {
      await this.removeOutParticipant(this._meetId.value, this._trtcId.value);
    }

    $trtc
      .exitRoom(roomId)
      .then(() => {
        // 删除本地存储，退出会议时清除
        localStorage.removeItem("meeting-status");

        // Web端退出会议：返回上一页
        if (this.router) {
          this.router.go(-1);
        } else {
          window.history.back();
        }
      })
      .catch(() => {
        $message.error({
          message: "退出房间失败，请重试",
        });
      });
  };

  /**
   * 退出会议
   */
  public exitMeeting(roomId: number) {
    $popup.alert("确定要退出会议吗", {
      buttonCount: 2,
      onBtnRight: () => this.exitAction(roomId),
    });
  }

  /**
   * 获取参与人的视频流状态（使用 trtcId）
   */
  public getParticipantVideoState(trtcId: string): boolean {
    return this._participantVideoStates.value.get(trtcId) ?? false;
  }

  /**
   * 执行退出流程（用于页面关闭前）
   */
  public handlePageUnload() {
    // 删除外部参会人（使用 fetch keepalive 确保请求能发送）
    if (this._meetId.value && this._trtcId.value) {
      try {
        const urlConfig = (window as any).$config?.urls?.meetRemoveOutParticipant;
        if (urlConfig) {
          const baseURL = import.meta.env.VITE_API_BASE_URL || "";
          const url = `${baseURL}/${urlConfig.path.join("/")}`;
          // 使用 fetch 的 keepalive 选项，确保请求在页面关闭后也能发送
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meetId: this._meetId.value,
              trtcId: this._trtcId.value,
            }),
            keepalive: true, // 关键：即使页面关闭也会发送请求
          }).catch(() => {
            // 静默处理错误
          });
        }
      } catch (error) {
        // 静默处理错误
      }
    }

    // 退出 TRTC 房间
    if (this._roomId.value) {
      try {
        $trtc.exitRoom(this._roomId.value).catch(() => { });
      } catch (error) {
        // 静默处理错误
      }
    }

    // 删除本地存储
    try {
      localStorage.removeItem("meeting-status");
    } catch (error) {
      // 静默处理错误
    }
  }

  /**
   * 清理资源（组件卸载时调用）
   */
  public async cleanup(meetId: string) {
    // Web端：删除外部参会人
    if (meetId && this._trtcId.value) {
      await this.removeOutParticipant(meetId, this._trtcId.value);
    }
  }
}
