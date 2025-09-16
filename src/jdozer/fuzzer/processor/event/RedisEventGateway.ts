import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import * as Redis from 'ioredis';
import { JDozerFuzzerProcessor } from '../JDozerFuzzerProcessor';
import { RedisService } from '../persistence/RedisService';
import { randomUUID, UUID } from 'crypto';

@Injectable()
export class RedisEventsGateway implements OnModuleDestroy {

    private readonly log = new Logger(RedisEventsGateway.name);
    private subscriber: Redis.Redis;

    private static readonly CHANNEL = 'jdozer:fuzzer:broker';
    private static readonly ENTITY = 'fuzzer-processor';

    constructor(
        private readonly fuzzerProcessor: JDozerFuzzerProcessor,
        private readonly redisService: RedisService
    ) {
        this.subscriber = new Redis.Redis({
            host: process.env.FUZZER_REDIS_HOST,
            port: +process.env.FUZZER_REDIS_PORT
        });
        this.log.debug(`RedisEventsGateway initialized with host: ${process.env.FUZZER_REDIS_HOST}, port: ${process.env.FUZZER_REDIS_PORT}`);
        this.initialize();
    }

    async initialize() {

        this.log.log(`[initialize] Initializing RedisEventsGateway...`);
        this.log.log(`[initialize] Subscribing to Redis channel: ${RedisEventsGateway.CHANNEL}`);

        this.subscriber.on('error', (err) => {
            this.log.error(`[initialize] Redis subscriber error: ${err.message}`, err);
        });
        this.subscriber.on('ready', () => {
            this.log.verbose(`[initialize] Redis subscriber is ready`);
        });
        this.subscriber.on('connect', () => {
            this.log.verbose(`[initialize] Redis subscriber connected`);
        });
        this.subscriber.on('reconnecting', () => {
            this.log.verbose(`[initialize] Redis subscriber is reconnecting`);
        });
        this.subscriber.on('end', () => {
            this.log.verbose(`[initialize] Redis subscriber connection ended`);
        });
        this.subscriber.on('close', () => {
            this.log.verbose(`[initialize] Redis subscriber connection closed`);
        });
        this.subscriber.on('subscribe', (channel, count) => {
            this.log.verbose(`[initialize] Subscribed to channel: ${channel}, subscription count: ${count}`);
        });

        this.subscriber.on('message', (channel, message) => {
            try {

                this.log.verbose(`[initialize] Message received on channel: ${channel}`);
                this.log.verbose(`[initialize] Message: ${message}`);

                if (RedisEventsGateway.CHANNEL !== channel) {
                    this.log.debug(`[initialize] Ignoring message from channel: ${channel}`);
                    return;
                }

                const data = JSON.parse(message);
                this.router(data);

            } catch (err) {
                this.log.error(`[initialize] Error inbound message: ${err.message}`, err);
            }
        });

        await this.subscriber.subscribe(RedisEventsGateway.CHANNEL);
        this.log.log(`[initialize] RedisEventsGateway initialized and listening on channel: ${RedisEventsGateway.CHANNEL}`);
    }

    private async router(event: any) {

        if (!event || !event.entityType || !event.eventType || !event.data || !event.entityId) {
            this.log.error('[router] Invalid event structure:', event);
            return;
        }

        if ('fuzzer-engine' === event.entityType && 'attack-completed' === event.eventType) {
            try {
                const fuzzer: any = JSON.parse(Buffer.from(event.data, 'base64').toString('binary'));
                await this.fuzzerProcessor.process(event.entityId);
                const eventData = {
                    fuzzerId: event.entityId,
                    status: 'completed',
                    timestamp: new Date().getTime()
                };
                this.publish(RedisEventsGateway.CHANNEL, event.traceId, fuzzer.id, 'undefined', eventData);
            } catch (e) {
                this.log.error(`[router] Error starting Processor: ${e.message}`, e);
                this.publish(RedisEventsGateway.CHANNEL, event.traceId, event.entityId, 'processor-failed', {
                    fuzzerId: event.entityId,
                    status: 'undefined-failed',
                    timestamp: new Date().getTime()
                });
            }
        } else {
            this.log.verbose(`[router] Unknown event: entitytype[${event.entityType}], eventType[${event.eventType}]`);
            return;
        }
    }

    async publish(channel: string, traceId: UUID, entityId: UUID, eventType: string, payload: any) {
        const event = {
            id: randomUUID(),
            traceId: traceId,
            timestamp: new Date().getTime(),
            entityId: entityId,
            entityType: RedisEventsGateway.ENTITY,
            eventType: eventType,
            data: Buffer.from(JSON.stringify(payload), 'binary').toString('base64')
        };

        await this.redisService.publish(channel, event);

    }

    async onModuleDestroy() {
        await this.subscriber.quit();
    }
}
