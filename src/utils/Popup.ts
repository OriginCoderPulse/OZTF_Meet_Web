import { App, createApp, h, ref, Ref } from "vue";
import Alert from "@/components/Alert/Alert";

interface PopupInstance {
  id: string;
  app: any;
  vm: HTMLDivElement;
  level: number;
  finish?: Function;
}

class PopupManager {
  private popupInstances: Ref<PopupInstance[]> = ref<PopupInstance[]>([]);
  private currentLevel = 0;

  constructor() {
    this._listenEscSpace();
  }

  alert(
    content: string,
    options?: {
      title?: string;
      buttonCount?: 1 | 2;
      btnLeftText?: string;
      btnRightText?: string;
      btnOnlyText?: string;
      onBtnOnly?: Function;
      onBtnLeft?: Function;
      onBtnRight?: Function;
    },
  ): void {
    const id: string = `alert_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const level: number = ++this.currentLevel;

    const vm: HTMLDivElement = document.createElement("div");
    vm.id = id;
    vm.style.zIndex = String(1000 + level);
    document.body.appendChild(vm);
    const that = this;

    const app: App = createApp(() =>
      h(Alert, {
        visible: true,
        title: options?.title || "提示",
        content,
        buttonCount: options?.buttonCount || 2,
        btnLeftText: options?.btnLeftText || "取消",
        btnRightText: options?.btnRightText || "确定",
        btnOnlyText: options?.btnOnlyText || "确定",
        onBtnLeft: () => {
          options?.onBtnLeft?.();
          that.close(id);
        },
        onBtnRight() {
          Promise.resolve().then(() => options?.onBtnRight?.());
          that.close(id);
        },
        onBtnOnly: () => {
          options?.onBtnOnly?.();
          that.close(id);
        },
      }),
    );
    app.mount(vm);

    this.popupInstances.value.push({ id, app, vm, level, finish: options?.onBtnLeft });
  }

  private _listenEscSpace() {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.popupInstances.value.length > 0) {
        const last =
          this.popupInstances.value[this.popupInstances.value.length - 1];
        if (last) {
          this.close(last.id);
          if (last.finish) {
            last.finish();
          }
        }
      }
    });
  }

  close(id: string): void {
    const index = this.popupInstances.value.findIndex((item) => item.id === id);
    if (index === -1) return;

    const instance = this.popupInstances.value[index];

    instance.app.unmount();

    document.body.removeChild(instance.vm);
    this.popupInstances.value.splice(index, 1);
    --this.currentLevel;
  }

  closeAll(): void {
    this.popupInstances.value.forEach((item) => {
      item.app.unmount();
      document.body.removeChild(item.vm);
    });
    this.popupInstances.value = [];
    this.currentLevel = 0;
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$popup = new PopupManager();
    window.$popup = new PopupManager();
  },
};
