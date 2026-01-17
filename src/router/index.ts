import { createRouter, createWebHistory } from 'vue-router';
import InfoPage from '@/views/InfoPage/InfoPage.tsx';
import MeetRoom from '@/views/MeetRoom/MeetRoom.tsx';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/:roomId',
            name: 'InfoPage',
            component: InfoPage
        },
        {
            path: '/:roomId/meet',
            name: 'MeetRoom',
            component: MeetRoom
        }
    ]
});

export default router;
