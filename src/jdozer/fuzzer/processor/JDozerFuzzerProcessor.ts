import { UUID } from "crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Storage } from "./persistence/Storage";
import { ProcessorException } from "./ProcessorException";
import { Validator } from "./audit/Validator";
import { ResponseAudit } from "./audit/ResponseAudit";
import { Audit } from "./audit/Audit";
import { StatusCodeCounts } from "./counts/StatusCodeCounts";

@Injectable()
export class JDozerFuzzerProcessor {

    private readonly log = new Logger(JDozerFuzzerProcessor.name);

    @Inject()
    private readonly storage: Storage;

    public async process(fuzzerId: UUID) {
        try {

            const fuzzer = await this.getFuzzer(fuzzerId);
            let statusCodesAgreggate: any[] = [];

            for (const operationId of fuzzer.operationIds) {
                const operation: any = await this.storage.getOperation(operationId, fuzzer.id);
                const responseAudit = new ResponseAudit(operation);
                const reqIds: string[] = await this.storage.getRequestIds(operationId, fuzzer.id);
                let auditor: Audit;
                const statusCodeCounts = new StatusCodeCounts(operation.name, operation.path, operation.method.toUpperCase());
                for (const reqId of reqIds) {
                    const request: any = await this.storage.getRequestById(reqId);
                    const mutations: any = await this.getMutation(request, fuzzer.id);
                    const response: any = await this.storage.getResponseByRequestId(reqId);
                    if (!response) continue;
                    auditor = responseAudit.response({ statusCode: response.statusCode, payload: response.payload });
                    const aggregate: any = {};
                    aggregate.request = request;
                    aggregate.request.mutations = mutations;
                    aggregate.response = response;
                    aggregate.response.audit = auditor;
                    this.storage.saveFuzz(fuzzer.id, request.uuid as UUID, operationId, response.statusCode, aggregate);

                    statusCodeCounts.add(response.statusCode);
                }

                statusCodesAgreggate = statusCodesAgreggate.concat(statusCodeCounts.get());
            }

            await this.storage.save(`JDF:${fuzzerId}:SCC`, statusCodesAgreggate);
            this.log.debug(`process: Fuzzer ${fuzzerId} processed successfully.`);

        } catch (e) {
            const errorMsg = `process: The fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new ProcessorException({ message: errorMsg });
        }
    }

    private async getMutation(request: any, fuzzerId: UUID): Promise<any> {
        try {
            const mutations = {};
            const keys = Object.keys(request.params);
            let isValid: boolean[] = [];
            for (const key of keys) {
                const paramType = this.getParamType(key);
                const paramId = request.params[key];
                const mutation = await this.storage.getMutation(paramId, paramType, request.operationId, fuzzerId);
                isValid.push(mutation.valid);
                mutations[paramType] = mutation;
            }
            mutations['isValid'] = isValid.every((valid) => valid);
            return mutations;
        } catch (e) {
            const errorMsg = `getMutation: The mutation ${request.id} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new ProcessorException({ message: errorMsg });
        }
    }

    private async getFuzzer(fuzzerId: UUID): Promise<any> {
        try {
            return await this.storage.getFuzzer(fuzzerId);
        } catch (e) {
            const errorMsg = `getFuzzer: The fuzzer ${fuzzerId} contains errors!: ${e.message}`;
            this.log.error(errorMsg);
            throw new ProcessorException({ message: errorMsg });
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
                this.log.error('Error: unknown parameter type', param);
                throw new ProcessorException({ message: 'Error: unknown parameter type' });
        }
    }


}