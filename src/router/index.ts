import { createRouter, createWebHistory } from "vue-router";
import InfoPage from "@/views/InfoPage/InfoPage.tsx";
import MeetRoom from "@/views/Meet/Meet.tsx";
import Error from "@/views/Error/Error.tsx";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/:roomId",
      name: "InfoPage",
      component: InfoPage,
    },
    {
      path: "/:roomId/meet",
      name: "MeetRoom",
      component: MeetRoom,
      beforeEnter: (_to, _from, next) => {
        // 路由鉴权：检查是否有 meeting-status 本地存储
        const meetingStatus = localStorage.getItem("meeting-status");
        if (meetingStatus === "success") {
          // 有权限，允许进入
          next();
        } else {
          // 没有权限，跳转到错误页面
          next("/error");
        }
      },
    },
    {
      path: "/error",
      name: "Error",
      component: Error,
    },
  ],
});

export default router;
