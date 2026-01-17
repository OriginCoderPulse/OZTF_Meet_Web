import { createApp, h, ref } from "vue";
import Message from "@/components/Message/Message";

interface MessageInstance {
  id: string;
  app: ReturnType<typeof createApp>;
  vm: HTMLDivElement;
}

class MessageManager {
  private messageTimer = ref<any>(null);
  private messageInstance = ref<MessageInstance | null>(null);

  private showMessage(
    message: string,
    messageType: "Info" | "Error" | "Warn" | "Success",
    duration?: number,
  ) {
    if (this.messageInstance.value || this.messageTimer.value) {
      clearTimeout(this.messageTimer.value);
      this._close();
    }

    const id = `Message_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const vm = document.createElement("div");
    vm.id = id;
    vm.style.zIndex = "9999";
    document.body.appendChild(vm);

    const app = createApp(() => h(Message, { messageType, message }));
    app.mount(vm);

    this.messageInstance.value = { id, app, vm };
    this.messageTimer.value = setTimeout(() => this._close(), duration || 2000);
  }

  private _close() {
    if (this.messageInstance.value) {
      this.messageInstance.value.app.unmount();
      document.body.removeChild(this.messageInstance.value.vm);
      this.messageInstance.value = null;
      clearTimeout(this.messageTimer.value);
    }
  }

  info({ message, duration }: { message: string; duration?: number }) {
    this.showMessage(message, "Info", duration);
  }

  error({ message, duration }: { message: string; duration?: number }) {
    this.showMessage(message, "Error", duration);
  }

  warning({ message, duration }: { message: string; duration?: number }) {
    this.showMessage(message, "Warn", duration);
  }

  success({ message, duration }: { message: string; duration?: number }) {
    this.showMessage(message, "Success", duration);
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$message = new MessageManager();
    window.$message = new MessageManager();
  },
};
