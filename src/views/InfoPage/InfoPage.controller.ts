import { ref } from "vue";
import { Router } from "vue-router";

export class InfoPageController {
  public meetingInfo = ref<MeetingInfo | null>(null);
  public nickname = ref("");
  public meetingPassword = ref("");
  public error = ref("");
  public loading = ref(true);
  public joining = ref(false); // 正在加入会议的状态
  public isMobile = ref(false);
  private router: Router | null = null;
  private windowResizeHandler?: () => void;
  private currentRoomId: string = "";
  private meetStatusChangeHandler?: (data: { meetId: string; status: string; oldStatus: string; timestamp: string; type: string }) => void;

  /**
   * 设置路由器实例
   */
  public setRouter(router: Router) {
    this.router = router;
  }

  /**
   * 初始化页面
   */
  public async init(roomId: string) {
    this.currentRoomId = roomId;
    this.loading.value = true;
    // 检测是否为移动端设备
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    this.isMobile.value = mobileRegex.test(ua) || window.innerWidth <= 768;

    // 监听窗口大小变化
    this.windowResizeHandler = () => {
      const ua = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      this.isMobile.value = mobileRegex.test(ua) || window.innerWidth <= 768;
    };
    window.addEventListener("resize", this.windowResizeHandler);

    // 监听会议状态变更事件
    this.meetStatusChangeHandler = (data: { meetId: string; status: string; oldStatus: string; timestamp: string; type: string }) => {
      // 如果当前页面的会议ID匹配，则重新获取会议信息（静默刷新，不设置loading）
      if (data.meetId === this.currentRoomId) {
        this.fetchMeetingInfo(this.currentRoomId, true);
      }
    };
    if (window.$event) {
      window.$event.on("meetStatusChange", this.meetStatusChangeHandler);
    }

    // 获取会议信息
    await this.fetchMeetingInfo(roomId);
  }

  /**
   * 获取会议信息
   * @param roomId 会议ID
   * @param silent 是否静默刷新（不设置loading），默认为false
   */
  private async fetchMeetingInfo(roomId: string, silent: boolean = false) {
    if (!silent) {
      this.loading.value = true;
    }
    $network.request(
      "meetGetMeetingByMeetId",
      { meetId: roomId },
      (data: any) => {
        const meeting = data;

        if (!meeting) {
          // 会议不存在，显示message弹窗
          if (!silent) {
            $message.error({
              message: "该会议不存在",
            });
          }
          this.error.value = "";
          if (!silent) {
            this.loading.value = false;
          }
          return;
        }

        this.meetingInfo.value = meeting as MeetingInfo;

        // 检查会议状态
        if (meeting.status === "Cancelled" || meeting.status === "Concluded") {
          // 已取消或已结束，显示message弹窗
          if (!silent) {
            $message.error({
              message: meeting.status === "Cancelled" ? "该会议已取消" : "该会议已结束",
            });
          }
          this.error.value = "";
          if (!silent) {
            this.loading.value = false;
          }
          return;
        }

        // 如果是Pending状态，检查是否已到开始时间
        if (meeting.status === "Pending") {
          const startTime = new Date(meeting.startTime);
          const now = new Date();
          if (now >= startTime) {
            // 时间已到，但状态还是Pending，可能需要等待后端更新
            // 这里暂时允许进入
          }
        }

        if (!silent) {
          this.loading.value = false;
        }
      },
      () => {
        // 显示message弹窗
        if (!silent) {
          $message.error({
            message: "会议不存在",
          });
        }
        this.error.value = "";
        if (!silent) {
          this.loading.value = false;
        }
      }
    );
  }

