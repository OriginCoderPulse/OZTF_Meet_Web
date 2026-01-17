import { ref } from "vue";
import { Router } from "vue-router";
import TRTCSDK from "trtc-sdk-v5";
import { generateRandomId } from "@/utils/Meet/IdGenerator";

interface Participant {
  participantId: string;
  name: string;
  occupation: string;
  device: string;
  joinTime: string;
  type: 'inner' | 'out';
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
  private _participantId = ref<string>(""); // 当前用户的外部参会人ID
  // 跟踪每个参与人的视频流状态（使用 participantId 作为 key）
  private _participantVideoStates = ref<Map<string, boolean>>(new Map());
  // TRTC userId 到 participantId 的映射（TRTC userId -> participantId）
  private _trtcUserIdToParticipantId = ref<Map<string, string>>(new Map());
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
    const tempButton = document.createElement('button');
    tempButton.style.position = 'fixed';
    tempButton.style.top = '-9999px';
    tempButton.style.left = '-9999px';
    tempButton.style.width = '1px';
    tempButton.style.height = '1px';
    tempButton.style.opacity = '0';
    tempButton.style.pointerEvents = 'none';
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
        $trtc.joinRoom(roomId).then(async () => {
          try {
            // 检查是否有昵称（从 InfoPage 传递的），如果有则添加外部参会人
            const hasNickname = !!(window as any).__tempNickname;

            if (hasNickname) {
              // 首次进入：添加外部参会人
              await this.addOutParticipant(meetId);

              // 稍微延迟一下，确保后端数据已完全保存
              await new Promise(resolve => setTimeout(resolve, 200));
            }

            // 获取所有参会人（内部和外部）
            await this.fetchParticipants(meetId);
          } finally {
            // 完成后关闭加载状态
            this.loading.value = false;
          }


          // 建立 TRTC userId 到 participantId 的映射
          // Web端：使用 userId 作为 participantId
          this._trtcUserIdToParticipantId.value.set(this.userId.value, this.userId.value);
          // 对于其他参与人，在 REMOTE_USER_ENTER 事件中建立映射

          $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.NETWORK_QUALITY, () => {
          });

          // 监听远端音频可用事件 - 当远端用户发布音频时触发
          $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_AUDIO_AVAILABLE, (event) => {
            // 取消静音，开始播放远端音频
            $trtc.muteRemoteAudio(roomId, event.userId, false).catch(() => {
              this.microphoneState.value = false;
            });
          });

          $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
            // 忽略自己的视频流
            if (userId === this.userId.value) {
              return;
            }

            // 查找对应的 participantId（如果映射不存在，使用 userId 作为 fallback）
            const participantId = this._trtcUserIdToParticipantId.value.get(userId) || userId;

