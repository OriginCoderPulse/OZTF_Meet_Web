import { defineComponent, PropType } from "vue";
import "./Svg.scss";

export default defineComponent({
  name: "Svg",
  props: {
    svgPath: {
      type: [String, Array, Object] as PropType<
        string | string[] | Array<{ path: string; fill?: string }>
      >,
      required: true,
    },
    width: {
      type: [String, Number] as PropType<string | number>,
      default: "14",
    },
    height: {
      type: [String, Number] as PropType<string | number>,
      default: "14",
    },
    viewBox: {
      type: String,
      default: "0 0 1024 1024",
    },
    class: {
      type: String,
      default: "",
    },
    fill: {
      type: String,
      default: "#999999",
    },
    stroke: {
      type: String,
      default: "",
    },
    strokeWidth: {
      type: [String, Number] as PropType<string | number>,
      default: "",
    },
    strokeLinecap: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    return () => (
      <svg
        viewBox={props.viewBox}
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width={props.width}
        height={props.height}
        class={props.class}
      >
        {Array.isArray(props.svgPath) ? (
          props.svgPath.map((item: any, index: number) => {
            // 支持对象数组格式 { path: string, fill?: string }
            if (typeof item === "object" && item.path) {
              return (
                <path
                  key={`path-${index}`}
                  d={item.path}
                  fill={item.fill || props.fill}
                  stroke={props.stroke || undefined}
                  strokeWidth={props.strokeWidth || undefined}
                  strokeLinecap={props.strokeLinecap || undefined}
                ></path>
              );
            }
            // 支持字符串数组格式
            return (
              <path
                key={`path-${index}`}
                d={item as string}
                fill={props.fill}
                stroke={props.stroke || undefined}
                strokeWidth={props.strokeWidth || undefined}
                strokeLinecap={props.strokeLinecap || undefined}
              ></path>
            );
          })
        ) : (
          <path
            d={props.svgPath as string}
            fill={props.fill}
            stroke={props.stroke || undefined}
            strokeWidth={props.strokeWidth || undefined}
            strokeLinecap={props.strokeLinecap || undefined}
          ></path>
        )}
      </svg>
    );
  },
});
