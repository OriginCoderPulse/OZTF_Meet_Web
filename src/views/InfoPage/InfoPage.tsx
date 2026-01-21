/// <reference path="./InfoPage.d.ts" />

import { defineComponent, onMounted, onUnmounted, Fragment } from "vue";
import { useRoute, useRouter } from "vue-router";
import "./InfoPage.scss";
import { InfoPageController } from "./InfoPage.controller.ts";
import { infoPageConfig } from "./InfoPage.config.ts";

export default defineComponent({
  name: "InfoPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const controller = new InfoPageController();
    const roomId = route.params.roomId as string;

    // 设置路由器实例
    controller.setRouter(router);

    onMounted(() => {
      controller.init(roomId);
    });

    onUnmounted(() => {
      controller.cleanup();
    });

    return () => {
      const { meetingInfo, loading, joining, isMobile, nickname, meetingPassword, error } = controller;

      return (
        <div
          class={`info-page ${!loading.value && !joining.value && meetingInfo.value && isMobile.value ? 'info-page-mobile' : ''} ${!loading.value && !joining.value && (!meetingInfo.value || !isMobile.value) ? 'info-page-pc' : ''}`}
          v-loading={loading.value || joining.value}
        >
          {!loading.value && !joining.value && (
            <>
              {/* 会议信息不存在或已取消/已结束（应该已经弹出提示并退出） */}
              {!meetingInfo.value && (
                <div class="info-container-pc">
                  <h1 class="info-title-pc">会议室信息</h1>
                  <div class="info-error-container">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">{error.value || "会议不存在"}</div>
                  </div>
                </div>
              )}

              {meetingInfo.value && (() => {
                const meeting = meetingInfo.value;
                const isPending = meeting.status === "Pending";
                const isInProgress = meeting.status === "InProgress";

                // 移动端显示
                if (isMobile.value) {
                  return (
                    <div class="info-container-mobile">
                      <h1 class="info-title-mobile">会议室信息</h1>

                      {meeting.topic && (
                        <div class="info-item-mobile">
                          <span class="info-label-mobile">会议主题：</span>
                          <span class="info-value-mobile">{meeting.topic}</span>
                        </div>
                      )}

                      <div class="info-item-mobile">
                        <span class="info-label-mobile">会议ID：</span>
                        <span class="info-value-mobile">{roomId}</span>
                      </div>

                      {meeting.description && (
                        <div class="info-item-mobile">
                          <span class="info-label-mobile">会议说明：</span>
                          <span class="info-value-mobile description-value">{meeting.description}</span>
                        </div>
                      )}

                      <div class="info-item-mobile info-item-last">
                        <span class="info-label-mobile">会议状态：</span>
                        <span class={`info-value-mobile info-status-${meeting.status.toLowerCase()}`}>
                          {infoPageConfig.statusMessages[meeting.status]}
                        </span>
                      </div>

                      <div class="info-mobile-warning">
                        <div class="warning-icon">📱</div>
                        <div class="warning-text">请在PC端加入会议</div>
                        <div class="warning-desc">移动端暂不支持加入会议，请使用电脑浏览器访问</div>
                      </div>
                    </div>
                  );
                }

                // PC端显示
                return (
                  <div class="info-container-pc">
                    <h1 class="info-title-pc">会议室信息</h1>

                    {meeting.topic && (
                      <div class="info-item-pc">
                        <span class="info-label-pc">会议主题：</span>
                        <span class="info-value-pc">{meeting.topic}</span>
                      </div>
                    )}

                    <div class="info-item-pc">
                      <span class="info-label-pc">会议ID：</span>
                      <span class="info-value-pc">{roomId}</span>
                    </div>

                    {meeting.description && (
                      <div class="info-item-pc">
                        <span class="info-label-pc">会议说明：</span>
                        <span class="info-value-pc description-value">{meeting.description}</span>
                      </div>
                    )}

                    <div class="info-item-pc info-item-last">
                      <span class="info-label-pc">会议状态：</span>
                      <span class={`info-value-pc info-status-${meeting.status.toLowerCase()}`}>
                        {infoPageConfig.statusMessages[meeting.status]}
                      </span>
                    </div>

                    {/* 会议未开始，只显示基本信息，不显示输入框和加入按钮 */}
                    {isPending ? (
                      <div class="info-pending-notice">
                        <div class="notice-icon">⏰</div>
                        <div class="notice-text">会议尚未开始，请等待会议开始后再加入</div>
                      </div>
                    ) : isInProgress ? (
                      /* 会议进行中，显示输入框和加入按钮 */
                      <div class="info-form-pc">
                        <div class="form-item-pc">
                          <label class="form-label-pc">请输入您的昵称</label>
                          <input
                            class="form-input-pc"
                            type="text"
                            placeholder="请输入昵称"
                            value={nickname.value}
                            onInput={(e: any) => {
                              nickname.value = e.target.value;
                              error.value = "";
                            }}
                            onKeyup={(e: KeyboardEvent) => {
                              if (e.key === "Enter") {
                                controller.handleJoin(roomId);
                              }
                            }}
                          />
                        </div>

                        {/* 仅在会议被加锁（locked = true）时显示会议密码输入框 */}
                        {meeting.locked && (
                          <div class="form-item-pc">
                            <label class="form-label-pc">请输入会议密码</label>
                            <input
                              class="form-input-pc"
                              type="password"
                              placeholder="请输入会议密码"
                              value={meetingPassword.value}
                              onInput={(e: any) => {
                                meetingPassword.value = e.target.value;
                                error.value = "";
                              }}
                              onKeyup={(e: KeyboardEvent) => {
                                if (e.key === "Enter") {
                                  controller.handleJoin(roomId);
                                }
                              }}
                            />
                          </div>
                        )}

                        {error.value && <div class="form-error-pc">{error.value}</div>}
                        <button class="join-button-pc" onClick={() => controller.handleJoin(roomId)}>
                          进入会议室
                        </button>
                      </div>
                    ) : null}

                    {/* 退出会议按钮 - 只在非进行中状态显示 */}
                    {!isInProgress && (
                      <div class="info-exit-button-container">
                        <button class="exit-button-pc" onClick={() => controller.handleExit()}>
                          退出
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      );
    };
  },
});
