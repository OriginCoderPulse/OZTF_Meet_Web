import { createRouter, createWebHistory } from "vue-router";
import InfoPage from "@/views/InfoPage/InfoPage.tsx";
import MeetRoom from "@/views/Meet/Meet.tsx";
import Error from "@/views/Error/Error.tsx";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: Error, // 根路由直接显示错误页面
    },
    {
      path: "/:roomId",
      name: "InfoPage",
      component: InfoPage,
    },
    {
      path: "/:roomId/meet",
      name: "MeetRoom",
      component: MeetRoom,
      beforeEnter: async (_to, _from, next) => {
        // 路由鉴权：检查是否有 meeting-status 本地存储
        try {
          const meetingStatus = await $storage.get("meeting-status");
          if (meetingStatus === "success") {
            // 有权限，允许进入
            next();
          } else {
            // 没有权限，跳转到错误页面
            next("/error");
          }
        } catch (error) {
          // 获取存储失败，跳转到错误页面
          next("/error");
        }
      },
    },
    {
      path: "/error",
      name: "Error",
      component: Error,
      beforeEnter: (_to, from, next) => {
        // 只允许从会议室页面或会议信息页面跳转过来
        // 如果直接通过 URL 访问，重定向到根路由
        if (from.name === "MeetRoom" || from.name === "InfoPage") {
          // 从会议室或信息页面跳转过来，允许访问
          next();
        } else {
          // 直接通过 URL 访问，重定向到根路由
          next("/");
        }
      },
    },
  ],
});

export default router;
