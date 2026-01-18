class Storage {
    get(key: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const result = localStorage.getItem(key);
                resolve(result && typeof result === "string" ? result : "");
            } catch (err: Error | any) {
                reject(err.message);
            }
        });
    }

    set(key: string, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
                resolve();
            } catch (err: Error | any) {
                reject(err?.message);
            }
        });
    }

    remove(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                localStorage.removeItem(key);
                resolve();
            } catch (err: Error | any) {
                reject(err?.message);
            }
        });
    }

    clearAll(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                localStorage.clear();
                resolve();
            } catch (err: Error | any) {
                reject(err?.message);
            }
        });
    }
}

export default {
    install(app: any) {
        app.config.globalProperties.$storage = new Storage();
        window.$storage = new Storage();
    },
};
