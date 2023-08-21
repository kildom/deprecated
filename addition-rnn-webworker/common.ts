
interface MessageInit {
    type: 'init';
}

interface MessageInput {
    type: 'input';
    data: number;
}

interface MessagePrediction {
    type: 'prediction';
    data: number;
}

interface MessageReady {
    type: 'ready';
}

export type Message = MessageInit | MessageInput | MessagePrediction | MessageReady;
