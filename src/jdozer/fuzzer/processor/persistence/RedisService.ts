import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { UUID } from 'crypto';
import * as Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {

    private readonly log = new Logger(RedisService.name);

    private client: Redis.Redis;

    constructor() {
        this.client = new Redis.Redis({
            host: process.env.REDIS_HOST,
            port: +process.env.REDIS_PORT
        });
    }

    public async getKeys(pattern: string): Promise<string[]> {
        try {
            const keys: string[] = await this.client.keys(pattern);
            this.log.verbose(`getKeys: Found ${keys.length} keys for pattern ${pattern}`);
            return keys;
        } catch (e) {
            const errorMsg = `getKeys: Error retrieving keys for pattern ${pattern}: ${e.message}`;
            this.log.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    async set(key: string, value: any) {
        await this.client.set(key, JSON.stringify(value));
    }

    async getNative(key: string): Promise<string> {
        try {
            return await this.client.get(key);
        } catch(e) {
            const errorMsg = `getNative: Error retrieving key ${key}: ${e.message}`;
            this.log.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    async get(key: string): Promise<any> {
        try {
            let data: any = JSON.parse(await this.client.get(key));
            return data;
        } catch (e) {
            const errorMsg = `get: Error retrieving key ${key}: ${e.message}`;
            this.log.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    async flushall() {
        await this.client.flushall();
    }

    async publish(channel: string, payload: any) {
        payload.data = Buffer.from(JSON.stringify(payload.data), 'binary').toString('base64');
        const payloadJson = JSON.stringify(payload);
        const eventId = await this.client.publish(channel, payloadJson);
        this.log.verbose(`publish: ${channel} / ${eventId} - ${payloadJson}`);
        return;
    }

    async onModuleDestroy() {
        await this.client.quit();
    }
}