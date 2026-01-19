import { defineComponent } from "vue";
import { useRoute } from "vue-router";
import "./Error.scss";

export default defineComponent({
  name: "Error",
  setup() {
    const route = useRoute();
    // 如果是根路由，只显示"访问错误"，不显示详细提示
    const isRootRoute = route.path === "/";

    return () => (
      <div class="error-page">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-title">访问错误</div>
          {!isRootRoute && (
            <div class="error-message">您没有权限直接访问此页面，请通过会议信息页面进入。</div>
          )}
        </div>
      </div>
    );
  },
});
