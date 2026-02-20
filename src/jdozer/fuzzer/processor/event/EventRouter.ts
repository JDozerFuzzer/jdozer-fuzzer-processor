import { Logger } from "@nestjs/common";
import { JDozerFuzzerValidator } from "../JDozerFuzzerValidator";
import { RedisService } from "../persistence/RedisService";
import { JDFEvent, JDFEventCraft } from "./Types";
import { EventException } from "./EventException";
import { EventFactory } from "./EventFactory";


export class EventRouter {

    private readonly log = new Logger(EventRouter.name);
    private readonly eventFactory: EventFactory;

    constructor(
        private readonly redisService: RedisService
    ) {
        this.eventFactory = new EventFactory(redisService);
    }

    public async route(event: JDFEvent): Promise<JDFEventCraft> {
        try {
            if (!event || !event.headers.entityType || !event.headers.eventType || !event.payload || !event.headers.entityId) {
                this.log.error(`[route] Invalid event structure: ${event}`);
                return;
            }

            if ('fuzzer-engine' === event.headers.entityType) {
                await this.engine(event);
            }

            if ('fuzzer-processor' === event.headers.entityType) {
                return await this.processor(event);
            }

        } catch (e) { }
    }

    private async engine(event: JDFEvent) {
        try {
            if ('response-received' === event.headers.eventType) {

            }
        } catch (e) { }
    }

    private async processor(event: JDFEvent): Promise<JDFEventCraft> {
        try {
            if ('req-res-merged' === event.headers.eventType) {
                const auditId: string = await (new JDozerFuzzerValidator(this.redisService)).validate(event.payload);
                return await this.eventFactory.create('audit', auditId);
            }
        } catch (e) {
            const err: string = `[processor] Error event: ${e.message}`;
            this.log.error(err, e);
            throw new EventException(err);
        }
    }

}