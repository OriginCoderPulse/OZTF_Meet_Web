import { defineComponent } from 'vue';
import { RouterView } from 'vue-router';
import './styles/global.scss';

export default defineComponent({
    name: 'App',
    setup() {
        return () => (
            <div id="app">
                <RouterView />
            </div>
        );
    }
});
