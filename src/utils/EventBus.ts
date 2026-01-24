import { reactive } from "vue";

class EventBus {
  private _events = new Map<string, Array<(...args: any[]) => any>>();

  on(event: string, callback: (...args: any[]) => any) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (this._events.has(event)) {
      this._events.get(event)!.forEach((callback) => callback(...args));
    }
  }

  off(event: string, callback?: (...args: any[]) => any) {
    if (!this._events.has(event)) return;

    if (callback) {
      // 移除特定的回调函数
      const callbacks = this._events.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      // 如果没有回调函数了，删除整个事件
      if (callbacks.length === 0) {
        this._events.delete(event);
      }
    } else {
      // 如果没有指定回调函数，删除整个事件
      this._events.delete(event);
    }
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$event = reactive(new EventBus()) as EventBus;
    window.$event = reactive(new EventBus()) as EventBus;
  },
};
