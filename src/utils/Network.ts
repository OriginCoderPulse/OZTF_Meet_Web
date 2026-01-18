import axios, { AxiosInstance, AxiosError } from "axios";

class Network {
  private _instance: AxiosInstance | null = null;
  private _baseURL = import.meta.env.VITE_API_BASE_URL;
  private _timeout = 2500;
  private _isRequestReady = false;

  constructor() {
    this._init();
  }

  private _init() {
    try {
      this._instance = axios.create({
        baseURL: this._baseURL,
        timeout: this._timeout,
      });

      this._instance.interceptors.request.use(
        (config) => {
          return config;
        },
        (error) => {
          Promise.reject().then(error);
        }
      );

      this._instance.interceptors.response.use((response) => {
        return response.data;
      });

      this._isRequestReady = true;
    } catch (err) {
      this._isRequestReady = false;
    }
  }

  request(
    urlKey: string,
    params: Object = {},
    successCallback?: (data: any) => void,
    failCallback?: (error: any) => void
  ) {
    if (!this._isRequestReady) {
      return failCallback?.("Request Plugin Is Not Installed !");
    }

    const urlConfig = (window as any).$config?.urls?.[urlKey];

    if (!urlConfig) {
      const errorMessage = `API配置不存在: ${urlKey}`;
      failCallback?.(errorMessage);
      return;
    }

    this._instance
      ?.request({
        url: urlConfig.path.join("/"),
        method: urlConfig.method,
        [urlConfig.method.toLowerCase() === "get" ? "params" : "data"]: params,
      })
      .then((responseData: any) => {
        const { meta, data } = responseData;

        if (meta && meta.code === "1024-S200") {
          successCallback?.(data);
        } else {
          const errorMessage = meta?.message || "请求失败";
          failCallback?.(errorMessage);
        }
      })
      .catch((axiosError: AxiosError) => {
        const errorMessage = this._getErrorMessage(axiosError);
        failCallback?.(errorMessage);
      });
  }

  private _getErrorMessage(axiosError: AxiosError): string {
    if (axiosError.response) {
      const status = axiosError.response.status;
      const statusMap: Record<number, string> = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Interface address does not exist",
        408: "Request Timeout",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
      };

      return statusMap[status] || `HTTP Error: ${status}`;
    } else if (axiosError.request) {
      return "Network error: Request not responded";
    } else {
      return axiosError.message;
    }
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$network = new Network();
    window.$network = new Network();
  },
};
