import { defineComponent, Fragment } from "vue";
import { Motion } from "motion-v";
import "./Alert.scss";

export default defineComponent({
  name: "Alert",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    level: Number,
    title: String,
    content: String,
    buttonCount: {
      type: Number,
      default: 2,
      validator: (value: number) => value >= 1 && value <= 2,
    },
    onBtnLeft: Function,
    onBtnRight: Function,
    onBtnOnly: Function,
    btnLeftText: {
      type: String,
      default: "取消",
    },
    btnRightText: {
      type: String,
      default: "确定",
    },
    btnOnlyText: {
      type: String,
      default: "确定",
    },
  },
  setup(props) {
    return () => (
      <div class="alert-container">
        <Motion
          v-show={props.visible}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{
            zIndex: props.level ?? 1000,
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(24, 24, 24, 0.52)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Motion
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            class="main"
            style={{
              display: "flex",
              flexDirection: "column",
              width: "320px",
              height: "200px",
              backgroundColor: "#36373A",
              borderRadius: "12px",
              boxSizing: "border-box",
              zIndex: (props.level ?? 1000) + 1,
            }}
          >
            <div class="alert-title">{props.title}</div>
            <div class="alert-content">{props.content}</div>
            <div class="alert-action">
              {props.buttonCount === 2 ? (
                <>
                  {props.onBtnLeft && (
                    <Motion
                      initial={{ y: 0 }}
                      whileHover={{ y: -5 }}
                      exit={{ y: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      class="motion-btn"
                    >
                      <div
                        class="cancel"
                        onClick={() => props.onBtnLeft && props.onBtnLeft()}
                      >
                        {props.btnLeftText}
                      </div>
                    </Motion>
                  )}
                  {props.onBtnRight && (
                    <Motion
                      initial={{ y: 0 }}
                      whileHover={{ y: -5 }}
                      exit={{ y: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      class="motion-btn"
                      style={!props.onBtnLeft ? { width: '60%' } : {}}
                    >
                      <div
                        class="confirm"
                        onClick={() => props.onBtnRight && props.onBtnRight()}
                      >
                        {props.btnRightText}
                      </div>
                    </Motion>
                  )}
                </>
              ) : (
                <Motion
                  initial={{ y: 0 }}
                  whileHover={{ y: -5 }}
                  exit={{ y: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  class="motion-btn"
                  style={{ width: '60%' }}
                >
                  <div
                    class="confirm"
                    onClick={() => props.onBtnOnly && props.onBtnOnly()}
                  >
                    {props.btnOnlyText}
                  </div>
                </Motion>
              )}
            </div>
          </Motion>
        </Motion>
      </div>
    );
  },
});
