import { Logger } from "@nestjs/common";
import { RedisService } from "../persistence/RedisService";
import { UUID } from "crypto";
import { AuditorException } from "./AuditorException";


export class ResponseAuditor {

    private readonly log: Logger = new Logger(ResponseAuditor.name);

    constructor(
        private readonly redisService: RedisService
    ) { }

    public async merge(req: string, res: string, operationId: string, fuzzerId: UUID): Promise<any> {
        try {

            const aggregate: any = {};
            const operation = await this.getOperationDefinition(operationId, fuzzerId);
            const request: any = await this.redisService.get(req);
            const response: any = await this.redisService.get(res);
            const mutations = await this.getMutations(request, fuzzerId);

            aggregate.request = request;
            aggregate.request.mutations = mutations;
            aggregate.response = response;

            const key = `JDF:${fuzzerId}:FZZ:${operation.name}:${request.uuid}`;
            aggregate.id = key;
            aggregate.fuzzerId = fuzzerId;
            aggregate.caseId = request.uuid;
            aggregate.operationId = request.operationId;
            await this.redisService.set(key, aggregate);

            return aggregate;

        } catch (e) {
            const errorMsg = `audit: The vector ${req} for fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new AuditorException(errorMsg);
        }
    }

    private async getMutations(request: any, fuzzerId: UUID): Promise<any> {
        try {
            const mutations = {};
            const keys = Object.keys(request.params);
            let isValid: boolean[] = [];
            for (const key of keys) {
                const paramType = this.getParamType(key);
                const paramId = request.params[key];
                const fuzzCase = await this.getFuzzCase(fuzzerId, paramId);
                isValid.push(fuzzCase.valid);
                mutations[paramType] = fuzzCase;
            }
            mutations['isValid'] = isValid.every((valid) => valid);
            return mutations;
        } catch (e) {
            const errorMsg = `getMutation: The mutation ${request.uuid} for fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new AuditorException(errorMsg);
        }
    }

    private async getFuzzCase(fuzzerId: UUID, caseId: UUID): Promise<any> {
        try {
            const keys: string[] = await this.redisService.getKeys(`JDF:${fuzzerId}:*:${caseId}`);
            const fuzzCase: any = await this.redisService.get(keys[0]);
            return fuzzCase;
        } catch (e) {
            const errorMsg = `getFuzzCase: The case ${caseId} for fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new AuditorException(errorMsg);
        }
    }

    private async getOperationDefinition(operationId: string, fuzzerId: UUID): Promise<any> {
        try {
            const operation: any = await this.redisService.get(`JDF:${fuzzerId}:OP:${operationId}`);
            return operation;
        } catch (e) {
            const errorMsg = `getOperationDefinition: The operation ${operationId} for fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new AuditorException(errorMsg);
        }
    }

    private getParamType(param: string): string {
        switch (param) {
            case 'payloadId':
                return 'payload';
            case 'headersId':
                return 'headers';
            case 'queryId':
                return 'query';
            case 'pathId':
                return 'path';
            default:
                const error: string = `Error: unknown parameter type ${param}`;
                this.log.error(error);
                throw new AuditorException(error);
        }
    }

}