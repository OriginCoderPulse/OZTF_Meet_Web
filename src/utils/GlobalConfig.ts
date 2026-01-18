class GlobalConfig {
  appName = "壹零贰肆-外部会议";
  urls = {
    meetAddOutParticipant: {
      method: "POST",
      path: ["meet", "add-out-participant"],
      retry: false,
      cache: false,
    },
    meetGetMeetingByMeetId: {
      method: "POST",
      path: ["meet", "get-meeting-by-meetid"],
      retry: false,
      cache: false,
    },
    meetGetRoomProperties: {
      method: "POST",
      path: ["meet", "get-room-properties"],
      retry: false,
      cache: false,
    },
    meetRemoveOutParticipant: {
      method: "POST",
      path: ["meet", "remove-out-participant"],
      retry: false,
      cache: false,
    },
    meetGenerateUserSig: {
      method: "POST",
      path: ["meet", "generate-usersig"],
      retry: false,
      cache: false,
    },
  };
}

export default {
  install(app: any) {
    app.config.globalProperties.$config = new GlobalConfig();
    window.$config = new GlobalConfig();
  },
};
