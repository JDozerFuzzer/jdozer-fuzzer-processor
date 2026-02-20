import { audit } from "rxjs";
import { JDFAudit } from "../audit/Types";
import { RedisService } from "../persistence/RedisService";
import { EventException } from "./EventException";
import { JDFEventCraft } from "./Types";


export class EventFactory {

    private readonly redisService: RedisService;

    constructor(redisService: RedisService) {
        this.redisService = redisService;
    }

    public async create(
        type: 'audit',
        id: string
    ) {
        switch (type) {
            case 'audit':
                return await this.createAudit(id);
            default:
                throw new EventException(`Unknown event type: ${type}`);
        }
    }

    private async createAudit(auditId: string): Promise<JDFEventCraft> {
        try {
            const audit: JDFAudit = await this.redisService.get(auditId);
            return {
                entityId: audit.fuzzerId,
                eventType: 'audit',
                payload: {
                    fuzzerId: audit.fuzzerId,
                    caseId: audit.caseId,
                    operationId: audit.operationId,
                    auditId: audit.id
                }
            };
        } catch (e) {
            throw new EventException(`Error creating payload for audit event: ${auditId}`);
        }
    }
}