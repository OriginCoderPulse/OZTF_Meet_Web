import { ref } from 'vue';
import { Router } from 'vue-router';

export class InfoPageController {
  public meetingInfo = ref<MeetingInfo | null>(null);
  public nickname = ref('');
  public error = ref('');
  public loading = ref(true);
  public joining = ref(false); // 正在加入会议的状态
  public isMobile = ref(false);
  private router: Router | null = null;
  private windowResizeHandler?: () => void;

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
    this.loading.value = true;
    // 检测是否为移动端设备
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    this.isMobile.value = mobileRegex.test(ua) || (window.innerWidth <= 768);
    
    // 监听窗口大小变化
    this.windowResizeHandler = () => {
      const ua = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      this.isMobile.value = mobileRegex.test(ua) || (window.innerWidth <= 768);
    };
    window.addEventListener('resize', this.windowResizeHandler);

    // 获取会议信息
    await this.fetchMeetingInfo(roomId);
  }

  /**
   * 获取会议信息
   */
  private async fetchMeetingInfo(roomId: string) {
    $network.request(
      "meetGetMeetingByMeetId",
      { meetId: roomId },
      (data: any) => {
        const meeting = data;
        
        if (!meeting) {
          // 会议不存在，只设置错误状态，不弹出alert
          this.error.value = '该会议不存在';
          this.loading.value = false;
          return;
        }

        this.meetingInfo.value = meeting as MeetingInfo;

        // 检查会议状态
        if (meeting.status === 'Cancelled' || meeting.status === 'Concluded') {
          // 已取消或已结束，只设置错误状态，不弹出alert
          this.error.value = meeting.status === 'Cancelled' 
            ? '该会议已取消' 
            : '该会议已结束';
          this.loading.value = false;
          return;
        }

        // 如果是Pending状态，检查是否已到开始时间
        if (meeting.status === 'Pending') {
          const startTime = new Date(meeting.startTime);
          const now = new Date();
          if (now >= startTime) {
            // 时间已到，但状态还是Pending，可能需要等待后端更新
            // 这里暂时允许进入
          }
        }

        this.loading.value = false;
      },
      () => {
        // 只设置错误状态，不弹出alert
        this.error.value = '会议不存在';
        this.loading.value = false;
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
      this.error.value = '会议信息不存在';
      return;
    }

    if (this.meetingInfo.value.status === 'Pending') {
      this.error.value = '会议尚未开始，无法加入';
      return;
    }

    if (this.meetingInfo.value.status !== 'InProgress') {
      this.error.value = '会议状态异常，无法加入';
      return;
    }

    // 验证昵称
    if (!this.nickname.value.trim()) {
      this.error.value = '请输入昵称';
      return;
    }

    // 跳转到会议室页面，昵称通过全局变量传递（临时方案，因为不能使用路由参数和本地存储）
    // 将昵称保存到 window 对象上，Meet 页面读取后立即清除
    (window as any).__tempNickname = this.nickname.value.trim();
    
    // 添加本地存储，标记已通过正常流程进入会议室
    localStorage.setItem('meeting-status', 'success');
    
    if (this.router) {
      this.router.push({
        path: `/${roomId}/meet`
      });
    }
  }

  /**
   * 处理退出会议
   */
  public handleExit() {
    // 弹出确认框，点击确定后关闭标签页
    $popup.alert('确定要退出会议吗？', {
      buttonCount: 2,
      onBtnRight: () => {
      // 先尝试使用 replace 替换当前历史记录，防止返回
      try {
        // 使用 replace 替换当前历史记录，这样用户无法通过后退按钮返回
        if (this.router) {
          // 尝试导航到一个不存在的路由，然后关闭
          this.router.replace('/').then(() => {
            // 延迟一下，确保路由已替换
            setTimeout(() => {
              this.closeTab();
            }, 50);
          }).catch(() => {
            // 如果路由替换失败，直接关闭
            this.closeTab();
          });
        } else {
          // 如果没有路由，直接使用 location.replace
          window.location.replace('about:blank');
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
          window.location.replace('about:blank');
        }
      }, 100);
    } catch (error) {
      // 如果无法关闭，使用 replace 导航到空白页（不会添加到历史记录）
      window.location.replace('about:blank');
    }
  }

  /**
   * 清理资源
   */
  public cleanup() {
    if (this.windowResizeHandler) {
      window.removeEventListener('resize', this.windowResizeHandler);
    }
  }
}
