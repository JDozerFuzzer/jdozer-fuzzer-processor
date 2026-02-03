import { Injectable, OnModuleDestroy, Logger, OnModuleInit } from '@nestjs/common';
import * as Redis from 'ioredis';
import { JDozerFuzzerProcessor } from '../JDozerFuzzerProcessor';
import { RedisService } from '../persistence/RedisService';
import { randomUUID, UUID } from 'crypto';
import { RequestInterceptor } from '../runntime/RequestInterceptor';
import { StatusCodeInterceptor } from '../runntime/StatusCodeInterceptor';

@Injectable()
export class RedisEventsGateway implements OnModuleInit, OnModuleDestroy {

    private readonly log = new Logger(RedisEventsGateway.name);
    private subscriber: Redis.Redis;

    private subEngine: Redis.Redis;

    private static readonly CHANNEL = 'jdozer:fuzzer:broker';
    private static readonly MY_CHANNEL = 'fuzzer:processor';
    private static readonly ENGINE_CHANNEL = 'fuzzer:engine';
    private static readonly ENTITY = 'fuzzer-processor';

    private readonly requestInterceptor: RequestInterceptor;
    private readonly statusCodeInterceptor: StatusCodeInterceptor;

    constructor(
        private readonly fuzzerProcessor: JDozerFuzzerProcessor,
        private readonly redisService: RedisService
    ) {
        this.subscriber = new Redis.Redis({
            host: process.env.FUZZER_REDIS_HOST,
            port: +process.env.FUZZER_REDIS_PORT
        });

        this.subEngine = this.subscriber.duplicate();
        this.setupEngineSubscriptions();
        //this.initialize();

        this.log.debug(`RedisEventsGateway initialized with host: ${process.env.FUZZER_REDIS_HOST}, port: ${process.env.FUZZER_REDIS_PORT}`);
        // this.requestInterceptor = new RequestInterceptor(this.redisService, this);
        this.statusCodeInterceptor = new StatusCodeInterceptor(this.redisService, this);
    }

    onModuleInit() {
        throw new Error('Method not implemented.');
    }

    async setupEngineSubscriptions() {
        this.subEngine.subscribe(RedisEventsGateway.ENGINE_CHANNEL);
        this.log.log(`Subscribed to ${RedisEventsGateway.ENGINE_CHANNEL}`);
        this.subEngine.on('message', async (channel: string, message: string) => {
            this.log.verbose(`Received message on channel ${channel}: ${message}`);
            try {
                if (RedisEventsGateway.ENGINE_CHANNEL === channel) {
                    const event: any = JSON.parse(message);
                    if (event.headers.version === '1.0.0' && event.headers.entityType === 'fuzzer-engine' && event.headers.eventType === 'after-response') {
                        try {
                            await this.statusCodeInterceptor.intercept(event.payload);
                        } catch (e) {
                            this.log.error(`[message] Error intercepting request: ${e.message}`, e);
                        }
                    }
                }
            } catch (e) {
                this.log.error(`Error parsing message: ${message}`);
            }
        });
    }

    async initialize() {

        this.log.log(`[initialize] Initializing RedisEventsGateway...`);
        this.log.log(`[initialize] Subscribing to Redis channel: ${RedisEventsGateway.CHANNEL}`);

        await this.subscriber.subscribe(RedisEventsGateway.CHANNEL);

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
            data: payload
        };

        await this.redisService.publish(channel, event);

    }

    async runntimeEvent(entityId: UUID, eventType: string, payload: any) {
        try {

            const event = {
                headers: {
                    id: randomUUID(),
                    timestamp: new Date().getTime(),
                    version: '1.0.0',
                    entityId: entityId,
                    entityType: 'fuzzer-processor',
                    eventType: eventType
                },
                payload: payload
            };

            return this.redisService.publish(RedisEventsGateway.MY_CHANNEL, event);
        } catch (e) {
            this.log.error(`[runntimeEvent] Error publishing event: ${e.message}`, e);
        }
    }

    async onModuleDestroy() {
        await this.subscriber.quit();
    }
}
