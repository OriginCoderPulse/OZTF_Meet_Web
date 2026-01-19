import { defineComponent } from "vue";
import "./Loading.scss";

export default defineComponent({
    name: "Loading",
    setup() {
        return () => (
            <div class="loading-container">
                <div class="spinner-container">
                    <div class="spinner">
                        <div class="spinner">
                            <div class="spinner">
                                <div class="spinner">
                                    <div class="spinner">
                                        <div class="spinner"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    },
});
