/// <reference path="./Meet.d.ts" />

import { defineComponent, Fragment, onMounted, onUnmounted } from "vue";
import "./Meet.scss";
import { Motion } from "motion-v";
import Svg from "@/components/Svg/Svg.tsx";
import { MeetRoomController } from "./Meet.controller.ts";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  name: "MeetRoom",
  setup() {
    const controller = new MeetRoomController();
    const route = useRoute();
    const router = useRouter();

    // 设置路由器实例
    controller.setRouter(router);
    let meetId: string = "";

    // 页面关闭前执行退出流程
    const handleBeforeUnload = () => {
      controller.handlePageUnload();
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

      // 监听页面关闭事件
      window.addEventListener("beforeunload", handleBeforeUnload);
    });

    onUnmounted(() => {
      // 移除事件监听
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // 组件卸载时，尝试删除外部参会人
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
