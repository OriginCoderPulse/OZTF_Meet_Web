import { defineComponent } from 'vue';

interface SvgProps {
    svgPath: string | string[];
    width?: string | number;
    height?: string | number;
    class?: string;
    fill?: string;
    viewBox?: string;
}

export default defineComponent({
    name: 'Svg',
    props: {
        svgPath: {
            type: [String, Array] as any,
            required: true
        },
        width: {
            type: [String, Number],
            default: '20'
        },
        height: {
            type: [String, Number],
            default: '20'
        },
        class: {
            type: String,
            default: ''
        },
        fill: {
            type: String,
            default: '#ffffff'
        },
        viewBox: {
            type: String,
            default: '0 0 1024 1024'
        }
    },
    setup(props: SvgProps) {
        const paths = Array.isArray(props.svgPath) ? props.svgPath : [props.svgPath];

        return () => (
            <svg
                width={props.width}
                height={props.height}
                viewBox={props.viewBox}
                class={props.class}
                fill={props.fill}
                xmlns="http://www.w3.org/2000/svg"
            >
                {paths.map((path, index) => (
                    <path key={index} d={path} fill={props.fill} />
                ))}
            </svg>
        );
    }
});
