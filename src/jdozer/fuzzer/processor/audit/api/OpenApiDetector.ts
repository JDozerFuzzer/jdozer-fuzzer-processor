import { Logger } from "@nestjs/common";
import { RedisService } from "../../persistence/RedisService";
import { BaseDetector } from "../BaseDetector";
import { Audit, Fuzzer, Mutation, SecurityFinding, Validation } from "../Types";
import { ResponsePayloadDetector } from "./ResponsePayloadDetector";
import { StatusCodeDetector } from "./StatusCodeDetector";
import { OpenApiException } from "./OpenApiException";
import { RequestPayloadDetector } from "./RequestPayloadDetector";


export class OpenApiDetector {


    private readonly log = new Logger(OpenApiDetector.name);

    private readonly redisService: RedisService;

    private fuzzer: Fuzzer;

    constructor(fuzzer: Fuzzer, redisService: RedisService) {
        //super(fuzzer);
        this.fuzzer = fuzzer;
        this.redisService = redisService;
    }

    public async detect(): Promise<Validation[]> {
        try {

            const validations: Validation[] = [];
            const operation: any = await this.redisService.get(`JDF:${this.fuzzer.fuzzerId}:OP:${this.fuzzer.operationId}`);

            const statusCodeValidation: Validation = await this.statusCodeValidation(operation);
            validations.push(statusCodeValidation);

            if (statusCodeValidation.validation.isValid) {
                const responseSchemaValidation: Validation = await this.responseSchemaValidation(operation, statusCodeValidation);
                validations.push(responseSchemaValidation);
            }

            const requestValidation: Validation = await this.requestSchemaValidation(operation);
            validations.push(requestValidation);

            return validations;

        } catch (e) {
            this.log.error(`Error detecting API`, e);
            throw new OpenApiException(`Error detecting OpenAPI: ${e.message}`);
        }
    }

    private async requestSchemaValidation(operation: any): Promise<Validation> {
        const requestDetector: RequestPayloadDetector = new RequestPayloadDetector(this.fuzzer, this.redisService);
        return await requestDetector.detectAux(operation.req);
    }

    private async statusCodeValidation(operation: any): Promise<Validation> {
        const statusCodeDetector: StatusCodeDetector = new StatusCodeDetector(operation.res, this.redisService);
        return await statusCodeDetector.detect(this.fuzzer.response.statusCode);
    }

    private async responseSchemaValidation(operation: any, statusCodeValidation: Validation): Promise<Validation> {
        const responseSchemaDetector: ResponsePayloadDetector = new ResponsePayloadDetector(this.fuzzer, this.redisService);
        return await responseSchemaDetector.detect(operation.res.filter(res => res.statusCode === statusCodeValidation.validation.matchedStatusCode)[0], statusCodeValidation);
    }

}