import { Generic } from "../../../common/generic.js";
import { UserQuotes } from "./userquotes.js";

export class Task extends Generic {
    appid: string;
    symbols: string[] = [];
    startTime: number = 0;
    currentTime: number = 0;
    running: boolean = false;
    userquotes?: UserQuotes;

    constructor(appid: string, startTime: number = 0, userquotes?: UserQuotes) {
        super(appid);
        this.appid = appid;
        this.startTime = startTime;
        this.currentTime = startTime;
        this.userquotes = userquotes;
    }

    addRequests(symbols: string[]) {
        this.symbols.push(...symbols);
        this.symbols = [...new Set(this.symbols)];
    }
}
