import OpenAlgo from 'openalgo';

export class OpenAlgoClient 
{
    static instance = null;
    static getInstance()
    {
        if (!OpenAlgoClient.instance) {
            OpenAlgoClient.instance = OpenAlgoClient.createInstance();
        }
        return OpenAlgoClient.instance;
    }

    static createInstance(){
        return new OpenAlgo(process.env.openalgo_key, process.env.openalgo_http, 'v1', process.env.openalgo_ws);
    }
}