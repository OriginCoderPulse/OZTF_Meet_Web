/// <reference path="./InfoPage.config.ts" />

interface MeetingInfo {
  meetId: string;
  topic: string;
  description?: string;
  status: "Pending" | "InProgress" | "Cancelled" | "Concluded";
  startTime: string;
  duration: number;
  organizerId?: string;
  /** 是否加锁（是否设置了会议密码） */
  locked?: boolean;
}

interface InfoPageConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
  };
  statusMessages: {
    Pending: string;
    InProgress: string;
    Cancelled: string;
    Concluded: string;
  };
}
