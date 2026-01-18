import CryptoJS from "crypto-js";
import * as pako from "pako";

class LibGenerateTestUserSig {
  private deflateSync: ((data: Uint8Array) => Uint8Array) | null = null;
  private inflateSync: ((data: Uint8Array) => Uint8Array) | null = null;

  constructor() {
    this._initPako();
  }

  private _initPako() {
    this.deflateSync = pako.deflate;
    this.inflateSync = pako.inflate;
  }

  genTestUserSig(
    sdkAppId: number,
    userId: string,
    sdkSecretKey: string
  ): { sdkAppId: number; userSig: string } {
    const SDKAPPID = sdkAppId;
    const EXPIRETIME = 604800;
    const SDKSECRETKEY = sdkSecretKey;

    if (!this._isNumber(SDKAPPID)) {
      return { sdkAppId: SDKAPPID, userSig: "" };
    }
    if (!this._isString(SDKSECRETKEY)) {
      return { sdkAppId: SDKAPPID, userSig: "" };
    }
    if (!this._isString(userId)) {
      return { sdkAppId: SDKAPPID, userSig: "" };
    }

    const userSig = this._genSigWithUserbuf(SDKAPPID, SDKSECRETKEY, userId, EXPIRETIME, null);

    return {
      sdkAppId: SDKAPPID,
      userSig: userSig,
    };
  }

  private _genSigWithUserbuf(
    sdkAppId: number,
    privateKey: string,
    userId: string,
    expire: number,
    userbuf: Uint8Array | null
  ): string {
    const time = this._utc();
    const sigObj: any = {
      "TLS.ver": "2.0",
      "TLS.identifier": userId,
      "TLS.sdkappid": sdkAppId,
      "TLS.time": time,
      "TLS.expire": expire,
    };

    let sig = "";
    if (userbuf != null) {
      const userbufBase64 = this._base64encode(userbuf);
      sigObj["TLS.userbuf"] = userbufBase64;
      sig = this._hmacsha256(sdkAppId, privateKey, userId, time, expire, userbufBase64);
    } else {
      sig = this._hmacsha256(sdkAppId, privateKey, userId, time, expire, null);
    }

    sigObj["TLS.sig"] = sig;

    const jsonStr = JSON.stringify(sigObj);
    const compressed = this.deflateSync
      ? this.deflateSync(new TextEncoder().encode(jsonStr))
      : new TextEncoder().encode(jsonStr);
    const base64Compressed = this._base64encode(compressed);
    const escaped = this._escape(base64Compressed);

    return escaped;
  }

  validate(sig: string): void {
    const decoded = this._decode(sig);
    const decompressed = this.inflateSync ? this.inflateSync(decoded) : decoded;
    const result = new TextDecoder().decode(decompressed);
    console.log(result);
  }

  private _unescape(str: string): string {
    return str.replace(/_/g, "=").replace(/-/g, "/").replace(/\*/g, "+");
  }

  private _escape(str: string): string {
    return str.replace(/\+/g, "*").replace(/\//g, "-").replace(/=/g, "_");
  }

  private _decode(str: string): Uint8Array {
    const unescaped = this._unescape(str);
    const binaryString = atob(unescaped);
    return Uint8Array.from(binaryString.split("").map((c) => c.charCodeAt(0)));
  }

  private _base64encode(data: Uint8Array | string): string {
    if (typeof data === "string") {
      return btoa(data);
    }
    return btoa(String.fromCharCode.apply(null, Array.from(data)));
  }

  private _hmacsha256(
    sdkAppId: number,
    privateKey: string,
    identifier: string,
    time: number,
    expire: number,
    userbuf: string | null
  ): string {
    let content = `TLS.identifier:${identifier}\n`;
    content += `TLS.sdkappid:${sdkAppId}\n`;
    content += `TLS.time:${time}\n`;
    content += `TLS.expire:${expire}\n`;
    if (userbuf != null) {
      content += `TLS.userbuf:${userbuf}\n`;
    }

    const hmac = CryptoJS.HmacSHA256(content, privateKey);
    return CryptoJS.enc.Base64.stringify(hmac);
  }

  private _utc(): number {
    return Math.round(Date.now() / 1000);
  }

  private _isNumber(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === "number") return !isNaN(value);
    if (typeof value === "object" && value.constructor === Number) {
      return !isNaN(Number(value));
    }
    return false;
  }

  private _isString(value: any): boolean {
    return typeof value === "string";
  }
}

export default {
  install(app: any) {
    app.config.globalProperties.$libGenerateTestUserSig = new LibGenerateTestUserSig();
    window.$libGenerateTestUserSig = new LibGenerateTestUserSig();
  },
};
