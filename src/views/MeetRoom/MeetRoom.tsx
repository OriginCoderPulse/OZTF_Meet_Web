import { defineComponent, Fragment, onMounted, onUnmounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Motion } from 'motion-v';
import './MeetRoom.scss';
import Svg from '@/components/Svg/Svg.tsx';
import { trtc } from '@/utils/Meet/TRTC';
import { addOutParticipant, removeOutParticipant, getDeviceInfo, generateParticipantId, getMeetingParticipants } from '@/utils/api';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://oztf.site/oztf/api/v1';
import { roomIdToNumber } from '@/utils/roomId';
import TRTC from 'trtc-sdk-v5';

export default defineComponent({
    name: 'MeetRoom',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const roomId = route.params.roomId as string;

        // 将 roomId（格式：xxx-xxxx-xxxx）转换为数字类型
        let numericRoomId: number;
        try {
            numericRoomId = roomIdToNumber(roomId);
        } catch (error: any) {
            console.error('RoomId 转换失败:', error);
            alert('会议ID格式错误: ' + error.message);
            router.push('/');
            return () => <div></div>;
        }

        const showParticipant = ref(true);
        const microphoneState = ref(false);
        const cameraState = ref(false);
        const canOpenMicrophone = ref(false);
        const canOpenCamera = ref(false);
        const nickname = ref('');
        const isInitialized = ref(false);
        const participantId = ref<string>('');

        // 参与人列表
        interface Participant {
            participantId: string;
            name: string;
            occupation: string;
            device: string;
            joinTime: string;
            type: 'inner' | 'out';
        }
        const participantList = ref<Participant[]>([]);
        // 跟踪每个参与人的视频流状态（使用 participantId 作为 key）
        const participantVideoStates = ref<Map<string, boolean>>(new Map());
        // TRTC userId 到 participantId 的映射（TRTC userId -> participantId）
        const trtcUserIdToParticipantId = ref<Map<string, string>>(new Map());

        // 获取昵称
        const storedNickname = localStorage.getItem(`meet_nickname_${roomId}`);
        if (storedNickname) {
            nickname.value = storedNickname;
        }

        // 删除外部参会人信息
        const removeParticipantInfo = async () => {
            const currentParticipantId = participantId.value || localStorage.getItem(`meet_participant_id_${roomId}`);
            if (currentParticipantId) {
                try {
                    await removeOutParticipant(roomId, currentParticipantId);
                } catch (error: any) {
                    console.warn('删除参会人信息失败:', error);
                } finally {
                    // 清除存储的 participantId
                    localStorage.removeItem(`meet_participant_id_${roomId}`);
                    participantId.value = '';
                }
            }
        };

        // 添加外部参会人信息（前端生成18位唯一ID）
        const addParticipantInfo = async () => {
            try {
                // 先清理可能存在的旧 participantId（刷新场景或重新进入场景）
                const storedParticipantId = localStorage.getItem(`meet_participant_id_${roomId}`);
                const currentParticipantId = participantId.value || storedParticipantId;

                if (currentParticipantId) {
                    try {
                        await removeOutParticipant(roomId, currentParticipantId);
                    } catch (error: any) {
                        console.warn('删除旧的参会人信息失败:', error);
                        // 继续执行，不阻止添加新的
                    }
                    // 清除存储和 ref
                    localStorage.removeItem(`meet_participant_id_${roomId}`);
                    participantId.value = '';
                }

                // 生成新的 18 位唯一 ID
                const newParticipantId = generateParticipantId();
                participantId.value = newParticipantId;
                localStorage.setItem(`meet_participant_id_${roomId}`, newParticipantId);

                const device = getDeviceInfo();
                const joinTime = new Date().toISOString();

                // 添加新的参会人信息，传递生成的 participantId
                await addOutParticipant(roomId, newParticipantId, {
                    name: nickname.value || '匿名用户',
                    device,
                    joinTime
                });
            } catch (error: any) {
                console.error('添加参会人信息失败:', error);
                // 不阻止进入会议室，只记录错误
            }
        };

        // 获取所有参会人（内部和外部）
        const fetchParticipants = async () => {
            try {
                console.log("开始拉取参会人数据, roomId:", roomId);
                const data = await getMeetingParticipants(roomId);
                if (data) {
                    // 合并内部和外部参会人
                    const allParticipants: Participant[] = [
                        ...(data.innerParticipants || []),
                        ...(data.outParticipants || [])
                    ];
                    // 确保使用新的数组引用，触发响应式更新
                    participantList.value = [...allParticipants];
                    console.log("获取参会人列表成功，数量:", allParticipants.length, allParticipants);

                    // 重新建立 TRTC userId 到 participantId 的映射
                    buildTrtcUserIdMapping();
                }
            } catch (error: any) {
                console.error("获取参会人列表失败:", error);
            }
        };

        // 建立 TRTC userId 到 participantId 的映射
        const buildTrtcUserIdMapping = (trtcUserId?: string) => {
            // 遍历参会人列表，建立映射关系
            participantList.value.forEach(participant => {
                // 如果提供了 trtcUserId，只建立该用户的映射
                if (trtcUserId) {
                    // 尝试匹配：TRTC userId 可能是数据库 ID 或生成的字符串
                    // 对于内部参与人，participantId 是数据库 ID
                    // 对于外部参与人，participantId 是生成的字符串
                    if (participant.participantId === trtcUserId) {
                        trtcUserIdToParticipantId.value.set(trtcUserId, participant.participantId);
                        console.log("建立映射:", trtcUserId, "->", participant.participantId);
                    }
                } else {
                    // 如果没有提供 trtcUserId，为所有参与人建立映射
                    // 对于外部参与人，TRTC userId 应该等于 participantId（生成的字符串）
                    if (participant.type === 'out' && participant.participantId === participantId.value) {
                        trtcUserIdToParticipantId.value.set(participantId.value, participant.participantId);
                    }
                    // 对于内部参与人，需要等待 REMOTE_USER_ENTER 事件来建立映射
                }
            });
        };

        // 将 streamType 转换为有效的字符串格式
        const normalizeStreamType = (streamType: any): string => {
            if (typeof streamType === 'string') {
                return streamType === 'sub' ? 'sub' : 'main';
            }
            return streamType === 1 || streamType === 'sub' ? 'sub' : 'main';
        };

        // 启动远端视频，如果 DOM 元素不存在则重试
        const startRemoteVideoWithRetry = (
            userId: string,
            streamType: string,
            viewId: string,
            retryCount: number = 0,
            maxRetries: number = 5
        ) => {
            // 忽略自己的视频流
            if (userId === participantId.value) {
                console.log("忽略自己的视频流:", userId);
                return;
            }

            const element = document.getElementById(viewId);
            if (element) {
                // DOM 元素存在，启动远端视频
                trtc.muteRemoteVideo(numericRoomId, userId, streamType, viewId).catch((error: any) => {
                    // 如果是"用户未发布流"的错误，静默处理
                    if (error?.message?.includes('does not publishing stream')) {
                        console.log(`用户 [${userId}] 尚未发布视频流，等待 REMOTE_VIDEO_AVAILABLE 事件`);
                        return;
                    }
                    console.error(`启动远端视频失败 [${userId}]:`, error);
                });
            } else {
                // DOM 元素不存在，延迟重试
                if (retryCount < maxRetries) {
                    console.warn(`视频容器元素不存在: ${viewId}，${200 * (retryCount + 1)}ms 后重试 (${retryCount + 1}/${maxRetries})`);
                    setTimeout(() => {
                        startRemoteVideoWithRetry(userId, streamType, viewId, retryCount + 1, maxRetries);
                    }, 200 * (retryCount + 1));
                } else {
                    console.error(`视频容器元素不存在: ${viewId}，已达到最大重试次数`);
                }
            }
        };

        // 重新初始化房间（刷新功能）
        const refreshRoom = async () => {
            try {
                // 退出当前房间
                if (trtc.hasRoom(numericRoomId)) {
                    await trtc.exitRoom(numericRoomId);
                }
                // 重置状态
                isInitialized.value = false;
                participantVideoStates.value.clear();
                trtcUserIdToParticipantId.value.clear();
                participantList.value = [];
                // 清除 participantId，确保重新生成新的
                participantId.value = '';
                localStorage.removeItem(`meet_participant_id_${roomId}`);
                // 重新初始化
                await initRoom();
            } catch (error: any) {
                console.error('重新初始化房间失败:', error);
            }
        };

        // 初始化房间
        const initRoom = async () => {
            if (isInitialized.value) {
                return;
            }

            try {
                // 首次进入会议室前，添加外部参会人信息（会生成新的 participantId）
                await addParticipantInfo();

                // 确保使用新生成的 participantId（addParticipantInfo 已经设置了 participantId.value）
                const currentParticipantId = participantId.value;
                if (!currentParticipantId) {
                    console.error('participantId 未生成，无法创建 TRTC');
                    return;
                }
                console.log('使用 participantId 创建 TRTC:', currentParticipantId);
                const result = await trtc.createTRTC(numericRoomId, currentParticipantId);

                // 获取所有参会人（内部和外部）
                await fetchParticipants();

                // 建立自己的映射（Web 端：TRTC userId = participantId）
                trtcUserIdToParticipantId.value.set(currentParticipantId, currentParticipantId);
                if (result.status) {
                    canOpenMicrophone.value = result.audio;
                    canOpenCamera.value = result.video;
                    if (!result.audio || !result.video) {
                        alert('麦克风或摄像头权限未授予');
                    }

                    trtc.joinRoom(numericRoomId).then(() => {
                        // 监听远端音频可用事件 - 当远端用户发布音频时触发
                        trtc.listenRoomProperties(numericRoomId, TRTC.EVENT.REMOTE_AUDIO_AVAILABLE, (event) => {
                            trtc.muteRemoteAudio(numericRoomId, event.userId, false).catch(() => {
                                microphoneState.value = false;
                            });
                        });

                        // 监听远端视频可用事件 - 当远端用户发布视频时触发
                        trtc.listenRoomProperties(numericRoomId, TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
                            console.log("远端视频可用:", userId, streamType);

                            // 忽略自己的视频流
                            if (userId === participantId.value) {
                                console.log("忽略自己的视频流:", userId);
                                return;
                            }

                            // 查找对应的 participantId（如果映射不存在，使用 userId 作为 fallback）
                            const mappedParticipantId = trtcUserIdToParticipantId.value.get(userId) || userId;
                            console.log("TRTC userId:", userId, "映射到 participantId:", mappedParticipantId);

                            // 设置该用户的视频流状态为可用（使用 participantId）
                            participantVideoStates.value.set(mappedParticipantId, true);

                            // 使用 participantId 作为 view id，确保与 DOM 中的 id 匹配
                            const viewId = `${mappedParticipantId}_remote_video`;
                            const normalizedStreamType = normalizeStreamType(streamType);
                            // 尝试启动远端视频（使用 TRTC userId）
                            startRemoteVideoWithRetry(userId, normalizedStreamType, viewId, 0);
                        });

                        // 监听远端视频不可用事件 - 当远端用户关闭摄像头时触发
                        trtc.listenRoomProperties(numericRoomId, TRTC.EVENT.REMOTE_VIDEO_UNAVAILABLE, ({ userId, streamType }) => {
                            console.log("远端视频不可用:", userId, streamType);
                            // 忽略自己的视频流
                            if (userId === participantId.value) {
                                return;
                            }
                            // 查找对应的 participantId（如果映射不存在，使用 userId 作为 fallback）
                            const mappedParticipantId = trtcUserIdToParticipantId.value.get(userId) || userId;
                            // 设置该用户的视频流状态为不可用（使用 participantId）
                            participantVideoStates.value.set(mappedParticipantId, false);
                        });

                        // 监听远端用户进入房间事件 - 处理已经在房间中的用户
                        trtc.listenRoomProperties(numericRoomId, TRTC.EVENT.REMOTE_USER_ENTER, (event) => {
                            console.log("远端用户进入房间:", event.userId);
                            trtc.muteRemoteAudio(numericRoomId, event.userId, false).catch(() => {
                                microphoneState.value = false;
                            });
                            // 延迟一下再拉取，确保后端数据已更新
                            setTimeout(() => {
                                console.log("REMOTE_USER_ENTER: 开始重新拉取参会人数据");
                                fetchParticipants().then(() => {
                                    // 拉取参会人列表后，建立 TRTC userId 到 participantId 的映射
                                    buildTrtcUserIdMapping(event.userId);
                                }).catch((error: any) => {
                                    console.error('重新拉取参会人数据失败:', error);
                                });
                            }, 500);
                            // 注意：不在这里启动远端视频，因为用户可能还没有发布视频流
                            // 视频启动会在 REMOTE_VIDEO_AVAILABLE 事件中自动处理
                        });

                        // 监听远端用户离开房间事件 - 清除状态
                        trtc.listenRoomProperties(numericRoomId, TRTC.EVENT.REMOTE_USER_EXIT, (event) => {
                            console.log("远端用户离开房间:", event.userId);
                            // 查找对应的 participantId 并清除状态
                            const mappedParticipantId = trtcUserIdToParticipantId.value.get(event.userId) || event.userId;
                            participantVideoStates.value.delete(mappedParticipantId);
                            trtcUserIdToParticipantId.value.delete(event.userId);
                            // 延迟一下再拉取，确保后端数据已更新
                            setTimeout(() => {
                                console.log("REMOTE_USER_EXIT: 开始重新拉取参会人数据");
                                fetchParticipants().catch((error: any) => {
                                    console.error('重新拉取参会人数据失败:', error);
                                });
                            }, 500);
                        });

                        isInitialized.value = true;
                    }).catch(() => {
                        // 返回到上一页面
                        router.push(`/${roomId}`);
                    });
                }
            } catch (error: any) {
                router.push(`/${roomId}`);
            }
        };

        // 处理页面刷新后的重新初始化
        const handleUserInteraction = () => {
            if (!isInitialized.value) {
                initRoom();
            }
        };

        // 切换参与者显示
        const toggleParticipant = () => {
            showParticipant.value = !showParticipant.value;
        };

        // 麦克风图标路径
        const microphoneIconPath = computed(() => {
            if (!canOpenMicrophone.value) {
                return "M700.8 761.130667A381.482667 381.482667 0 0 1 554.666667 808.32V981.333333h-85.333334v-173.013333A384.170667 384.170667 0 0 1 130.346667 469.333333H216.32a298.752 298.752 0 0 0 421.12 228.437334l-66.176-66.133334A213.333333 213.333333 0 0 1 298.666667 426.666667V358.997333L59.434667 119.808l60.373333-60.373333 844.757333 844.8-60.373333 60.330666-203.392-203.434666z m-315.392-315.392l107.52 107.52a128.085333 128.085333 0 0 1-107.52-107.52z m441.258667 201.088l-61.568-61.525334c21.717333-34.56 36.522667-73.813333 42.538666-115.968h86.016a381.866667 381.866667 0 0 1-66.986666 177.493334z m-124.16-124.117334l-66.048-66.048c2.304-9.642667 3.541333-19.626667 3.541333-29.994666V256a128 128 0 0 0-248.234667-44.032L327.936 148.096A213.333333 213.333333 0 0 1 725.333333 256v170.666667a212.48 212.48 0 0 1-22.784 96.042666z";
            }
            return microphoneState.value
                ? "M512 128a128 128 0 0 0-128 128v170.666667a128 128 0 0 0 256 0V256a128 128 0 0 0-128-128z m0-85.333333a213.333333 213.333333 0 0 1 213.333333 213.333333v170.666667a213.333333 213.333333 0 0 1-426.666666 0V256a213.333333 213.333333 0 0 1 213.333333-213.333333zM130.346667 469.333333H216.32a298.752 298.752 0 0 0 591.274667 0h86.016A384.170667 384.170667 0 0 1 554.666667 808.32V981.333333h-85.333334v-173.013333A384.170667 384.170667 0 0 1 130.346667 469.333333z"
                : "M700.8 761.130667A381.482667 381.482667 0 0 1 554.666667 808.32V981.333333h-85.333334v-173.013333A384.170667 384.170667 0 0 1 130.346667 469.333333H216.32a298.752 298.752 0 0 0 421.12 228.437334l-66.176-66.133334A213.333333 213.333333 0 0 1 298.666667 426.666667V358.997333L59.434667 119.808l60.373333-60.373333 844.757333 844.8-60.373333 60.330666-203.392-203.434666z m-315.392-315.392l107.52 107.52a128.085333 128.085333 0 0 1-107.52-107.52z m441.258667 201.088l-61.568-61.525334c21.717333-34.56 36.522667-73.813333 42.538666-115.968h86.016a381.866667 381.866667 0 0 1-66.986666 177.493334z m-124.16-124.117334l-66.048-66.048c2.304-9.642667 3.541333-19.626667 3.541333-29.994666V256a128 128 0 0 0-248.234667-44.032L327.936 148.096A213.333333 213.333333 0 0 1 725.333333 256v170.666667a212.48 212.48 0 0 1-22.784 96.042666z";
        });

        // 切换麦克风
        const toggleMicrophone = () => {
            const newState = !microphoneState.value;
            console.log('切换麦克风状态:', microphoneState.value, '->', newState);
            microphoneState.value = newState;
            if (microphoneState.value) {
                trtc.openLocalAudio(numericRoomId).catch((error: any) => {
                    console.error('开启麦克风失败:', error);
                    alert('开启麦克风失败: ' + (error?.message || '未知错误'));
                    // 失败时回退状态
                    microphoneState.value = false;
                });
            } else {
                trtc.closeLocalAudio(numericRoomId).catch((error: any) => {
                    console.error('关闭麦克风失败:', error);
                    alert('关闭麦克风失败: ' + (error?.message || '未知错误'));
                    // 失败时回退状态
                    microphoneState.value = true;
                });
            }
        };

        // 摄像头图标路径
        const cameraIconPath = computed(() => {
            if (!canOpenCamera.value) {
                return "M873.770667 314.922667c19.797333-12.202667 37.632-2.048 37.632 18.304v335.232c0 24.362667-15.872 32.512-37.632 18.261333l-112.938667-67.029333c-19.797333-12.202667-37.632-26.453333-37.632-46.72V424.618667c0-18.261333 17.834667-30.464 37.632-42.666667l112.938667-67.029333zM385.152 288h214.016c43.562667 0 79.232 32 79.232 71.125333v222.122667L385.152 288z m256.042667 437.077333a85.333333 85.333333 0 0 1-42.026667 10.922667H207.232C163.669333 736 128 704 128 664.874667V359.125333c0-38.186667 34.005333-69.632 76.16-71.082666l437.034667 437.034666zM145.28 183.893333l45.226667-45.226666 678.826666 678.826666-45.226666 45.226667z";
            }
            return cameraState.value
                ? "M873.770667 314.922667c19.797333-12.202667 37.632-2.048 37.632 18.304v335.232c0 24.362667-15.872 32.512-37.632 18.261333l-112.938667-67.029333c-19.797333-12.202667-37.632-26.453333-37.632-46.72V424.618667c0-18.261333 17.834667-30.464 37.632-42.666667l112.938667-67.029333zM207.232 288h391.936c43.562667 0 79.232 32 79.232 71.125333v305.749334c0 39.125333-35.669333 71.125333-79.232 71.125333H207.232C163.669333 736 128 704 128 664.874667V359.125333C128 320 163.669333 288 207.232 288z"
                : "M873.770667 314.922667c19.797333-12.202667 37.632-2.048 37.632 18.304v335.232c0 24.362667-15.872 32.512-37.632 18.261333l-112.938667-67.029333c-19.797333-12.202667-37.632-26.453333-37.632-46.72V424.618667c0-18.261333 17.834667-30.464 37.632-42.666667l112.938667-67.029333zM385.152 288h214.016c43.562667 0 79.232 32 79.232 71.125333v222.122667L385.152 288z m256.042667 437.077333a85.333333 85.333333 0 0 1-42.026667 10.922667H207.232C163.669333 736 128 704 128 664.874667V359.125333c0-38.186667 34.005333-69.632 76.16-71.082666l437.034667 437.034666zM145.28 183.893333l45.226667-45.226666 678.826666 678.826666-45.226666 45.226667z";
        });

        // 切换摄像头
        const toggleCamera = () => {
            const newState = !cameraState.value;
            console.log('切换摄像头状态:', cameraState.value, '->', newState);
            cameraState.value = newState;
            if (cameraState.value) {
                setTimeout(() => {
                    trtc.openLocalVideo(numericRoomId, 'meet-video').catch((error: any) => {
                        console.error('开启摄像头失败:', error);
                        alert('开启摄像头失败: ' + (error?.message || '未知错误'));
                        // 失败时回退状态
                        cameraState.value = false;
                    });
                }, 0);
            } else {
                trtc.closeLocalVideo(numericRoomId).catch((error: any) => {
                    console.error('关闭摄像头失败:', error);
                    alert('关闭摄像头失败: ' + (error?.message || '未知错误'));
                    // 失败时回退状态
                    cameraState.value = true;
                });
            }
        };

        // 退出会议
        const exitMeeting = async () => {
            if (confirm('确定要退出会议吗？')) {
                // 先删除外部参会人数据
                await removeParticipantInfo();

                // 清除所有状态
                isInitialized.value = false;
                participantVideoStates.value.clear();
                trtcUserIdToParticipantId.value.clear();
                participantList.value = [];

                // 退出房间
                try {
                    await trtc.exitRoom(numericRoomId);
                    router.push(`/${roomId}`);
                } catch (error: any) {
                    console.error('退出房间失败:', error);
                    alert('退出房间失败，请重试');
                }
            }
        };

        // 检测页面刷新
        const checkPageRefresh = () => {
            // 使用 performance.getEntriesByType 检测刷新
            try {
                const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navigationType && navigationType.type === 'reload') {
                    // 页面刷新后显示提示
                    setTimeout(() => {
                        alert('如需使用麦克风或摄像头，请点击下方对应图标激活一下');
                    }, 500);
                    return true;
                }
            } catch (error) {
                // 如果 performance API 不可用，使用 sessionStorage 作为备用方案
                const refreshKey = `meet_refresh_${roomId}`;
                const wasRefreshed = sessionStorage.getItem(refreshKey);
                if (wasRefreshed === 'true') {
                    setTimeout(() => {
                        alert('如需使用麦克风或摄像头，请点击下方对应图标激活一下');
                    }, 500);
                    sessionStorage.removeItem(refreshKey);
                    return true;
                }
            }
            return false;
        };

        // 使用 pageshow 事件作为备用刷新检测方案
        const handlePageShow = (event: PageTransitionEvent) => {
            // 如果页面是从缓存中恢复的，也显示提示
            if (event.persisted) {
                setTimeout(() => {
                    alert('如需使用麦克风或摄像头，请点击下方对应图标激活一下');
                }, 500);
            }
        };

        // 禁止页面刷新
        const preventRefresh = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ''; // Chrome 需要设置 returnValue
            return ''; // 其他浏览器
        };

        // 处理页面卸载（关闭标签页等，但不阻止刷新，因为我们已经添加了刷新按钮）
        const handleUnload = () => {
            // 标记页面即将卸载（可能是刷新）
            const refreshKey = `meet_refresh_${roomId}`;
            sessionStorage.setItem(refreshKey, 'true');

            // 获取存储的 participantId
            const currentParticipantId = participantId.value || localStorage.getItem(`meet_participant_id_${roomId}`);

            // 使用 fetch 的 keepalive 选项发送删除请求（即使页面关闭也能发送）
            if (currentParticipantId) {
                try {
                    fetch(`${API_BASE_URL}/meet/remove-out-participant`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            meetId: roomId,
                            participantId: currentParticipantId
                        }),
                        keepalive: true // 确保请求在页面关闭后也能完成
                    }).catch(() => {
                        // 静默失败，避免影响页面关闭
                    });

                    // 清除存储的 participantId
                    localStorage.removeItem(`meet_participant_id_${roomId}`);
                } catch (error) {
                    console.error('发送删除请求失败:', error);
                }
            }

            // 退出房间（异步操作在 beforeunload 中可能无法完成，但尝试执行）
            if (trtc.hasRoom(numericRoomId)) {
                trtc.exitRoom(numericRoomId).catch(console.error);
            }
        };

        // 异步删除参会人信息（用于正常退出流程）
        const handleUnloadAsync = async () => {
            // 标记页面即将卸载（可能是刷新）
            const refreshKey = `meet_refresh_${roomId}`;
            sessionStorage.setItem(refreshKey, 'true');

            // 删除外部参会人数据
            await removeParticipantInfo();

            // 退出房间
            if (trtc.hasRoom(numericRoomId)) {
                try {
                    await trtc.exitRoom(numericRoomId);
                } catch (error) {
                    console.error('退出房间失败:', error);
                }
            }
        };

        onMounted(() => {
            // 检测页面刷新
            checkPageRefresh();

            // 添加 pageshow 事件监听
            window.addEventListener('pageshow', handlePageShow);

            // 监听 beforeunload 事件（禁止刷新）
            window.addEventListener('beforeunload', preventRefresh);
            // 监听 beforeunload 事件（关闭标签页等）
            window.addEventListener('beforeunload', handleUnload);

            // 检查是否已有房间，如果有则直接使用（刷新场景）
            if (trtc.hasRoom(numericRoomId)) {
                isInitialized.value = true;
                // 恢复状态
                canOpenMicrophone.value = true;
                canOpenCamera.value = true;
                // 刷新后需要重新添加参会人信息（因为 onUnmounted 已经删除了）
                // 延迟一下确保删除操作完成
                setTimeout(() => {
                    addParticipantInfo().catch((error: any) => {
                        console.error('刷新后添加参会人信息失败:', error);
                    });
                }, 100);
            } else {
                // 等待用户交互后再初始化（解决 AudioContext 问题）
                const events = ['click', 'touchstart', 'keydown'];
                const handler = () => {
                    handleUserInteraction();
                    events.forEach(event => {
                        document.removeEventListener(event, handler);
                    });
                };
                events.forEach(event => {
                    document.addEventListener(event, handler, { once: true });
                });
            }
        });

        onUnmounted(() => {
            // 移除事件监听
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('beforeunload', preventRefresh);
            window.removeEventListener('beforeunload', handleUnload);

            // 组件卸载时删除外部参会人数据并退出房间（异步版本，确保完成）
            handleUnloadAsync().catch(console.error);
        });

        return () => (
            <div class="meet-room">
                <div class="meet-main">
                    <div id="meet-video" class="meet-video">
                        <div
                            class="show-participant"
                            onClick={toggleParticipant}
                        >
                            <Motion
                                animate={{
                                    rotate: showParticipant.value ? 180 : 0,
                                }}
                                transition={{
                                    duration: 0.3,
                                    ease: "easeInOut",
                                }}
                                class="motion-show-participant"
                            >
                                <Svg
                                    svgPath={['M576 672c-6.4 0-19.2 0-25.6-6.4l-128-128c-12.8-12.8-12.8-32 0-44.8l128-128c12.8-12.8 32-12.8 44.8 0s12.8 32 0 44.8L492.8 512l102.4 102.4c12.8 12.8 12.8 32 0 44.8C595.2 672 582.4 672 576 672z']}
                                    width="24"
                                    height="24"
                                    class="icon"
                                    fill="#dddddd"
                                />
                            </Motion>
                        </div>
                    </div>
                    <Motion
                        initial={{ width: 0, height: "100%", marginLeft: 0 }}
                        animate={{
                            width: showParticipant.value ? "20%" : 0,
                            height: "100%",
                            marginLeft: showParticipant.value ? 15 : 0,
                        }}
                        exit={{ width: 0, height: "100%", marginLeft: 0, padding: 10 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        class="meet-participant"
                    >
                        {participantList.value
                            .filter(p => p.participantId !== participantId.value)
                            .map(participant => {
                                const videoState = participantVideoStates.value.get(participant.participantId) ?? false;
                                return (
                                    <div id={`${participant.participantId}_remote_video`} class="meet-participant-video">
                                        {!videoState && (
                                            <div class="video-placeholder">
                                                <Svg
                                                    svgPath="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z m-32-196h64v-64h-64v64z m0-128h64V320h-64v320z"
                                                    width="48"
                                                    height="48"
                                                    fill="#999999"
                                                />
                                                <span class="placeholder-text">摄像头已关闭</span>
                                            </div>
                                        )}
                                        <div class="participant-name">{participant.name}</div>
                                    </div>
                                );
                            })}
                    </Motion>
                </div>
                <div class="meet-operator">
                    <div class="operator-list">
                        <div
                            class={["operator-item", { "disabled": !canOpenMicrophone.value }]}
                            onClick={() => {
                                if (canOpenMicrophone.value) {
                                    toggleMicrophone();
                                }
                            }}
                        >
                            {canOpenMicrophone.value ? (
                                <Fragment>
                                    <Svg
                                        key={`mic-${microphoneState.value ? 'on' : 'off'}`}
                                        svgPath={microphoneIconPath.value}
                                        width="20"
                                        height="20"
                                        class="icon"
                                        fill="#dddddd"
                                    />
                                    <span class="tooltip">{microphoneState.value ? '关闭麦克风' : '开启麦克风'}</span>
                                </Fragment>
                            ) : (
                                <Fragment>
                                    <Svg
                                        svgPath="M700.8 761.130667A381.482667 381.482667 0 0 1 554.666667 808.32V981.333333h-85.333334v-173.013333A384.170667 384.170667 0 0 1 130.346667 469.333333H216.32a298.752 298.752 0 0 0 421.12 228.437334l-66.176-66.133334A213.333333 213.333333 0 0 1 298.666667 426.666667V358.997333L59.434667 119.808l60.373333-60.373333 844.757333 844.8-60.373333 60.330666-203.392-203.434666z m-315.392-315.392l107.52 107.52a128.085333 128.085333 0 0 1-107.52-107.52z m441.258667 201.088l-61.568-61.525334c21.717333-34.56 36.522667-73.813333 42.538666-115.968h86.016a381.866667 381.866667 0 0 1-66.986666 177.493334z m-124.16-124.117334l-66.048-66.048c2.304-9.642667 3.541333-19.626667 3.541333-29.994666V256a128 128 0 0 0-248.234667-44.032L327.936 148.096A213.333333 213.333333 0 0 1 725.333333 256v170.666667a212.48 212.48 0 0 1-22.784 96.042666z"
                                        width="20"
                                        height="20"
                                        class="icon-error"
                                        fill="#999999"
                                    />
                                    <span class="tooltip">麦克风权限未授予</span>
                                </Fragment>
                            )}
                        </div>
                        <div
                            class={["operator-item", { "disabled": !canOpenCamera.value }]}
                            onClick={() => {
                                if (canOpenCamera.value) {
                                    toggleCamera();
                                }
                            }}
                        >
                            {canOpenCamera.value ? (
                                <Fragment>
                                    <Svg
                                        key={`camera-${cameraState.value ? 'on' : 'off'}`}
                                        svgPath={cameraIconPath.value}
                                        width="20"
                                        height="20"
                                        class="icon"
                                        fill="#dddddd"
                                    />
                                    <span class="tooltip">{cameraState.value ? '关闭摄像头' : '开启摄像头'}</span>
                                </Fragment>
                            ) : (
                                <Fragment>
                                    <Svg
                                        svgPath={cameraIconPath.value}
                                        width="20"
                                        height="20"
                                        class="icon-error"
                                        fill="#999999"
                                    />
                                    <span class="tooltip">摄像头权限未授予</span>
                                </Fragment>
                            )}
                        </div>
                        <div class="operator-item">
                            <Svg
                                svgPath="M896 128a42.666667 42.666667 0 0 1 42.666667 42.666667v298.666666h-85.333334V213.333333H170.666667v597.333334h256v85.333333H128a42.666667 42.666667 0 0 1-42.666667-42.666667V170.666667a42.666667 42.666667 0 0 1 42.666667-42.666667h768z m0 426.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256a42.666667 42.666667 0 0 1-42.666667 42.666667h-341.333333a42.666667 42.666667 0 0 1-42.666667-42.666667v-256a42.666667 42.666667 0 0 1 42.666667-42.666666h341.333333z m-405.333333-256L403.498667 385.834667l96 96-60.330667 60.330666-96-96L256 533.333333V298.666667h234.666667z"
                                width="20"
                                height="20"
                                class="icon"
                                fill="#dddddd"
                            />
                            <span class="tooltip">屏幕共享</span>
                        </div>
                        <div class="operator-item">
                            <Svg
                                svgPath={[
                                    "M704 320a192 192 0 1 1-384 0 192 192 0 0 1 384 0zM512 448a128 128 0 1 0 0-256 128 128 0 0 0 0 256z",
                                    "M160 832A224 224 0 0 1 384 608h256a32 32 0 0 0 0-64H384A288 288 0 0 0 96 832v64a32 32 0 0 0 64 0v-64zM736 576a32 32 0 0 0-32 32V704H608a32 32 0 0 0 0 64H704v96a32 32 0 0 0 64 0V768h96a32 32 0 0 0 0-64H768V608a32 32 0 0 0-32-32z"
                                ]}
                                width="20"
                                height="20"
                                class="icon"
                                fill="#dddddd"
                            />
                            <span class="tooltip">添加参与者</span>
                        </div>
                        <div class="operator-item" onClick={refreshRoom}>
                            <Svg
                                svgPath="M935.161672 427.51891c-14.511505-11.744485-37.643342-9.155521-49.1627 5.403057l-12.9438 16.20917c-0.926092-5.842055-1.995447-11.625782-3.158946-17.325597C831.326792 245.594511 666.360623 110.434182 477.668077 110.434182c-27.455305 0-55.099922 2.885723-82.198094 8.562003C179.036629 164.405397 39.60195 378.546545 84.655052 596.34499c38.522362 186.222285 203.488531 321.383638 392.229173 321.383638 27.430746 0 55.076386-2.873444 82.174558-8.549723 75.144444-15.746636 144.18589-53.508681 198.288089-108.002806l1.87572-1.662873c1.757017-1.74576 2.778276-3.432169 2.588965-3.443425l1.781576-2.387373c2.137687-3.527336 4.65502-9.191336 4.65502-16.173354 0-17.361413-14.035668-31.479969-31.326473-31.479969-4.275373 0-8.454556 0.914836-12.325723 2.612501l-1.90028-1.318018-8.644891 8.65717c-46.359864 46.478568-104.261599 78.042447-167.484525 91.283006-22.657023 4.750187-45.766346 7.160073-68.684312 7.160073-157.818375 0-295.733445-113.073288-327.96145-268.87268-37.738509-182.291766 78.849836-361.484961 259.918751-399.448598 22.657023-4.750187 45.766346-7.160073 68.708871-7.160073 157.793816 0 295.709909 113.061009 327.96145 268.860401 0.427742 2.101871 0.855484 4.227278 1.258667 6.364965l-13.751189-11.091616c-14.511505-11.768021-37.59627-9.1678-49.1627 5.390777-12.017708 15.056927-9.619078 37.156248 5.343705 49.269124l78.089519 63.1032c0.14224 0.106424 0.285502 0.213871 0.427742 0.332575l3.491521 2.814092 0.712221 0c6.483668 3.657296 15.770172 4.964058 21.065781 4.322445 9.475815-0.890276 17.954931-5.485945 23.940249-12.93152l62.723553-78.659501C952.498526 461.635939 950.052824 439.560154 935.161672 427.51891z"
                                width="20"
                                height="20"
                                class="icon"
                                fill="#dddddd"
                            />
                            <span class="tooltip">强制刷新</span>
                        </div>
                        <div class="operator-item" onClick={exitMeeting}>
                            <Svg
                                svgPath={[
                                    "M918.4 489.6l-160-160c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l105.6 105.6L512 480c-19.2 0-32 12.8-32 32s12.8 32 32 32l307.2 0-105.6 105.6c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 12.8 9.6 22.4 9.6 9.6 0 16-3.2 22.4-9.6l160-163.2c0 0 0-3.2 3.2-3.2C931.2 518.4 931.2 499.2 918.4 489.6z",
                                    "M832 736c-19.2 0-32 12.8-32 32l0 64c0 19.2-12.8 32-32 32L224 864c-19.2 0-32-12.8-32-32L192 192c0-19.2 12.8-32 32-32l544 0c19.2 0 32 12.8 32 32l0 64c0 19.2 12.8 32 32 32s32-12.8 32-32L864 192c0-54.4-41.6-96-96-96L224 96C169.6 96 128 137.6 128 192l0 640c0 54.4 41.6 96 96 96l544 0c54.4 0 96-41.6 96-96l0-64C864 748.8 851.2 736 832 736z"
                                ]}
                                width="20"
                                height="20"
                                class="icon"
                                fill="#dddddd"
                            />
                            <span class="tooltip">退出会议</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