  /**
   * 处理加入会议
   */
  public async handleJoin(roomId: string) {
    // 移动端不允许进入
    if (this.isMobile.value) {
      return;
    }

    // 检查会议状态
    if (!this.meetingInfo.value) {
      $message.error({
        message: "会议信息不存在",
      });
      this.error.value = "";
      return;
    }

    if (this.meetingInfo.value.status === "Pending") {
      $message.error({
        message: "会议尚未开始，无法加入",
      });
      this.error.value = "";
      return;
    }

    if (this.meetingInfo.value.status !== "InProgress") {
      $message.error({
        message: "会议状态异常，无法加入",
      });
      this.error.value = "";
      return;
    }

    // 验证昵称
    if (!this.nickname.value.trim()) {
      $message.error({
        message: "请输入昵称",
      });
      this.error.value = "";
      return;
    }

    // 如果会议被加锁，则需要验证会议密码
    if (this.meetingInfo.value.locked) {
      if (!this.meetingPassword.value.trim()) {
        $message.error({
          message: "请输入会议密码",
        });
        this.error.value = "";
        return;
      }

      // 验证密码
      this.joining.value = true;
      this.error.value = "";

      $network.request(
        "meetVerifyPassword",
        {
          meetId: roomId,
          password: this.meetingPassword.value.trim(),
        },
        async (data: any) => {
          this.joining.value = false;
          if (data.valid) {
            // 密码正确，允许进入
            // 跳转到会议室页面，昵称/密码通过全局变量传递（临时方案，因为不能使用路由参数和本地存储）
            // 将昵称和会议密码保存到 window 对象上，Meet 页面读取后立即清除
            (window as any).__tempNickname = this.nickname.value.trim();
            (window as any).__tempMeetPassword = this.meetingPassword.value.trim();

            // 添加本地存储，标记已通过正常流程进入会议室
            try {
              await $storage.set("meeting-status", "success");
            } catch (error) {
              // 静默处理错误
            }

            if (this.router) {
              this.router.push({
                path: `/${roomId}/meet`,
              });
            }
          } else {
            // 密码错误，显示message弹窗
            $message.error({
              message: "会议密码错误，请重新输入",
            });
            this.meetingPassword.value = "";
            this.error.value = ""; // 清空错误文本
          }
        },
        (error: any) => {
          this.joining.value = false;
          $message.error({
            message: error || "验证密码失败，请重试",
          });
          this.error.value = ""; // 清空错误文本
        }
      );

      return;
    }

    // 会议未加锁，直接进入
    // 跳转到会议室页面，昵称/密码通过全局变量传递（临时方案，因为不能使用路由参数和本地存储）
    // 将昵称和会议密码保存到 window 对象上，Meet 页面读取后立即清除
    (window as any).__tempNickname = this.nickname.value.trim();
    delete (window as any).__tempMeetPassword;

    // 添加本地存储，标记已通过正常流程进入会议室
    try {
      await $storage.set("meeting-status", "success");
    } catch (error) {
      // 静默处理错误
    }

    if (this.router) {
      this.router.push({
        path: `/${roomId}/meet`,
      });
    }
  }

  /**
   * 处理退出会议
   */
  public handleExit() {
    // 弹出确认框，点击确定后关闭标签页
    $popup.alert("确定要退出会议吗？", {
      buttonCount: 2,
      onBtnRight: () => {
        // 先尝试使用 replace 替换当前历史记录，防止返回
        try {
          // 使用 replace 替换当前历史记录，这样用户无法通过后退按钮返回
          if (this.router) {
            // 尝试导航到一个不存在的路由，然后关闭
            this.router
              .replace("/")
              .then(() => {
                // 延迟一下，确保路由已替换
                setTimeout(() => {
                  this.closeTab();
                }, 50);
              })
              .catch(() => {
                // 如果路由替换失败，直接关闭
                this.closeTab();
              });
          } else {
            // 如果没有路由，直接使用 location.replace
            window.location.replace("about:blank");
          }
        } catch (error) {
          // 如果出错，直接关闭
          this.closeTab();
        }
      },
    });
  }

  /**
   * 关闭标签页
   */
  private closeTab() {
    try {
      window.close();
      // 如果 window.close() 没有立即生效，延迟检查并尝试其他方式
      setTimeout(() => {
        // 如果窗口仍然存在，使用 replace 导航到空白页（不会添加到历史记录）
        if (!document.hidden) {
          window.location.replace("about:blank");
        }
      }, 100);
    } catch (error) {
      // 如果无法关闭，使用 replace 导航到空白页（不会添加到历史记录）
      window.location.replace("about:blank");
    }
  }

  /**
   * 清理资源
   */
  public cleanup() {
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
    // 移除会议状态变更监听
    if (this.meetStatusChangeHandler && window.$event) {
      window.$event.off("meetStatusChange", this.meetStatusChangeHandler);
    }
  }
}
