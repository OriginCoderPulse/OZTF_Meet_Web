import { defineComponent } from "vue";
import "./Error.scss";

export default defineComponent({
  name: "Error",
  setup() {
    return () => (
      <div class="error-page">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-title">访问错误</div>
          <div class="error-message">
            您没有权限直接访问此页面，请通过会议信息页面进入。
          </div>
        </div>
      </div>
    );
  },
});
