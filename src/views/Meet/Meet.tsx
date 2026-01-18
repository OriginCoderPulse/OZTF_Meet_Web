/// <reference path="./Meet.d.ts" />

import { defineComponent, Fragment, onMounted, onUnmounted } from "vue";
import "./Meet.scss";
import { Motion } from "motion-v";
import Svg from "@/components/Svg/Svg.tsx";
import { MeetRoomController } from "./Meet.controller.ts";
import { useRoute, useRouter } from "vue-router";
import { meetRoomConfig } from "./Meet.config.ts";

export default defineComponent({
  name: "MeetRoom",
  setup() {
    const controller = new MeetRoomController();
    const route = useRoute();
    const router = useRouter();

    // 设置路由器实例
    controller.setRouter(router);
    let meetId: string = "";

    // 使用标记来区分刷新和关闭
    let isRefreshing = false;

    // 监听页面显示事件，检测是否是刷新后的恢复
    const handlePageShow = (event: PageTransitionEvent) => {
      // 如果是从缓存恢复（刷新），设置标记
      if (event.persisted) {
        isRefreshing = true;
      }
    };

    // 监听按键事件，检测刷新快捷键
    const handleKeyDown = (event: KeyboardEvent) => {
      // F5 或 Ctrl+R / Cmd+R 表示刷新
      if (event.key === "F5" || (event.key === "r" && (event.ctrlKey || event.metaKey))) {
        isRefreshing = true;
      }
    };

    // 页面关闭前执行退出流程
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isRefreshing) {
        // 不是刷新：执行完整的退出流程（删除参会人 + 退出 TRTC 房间）
        controller.handlePageUnload();
        // 注意：现代浏览器可能不会显示自定义消息
        event.preventDefault();
        event.returnValue = "";
      } else {
        // 如果是刷新：只删除参会人，不退出 TRTC 房间（因为页面会重新加载）
        controller.handlePageRefresh();
        // 重置标记
        isRefreshing = false;
      }
    };

    onMounted(() => {
      const roomId = route.params.roomId as string;
      if (roomId) {
        meetId = roomId;
        try {
          const numericRoomId = $roomformat.roomIdToNumber(roomId);
          controller.initRoom(roomId, numericRoomId);
        } catch (error: any) {
          $message.error({
            message: "会议ID格式错误: " + (error?.message || "未知错误"),
          });
        }
      }

      // 监听页面显示事件（用于检测刷新）
      window.addEventListener("pageshow", handlePageShow);
      // 监听按键事件（用于检测刷新快捷键）
      window.addEventListener("keydown", handleKeyDown);
      // 监听页面关闭事件
      window.addEventListener("beforeunload", handleBeforeUnload);
    });

    onUnmounted(() => {
      // 移除所有事件监听
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // 组件卸载时，尝试删除内部参与人
      if (meetId) {
        controller.cleanup(meetId).catch(() => { });
      }
    });

    return () => {
      // 加载中时显示加载动画
      if (controller.loading.value) {
        return (
          <div class="meet-room">
            <div class="meet-loading">
              <div class="spinner-container">
                <div class="spinner">
                  <div class="spinner">
                    <div class="spinner">
                      <div class="spinner">
                        <div class="spinner">
                          <div class="spinner"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div class="meet-room">
          <div class="meet-main">
            <div id="meet-video" class="meet-video">
              <div class="show-participant" onClick={() => controller.toggleParticipant()}>
                <Motion
                  animate={{
                    rotate: controller.showParticipant.value ? 180 : 0,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                  class="motion-show-participant"
                >
                  <Svg
                    svgPath={MEET_ROOM_SHOW_PARTICIPANT_ARROW}
                    width="24"
                    height="24"
                    class="icon"
                    fill={"#dddddd"}
                  />
                </Motion>
              </div>
            </div>
            <Motion
              initial={{ width: 0, marginLeft: 0 }}
              animate={{
                width: controller.showParticipant.value ? "20%" : 0,
                marginLeft: controller.showParticipant.value ? 15 : 0,
                padding: controller.showParticipant.value ? 10 : 0,
              }}
              exit={{ width: 0, marginLeft: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              class="meet-participant"
            >
              <div class="meet-participant-list">
                {controller.participantList.value.map((participant) => {
                  // 使用 trtcId 作为视频流标识
                  const videoState = controller.getParticipantVideoState(participant.trtcId);
                  return (
                    <div
                      id={`${participant.trtcId}_remote_video`}
                      class="meet-participant-video"
                    >
                      {!videoState && (
                        <div class="video-placeholder">
                          <Svg
                            svgPath={MEET_ROOM_CAMERA_OFF_PLACEHOLDER}
                            width="48"
                            height="48"
                            fill="#999999"
                          />
                          <span class="placeholder-text">摄像头已关闭</span>
                        </div>
                      )}
                      <div class="participant-name">{participant.name}</div>
                    </div>
                  );
                })}
              </div>
            </Motion>
          </div>
          <div class="meet-operator">
            <div class="operator-list">
              <div class="operator-item">
                <Svg
                  svgPath={MEET_ROOM_NETWORK_STATE}
                  width="20"
                  height="20"
                  class="icon"
                  fill={
                    meetRoomConfig.networkState[controller.networkState.value as keyof NetworkState]
                      .color
                  }
                />
                <span class="tooltip">
                  网络状态：
                  {
                    meetRoomConfig.networkState[controller.networkState.value as keyof NetworkState]
                      .status
                  }
                </span>
              </div>
              <div
                class={["operator-item", { disabled: !controller.canOpenMicrophone.value }]}
                onClick={() => {
                  if (controller.canOpenMicrophone.value) {
                    controller.toggleMicrophone();
                  }
                }}
              >
                {controller.canOpenMicrophone.value ? (
                  controller.microphoneState.value ? (
                    <Fragment>
                      <Svg
                        svgPath={MEET_ROOM_MICROPHONE_ON}
                        width="20"
                        height="20"
                        class="icon"
                        fill="#dddddd"
                      />
                      <span class="tooltip">关闭麦克风</span>
                    </Fragment>
                  ) : (
                    <Fragment>
                      <Svg
                        svgPath={MEET_ROOM_MICROPHONE_OFF}
                        width="20"
                        height="20"
                        class="icon"
                        fill="#dddddd"
                      />
                      <span class="tooltip">开启麦克风</span>
                    </Fragment>
                  )
                ) : (
                  <Fragment>
                    <Svg
                      svgPath={MEET_ROOM_MICROPHONE_OFF}
                      width="20"
                      height="20"
                      class="icon-error"
                      fill="#999999"
                    />
                    <span class="tooltip">麦克风权限未授予</span>
                  </Fragment>
                )}
              </div>
              <div
                class={["operator-item", { disabled: !controller.canOpenCamera.value }]}
                onClick={() => {
                  if (controller.canOpenCamera.value) {
                    controller.toggleCamera("meet-video");
                  }
                }}
              >
                {controller.canOpenCamera.value ? (
                  controller.cameraState.value ? (
                    <Fragment>
                      <Svg
                        svgPath={MEET_ROOM_CAMERA_ON}
                        width="20"
                        height="20"
                        class="icon"
                        fill="#dddddd"
                      />
                      <span class="tooltip">关闭摄像头</span>
                    </Fragment>
                  ) : (
                    <Fragment>
                      <Svg
                        svgPath={MEET_ROOM_CAMERA_OFF}
                        width="20"
                        height="20"
                        class="icon"
                        fill="#dddddd"
                      />
                      <span class="tooltip">开启摄像头</span>
                    </Fragment>
                  )
                ) : (
                  <Fragment>
                    <Svg
                      svgPath={MEET_ROOM_CAMERA_OFF}
                      width="20"
                      height="20"
                      class="icon-error"
                      fill="#999999"
                    />
                    <span class="tooltip">摄像头权限未授予</span>
                  </Fragment>
                )}
              </div>
              <div
                class="operator-item"
                onClick={() => {
                  if (controller.canOpenScreenShare.value) {
                    if (controller.screenShareState.value) {
                      // 停止屏幕共享，直接执行
                      controller.stopRemoteScreen();
                    } else {
                      // 开启屏幕共享，先弹出确认框
                      $popup.alert("确定要开启屏幕共享吗？", {
                        buttonCount: 2,
                        onBtnRight: () => {
                          controller.startRemoteScreen();
                        },
                      });
                    }
                  } else {
                    $message.warning({
                      message: "其他人正在共享屏幕, 请稍后再试",
                      duration: 2000,
                    });
                  }
                }}
              >
                {controller.canOpenScreenShare.value ? (
                  controller.screenShareState.value ? (
                    <Fragment>
                      <Svg
                        svgPath={MEET_ROOM_SCREEN_SHARE_STOP}
                        width="20"
                        height="20"
                        class="icon"
                        fill="#dddddd"
                      />
                      <span class="tooltip">结束屏幕共享</span>
                    </Fragment>
                  ) : (
                    <Fragment>
                      <Svg
                        svgPath={MEET_ROOM_SCREEN_SHARE_START}
                        width="20"
                        height="20"
                        class="icon"
                        fill="#dddddd"
                      />
                      <span class="tooltip">开启屏幕共享</span>
                    </Fragment>
                  )
                ) : (
                  <Fragment>
                    <Svg
                      svgPath={MEET_ROOM_SCREEN_SHARE_STOP}
                      width="20"
                      height="20"
                      class="icon-error"
                      fill="#999999"
                    />
                    <span class="tooltip">其他人正在共享屏幕</span>
                  </Fragment>
                )}
              </div>
              <div
                class="operator-item"
                onClick={() => {
                  const roomId = route.params.roomId as string;
                  try {
                    const numericRoomId = $roomformat.roomIdToNumber(roomId);
                    controller.exitMeeting(numericRoomId);
                  } catch (error: any) {
                    $message.error({
                      message: "会议ID格式错误: " + (error?.message || "未知错误"),
                    });
                  }
                }}
              >
                <Svg
                  svgPath={MEET_ROOM_EXIT_MEETING}
                  width="20"
                  height="20"
                  class="icon"
                  fill="#dddddd"
                />
                <span class="tooltip">退出会议</span>
              </div>
            </div>
          </div>
        </div>
      );
    };
  },
});
