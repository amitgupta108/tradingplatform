export type Message = { type: string, payload: any }

export const CANDLEDIM = 6;

export type Candle = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}