            if (streamType === TRTCSDK.TYPE.STREAM_TYPE_MAIN) {
              // 设置该用户的视频流状态为可用（使用 participantId）
              this._participantVideoStates.value.set(participantId, true);
              // 使用 participantId 作为 view id，确保与 DOM 中的 id 匹配
              const viewId = `${participantId}_remote_video`;
              const normalizedStreamType = this.normalizeStreamType(streamType);

              // 尝试启动远端视频，如果 DOM 元素不存在则重试（使用 TRTC userId）
              this.startRemoteVideoWithRetry(roomId, userId, normalizedStreamType, viewId, 0);
            } else {
              $trtc.closeLocalVideo(roomId)
              const viewId = `meet-video`;
              const normalizedStreamType = this.normalizeStreamType(streamType);
              this.startRemoteVideoWithRetry(roomId, userId, normalizedStreamType, viewId, 0);
              this.canOpenScreenShare.value = false;
            }
          });

          // 监听远端视频不可用事件 - 当远端用户关闭摄像头时触发
          $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_VIDEO_UNAVAILABLE, ({ userId, streamType }) => {
            // 忽略自己的视频流
            if (userId === this.userId.value) {
              return;
            }

            if (streamType === TRTCSDK.TYPE.STREAM_TYPE_SUB) {
              const viewId = `meet-video`;
              $trtc.openLocalVideo(roomId, viewId);
              this.canOpenScreenShare.value = true;
            } else {
              // 查找对应的 participantId（如果映射不存在，使用 userId 作为 fallback）
              const participantId = this._trtcUserIdToParticipantId.value.get(userId) || userId;
              // 设置该用户的视频流状态为不可用（使用 participantId）
              this._participantVideoStates.value.set(participantId, false);
            }
          });

          $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.SCREEN_SHARE_STOPPED, () => {
            const viewId = `meet-video`;
            $trtc.openLocalVideo(roomId, viewId);
            this.canOpenScreenShare.value = true;
          })

          // 监听远端用户进入房间事件
          $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.REMOTE_USER_ENTER, (event) => {
            // 取消静音，开始播放远端音频
            $trtc.muteRemoteAudio(roomId, event.userId, false).catch(() => {
              this.microphoneState.value = false;
            });

            // 延迟一下再拉取，确保后端数据已更新
            setTimeout(() => {
              const meetId = this._meetId.value;
              if (meetId) {
                this.fetchParticipants(meetId).then(() => {
                  // 拉取参会人列表后，建立 TRTC userId 到 participantId 的映射
                  this.buildTrtcUserIdMapping(event.userId);
                }).catch(() => {
                });
              }
            }, 500);
          });

           $trtc.listenRoomProperties(roomId, TRTCSDK.EVENT.CUSTOM_MESSAGE, (event) => {
             switch(event.cmdId) {
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
            // 查找对应的 participantId 并清除状态
            const participantId = this._trtcUserIdToParticipantId.value.get(event.userId) || event.userId;
            this._participantVideoStates.value.delete(participantId);
            this._trtcUserIdToParticipantId.value.delete(event.userId);
            // 延迟一下再拉取，确保后端数据已更新
            setTimeout(() => {
              const meetId = this._meetId.value;
              if (meetId) {
                this.fetchParticipants(meetId).catch(() => {
                });
              }
            }, 500);
          });
        }).catch(() => {
          // Web端退出会议：使用Vue Router导航
          if (this.router) {
            this.router.push('/');
          } else {
            window.location.href = '/';
          }
        });
      }
    } catch (error: any) {
      // Web端退出会议：使用Vue Router导航
      if (this.router) {
        this.router.push('/');
      } else {
        window.location.href = '/';
      }
    }
  }

  /**
   * 将 streamType 转换为有效的字符串格式
   */
  private normalizeStreamType(streamType: any): string {
    if (typeof streamType === 'string') {
      // 如果是字符串，检查是否为 'main' 或 'sub'
      return streamType === 'sub' ? 'sub' : 'main';
    }
    // 如果是数字，0 或 falsy 值表示主视频流，其他值表示子视频流
    return streamType === 1 || streamType === 'sub' ? 'sub' : 'main';
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
        if (error?.message?.includes('does not publishing stream')) {
          return;
        }
      });
    } else {
      // DOM 元素不存在，延迟重试
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.startRemoteVideoWithRetry(roomId, userId, streamType, viewId, retryCount + 1, maxRetries);
        }, 200 * (retryCount + 1)); // 递增延迟：200ms, 400ms, 600ms...
      }
    }
  }


  /**
   * 获取所有参会人（内部和外部）
   */
  public async fetchParticipants(meetId: string) {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!meetId) {
          resolve();
          return;
        }
        $network.request(
          "meetGetParticipants",
          { meetId },
          (data: any) => {
            try {
              // 如果还没有设置 participantId，尝试找到最近添加的外部参会人作为自己的 participantId
              if (!this._participantId.value && data.outParticipants && data.outParticipants.length > 0) {
                // 找到最近添加的外部参会人（根据 joinTime 排序）
                const sortedOutParticipants = [...data.outParticipants].sort((a, b) => {
                  const timeA = new Date(a.joinTime).getTime();
                  const timeB = new Date(b.joinTime).getTime();
                  return timeB - timeA; // 降序，最新的在前
                });
                // 使用最近添加的外部参会人作为自己的 participantId
                this._participantId.value = sortedOutParticipants[0].participantId;
              }

              // 合并内部和外部参会人
              const allParticipants: Participant[] = [
                ...(data.innerParticipants || []),
                ...(data.outParticipants || [])
              ];

              // 过滤掉自己（使用 participantId 或 userId 匹配）
              const filteredParticipants = allParticipants.filter(participant => {
                return participant.participantId !== this._participantId.value &&
                  participant.participantId !== this.userId.value;
              });

              // 确保每个参会人都有 name 字段，如果没有则使用默认值
              const participantsWithName = filteredParticipants.map(p => ({
                ...p,
                name: p.name || 'Web用户'
              }));

              // 确保使用新的数组引用，触发响应式更新
              this.participantList.value = [...participantsWithName];
              this.showParticipant.value = filteredParticipants.length > 0;

              // 重新建立 TRTC userId 到 participantId 的映射
              this.buildTrtcUserIdMapping();

              resolve();
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
   * 建立 TRTC userId 到 participantId 的映射
   */
  private buildTrtcUserIdMapping(trtcUserId?: string) {
    // 遍历参会人列表，建立映射关系
    this.participantList.value.forEach(participant => {
      // 如果提供了 trtcUserId，只建立该用户的映射
      if (trtcUserId) {
        // 尝试匹配：TRTC userId 可能是数据库 ID 或生成的字符串
        // 对于内部参与人，participantId 是数据库 ID
        // 对于外部参与人，participantId 是生成的字符串
        if (participant.participantId === trtcUserId) {
          this._trtcUserIdToParticipantId.value.set(trtcUserId, participant.participantId);
        }
      } else {
        // 如果没有提供 trtcUserId，为所有参与人建立映射
        // 对于内部参与人，TRTC userId 应该等于 participantId（数据库 ID）
        if (participant.type === 'inner') {
          this._trtcUserIdToParticipantId.value.set(participant.participantId, participant.participantId);
        }
        // 对于外部参与人，需要等待 REMOTE_USER_ENTER 事件来建立映射
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
    }
    else {
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
    $trtc.startRemoteScreen(this._roomId.value).then(() => {
      this.screenShareState.value = true;
    }).catch(() => {
    });
  }

  /**
   * 停止远端屏幕共享
   */
  public stopRemoteScreen() {
    $trtc.stopRemoteScreen(this._roomId.value).then(() => {
      this.screenShareState.value = false;
    }).catch(() => {
    });
  }

  /**
   * 添加外部参会人
   */
  private async addOutParticipant(meetId: string) {
    // 从 window 对象获取昵称（InfoPage 传递的临时值）
    const nickname = (window as any).__tempNickname || 'Web用户';
    // 立即清除，避免泄露
    delete (window as any).__tempNickname;

    // 生成18位随机字母数字作为 participantId
    const participantId = generateRandomId();

    // 获取设备信息
    const ua = navigator.userAgent;
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    let browser = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';
    const device = `${os} - ${browser}`;
    const joinTime = new Date().toISOString();

    // 保存 participantId 以便退出时使用
    this._participantId.value = participantId;

    // 调用添加外部参会人接口
    return new Promise<void>((resolve, reject) => {
      $network.request(
        "meetAddOutParticipant",
        {
          meetId,
          participantId,
          participantInfo: JSON.stringify({
            name: nickname,
            device: device,
            joinTime: joinTime
          })
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
  private async removeOutParticipant(meetId: string, participantId: string) {
    if (!meetId || !participantId) {
      return;
    }

    $network.request(
      "meetRemoveOutParticipant",
      {
        meetId,
        participantId
      },
      () => {
      },
      () => {
      }
    );
  }

  private exitAction = async (roomId: number) => {
    // Web端：删除外部参会人
    if (this._meetId.value && this._participantId.value) {
      await this.removeOutParticipant(this._meetId.value, this._participantId.value);
    }

    $trtc.exitRoom(roomId).then(() => {
      // Web端退出会议：返回上一页
      if (this.router) {
        this.router.go(-1);
      } else {
        window.history.back();
      }
    }).catch(() => {
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
   * 获取参与人的视频流状态
   */
  public getParticipantVideoState(participantId: string): boolean {
    return this._participantVideoStates.value.get(participantId) ?? false;
  }

  /**
   * 清理资源（组件卸载时调用）
   */
  public async cleanup(meetId: string) {
    // Web端：删除外部参会人
    if (meetId && this._participantId.value) {
      await this.removeOutParticipant(meetId, this._participantId.value);
    }
  }
}
