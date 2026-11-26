import { Generic } from "../../../common/generic.js";
import { Task } from "./task.js"

export class IntervalClock extends Generic {
    static clocks = new Map<string, IntervalClock>();

    speed: number;
    clockId: any;
    running: boolean = false;
    listeners = new Map<string, (event: string, clock: string) => void>();
    constructor(speed: number) {
        super(`clock_${speed}x`);
        this.speed = speed;
    }

    static getInstance(clockId: string) {
        const speeds = { '1x': 1, '2x': 2, '3x': 3, '5x': 5, '8x': 8, '10x': 10 };
        if (speeds[clockId] === undefined) {
            return;
        }
        let clock = this.clocks.get(clockId)
        if (clock == undefined) {
            clock = new IntervalClock(speeds[clockId]);
            this.clocks.set(clockId, clock);
        }
        return clock;
    }

    static stopAllClocks() {
        for (const clock of this.clocks.values()) {
            clock.stopClock();
        }
        this.clocks.clear();
    }

    static getClockForApp(appid: string) {
        return Array.from(IntervalClock.clocks.values()).find((clock: IntervalClock) => {
            return Array.from(clock.listeners.keys()).includes(appid);
        }) as IntervalClock;
    }

    static changeSpeed(appid: string, to: string) {
        const clock = this.getClockForApp(appid);
        const newClock = this.getInstance(to);
        if (!clock || !newClock) {
            return;
        }
        const fn = clock.listeners.get(appid);
        if (!fn) {
            return;
        }
        clock.deregisterListener(appid);
        newClock.registerListener(appid, fn);
    }

    static streamAction(appid: string, action: string) {
        const clock = Array.from(IntervalClock.clocks.values()).find((clock: IntervalClock) => {
            return Array.from(clock.listeners.keys()).includes(appid);
        }) as IntervalClock;
        if (!clock) {
            return;
        }
        if (action == 'pause')
            clock.pauseTask(appid)
        else
            clock.resumeTask(appid);
    }

    session(appid: string, action: string, callback?: any) {
        if (action === 'start')
            this.registerListener(appid, callback);
        else if (action === 'stop')
            this.deregisterListener(appid);

        if (this.listeners.size > 0)
            this.startClock();
        else
            this.stopClock();
    }

    private next() {
        this.doThings()
            .catch((e) => {
                console.error("doThings error", e);
            })
    }

    async doThings() {
        try {
            for (const t of this.listeners.values()) {
                t('tick', this.name);
            }
        } catch (e) {
            console.error("doThings error", e);
        }
    }

    startClock() {
        if (this.running)
            return;

        this.running = true;
        this.clockId = setInterval(() => {
            this.next();
        }, 1000 / this.speed);
    }

    stopClock() {
        this.running = false;
        clearInterval(this.clockId);
    }

    registerListener(appid: string, fn: any) {
        this.listeners.set(appid, fn);
    }

    deregisterListener(appid: string) {
        this.listeners.delete(appid);
    }

    pauseTask(appid: string): void {
        const fn = this.listeners.get(appid);
        fn!('pause', this.name);
    }

    resumeTask(appid: string): void {
        const fn = this.listeners.get(appid);
        fn!('resume', this.name);
    }

    getTasks(): any[] {
        return Array.from(this.listeners.keys());
    }
}