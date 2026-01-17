interface MeetRoomConfig {
    networkState: NetworkState;
}

interface NetworkState {
    excellent: {
        status: string;
        color: string;
    };
    good: {
        status: string;
        color: string;
    };
    average: {
        status: string;
        color: string;
    };
    poor: {
        status: string;
        color: string;
    };
    unknown: {
        status: string;
        color: string;
    };
}