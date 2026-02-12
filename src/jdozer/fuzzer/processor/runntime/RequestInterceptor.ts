import { Logger } from "@nestjs/common";
import { RedisService } from "../persistence/RedisService";
import { TaggingInterceptor } from "./TaggingInterceptor";
import { RedisEventsGateway } from "../event/RedisEventGateway";


export class RequestInterceptor {

    private readonly log = new Logger(RequestInterceptor.name);
    private readonly redisService: RedisService;
    private readonly redisEventGateway: RedisEventsGateway;
    private readonly taggingInterceptor: TaggingInterceptor;

    constructor(redisService: RedisService, redisEventGateway: RedisEventsGateway) {
        this.redisService = redisService;
        this.redisEventGateway = redisEventGateway;
        this.taggingInterceptor = new TaggingInterceptor(redisService, redisEventGateway);
    }

    async intercept(responseId: string) {
        try {
            this.log.debug(`[intercept] Intercepting request: ${responseId}`);
            const req: any = await this.redisService.get(responseId.replace(':RES', ':REQ'));
            await this.taggingInterceptor.intercept(req);
        } catch (e) {
            this.log.error(`[intercept] Error intercepting request: ${e.message}`, e);
            throw e;
        }
    }

}