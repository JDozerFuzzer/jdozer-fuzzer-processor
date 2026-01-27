import { Logger } from "@nestjs/common";
import { RedisEventsGateway } from "../event/RedisEventGateway";
import { RedisService } from "../persistence/RedisService";
import { KeyManager as km } from "../persistence/KeyManager";


export class TaggingInterceptor {

    private readonly log = new Logger(TaggingInterceptor.name);
    private readonly redisService: RedisService;
    private readonly redisEventGateway: RedisEventsGateway;

    constructor(redisService: RedisService, redisEventGateway: RedisEventsGateway) {
        this.redisService = redisService;
        this.redisEventGateway = redisEventGateway;
    }

    async intercept(request: any) {
        try {
            this.log.verbose(`[intercept] Intercepting response: ${JSON.stringify(request)}`);
            Object.keys(request.params).forEach(async key => {
                const keys: string[] = await this.redisService.getKeys(`*${request.params[key]}`);
                if (keys.length === 1) {
                    const dmm: any = await this.redisService.get(keys[0]);
                    (await this.classifyDmm(dmm)).forEach(async tag => {
                        await this.redisEventGateway.runntimeEvent(km.getFuzzerId(keys[0]), 'tagging', { name: tag, caseId: request.uuidReq });
                    });
                }
            });
        } catch (e) {
            this.log.error(`[intercept] Error intercepting response: ${e.message}`, e);
        }
    }

    private async classifyDmm(dmm: any) {
        try {
            if (!dmm.valid) {
                if (dmm.vectorId) {
                    const vector: any = await this.redisService.get(`JDF:VEC:${dmm.vectorId}`);
                    if (vector) {
                        return vector.tags.split(',');
                    }
                } else {
                    return ['break-schema'];
                }
            } else {
                return ['valid-test'];
            }
        } catch (e) {
            this.log.error(`[classifyDmm] Error classifying DMM: ${e.message}`, e);
            throw e;
        }
    }
}