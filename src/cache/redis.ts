import {Redis} from "ioredis";


export class Cache{
    private redis:Redis = new Redis();

    async set(key:string,value:string):Promise<Boolean>{
        await this.redis.set(key,value);
        return true;
    }
    async setWithTTL(key:string,value:string,ttlInMin:number):Promise<Boolean>{
        await this.redis.set(key,value,"EX",ttlInMin*60);
        return true;
    }
    async get(key:string):Promise<string | null>{
        return this.redis.get(key);
    }
    async delete(key:string):Promise<Boolean>{
        await this.redis.del(key);
        return true;
    }
}

export const cache = new Cache();