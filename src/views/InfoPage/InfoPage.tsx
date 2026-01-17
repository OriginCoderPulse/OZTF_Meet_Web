import { defineComponent, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import './InfoPage.scss';
import { getMeetingInfo, isMobileDevice } from '@/utils/api';

export default defineComponent({
    name: 'InfoPage',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const roomId = route.params.roomId as string;
        const nickname = ref('');
        const error = ref('');
        const meetingStatus = ref<'loading' | 'valid' | 'cancelled' | 'concluded'>('loading');
        const meetingTopic = ref('');
        const isMobile = ref(false);

        // 检查会议状态
        const checkMeetingStatus = async () => {
            const meeting = await getMeetingInfo(roomId);
            if (!meeting) {
                error.value = '会议不存在';
                meetingStatus.value = 'valid'; // 允许尝试进入
                return;
            }

            meetingTopic.value = meeting.topic;

            if (meeting.status === 'Cancelled') {
                meetingStatus.value = 'cancelled';
                error.value = '会议已取消';
            } else if (meeting.status === 'Concluded') {
                meetingStatus.value = 'concluded';
                error.value = '会议已结束';
            } else {
                meetingStatus.value = 'valid';
            }
        };

        // 检查是否已有昵称，如果有则自动填充
        onMounted(async () => {
            // 检测是否为移动端
            isMobile.value = isMobileDevice();

            const storedNickname = localStorage.getItem(`meet_nickname_${roomId}`);
            if (storedNickname) {
                nickname.value = storedNickname;
            }
            await checkMeetingStatus();
        });

        const handleJoin = () => {
            // 移动端不允许进入
            if (isMobile.value) {
                return;
            }

            if (meetingStatus.value === 'cancelled' || meetingStatus.value === 'concluded') {
                return;
            }

            if (!nickname.value.trim()) {
                error.value = '请输入昵称';
                return;
            }

            // 保存昵称到 localStorage
            localStorage.setItem(`meet_nickname_${roomId}`, nickname.value);

            // 跳转到会议室页面
            router.push(`/${roomId}/meet`);
        };

        return () => (
            <div class="info-page">
                <div class="info-container">
                    <h1 class="info-title">加入会议室</h1>
                    {meetingTopic.value && (
                        <div class="info-topic">
                            <span class="label">会议主题:</span>
                            <span class="value">{meetingTopic.value}</span>
                        </div>
                    )}
                    <div class="info-room-id">
                        <span class="label">会议ID:</span>
                        <span class="value">{roomId}</span>
                    </div>
                    {isMobile.value ? (
                        <div class="info-mobile-warning">
                            <div class="warning-icon">📱</div>
                            <div class="warning-text">请在PC端加入会议</div>
                            <div class="warning-desc">移动端暂不支持加入会议，请使用电脑浏览器访问</div>
                        </div>
                    ) : meetingStatus.value === 'loading' ? (
                        <div class="info-loading">加载中...</div>
                    ) : (
                        <div class="info-form">
                            <div class="form-item">
                                <label class="form-label">请输入您的昵称</label>
                                <input
                                    class="form-input"
                                    type="text"
                                    placeholder="请输入昵称"
                                    value={nickname.value}
                                    onInput={(e: any) => {
                                        nickname.value = e.target.value;
                                        error.value = '';
                                    }}
                                    disabled={meetingStatus.value === 'cancelled' || meetingStatus.value === 'concluded'}
                                    onKeyup={(e: KeyboardEvent) => {
                                        if (e.key === 'Enter' && meetingStatus.value === 'valid') {
                                            handleJoin();
                                        }
                                    }}
                                />
                                {error.value && (
                                    <div class={['form-error', {
                                        'form-error-disabled': meetingStatus.value === 'cancelled' || meetingStatus.value === 'concluded'
                                    }]}>
                                        {error.value}
                                    </div>
                                )}
                            </div>
                            <button
                                class={['join-button', {
                                    'join-button-disabled': meetingStatus.value === 'cancelled' || meetingStatus.value === 'concluded'
                                }]}
                                onClick={handleJoin}
                                disabled={meetingStatus.value === 'cancelled' || meetingStatus.value === 'concluded'}
                            >
                                {meetingStatus.value === 'cancelled' ? '会议已取消' :
                                    meetingStatus.value === 'concluded' ? '会议已结束' :
                                        '进入会议室'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
});
