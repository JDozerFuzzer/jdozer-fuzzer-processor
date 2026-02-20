import Ajv, { ValidateFunction } from "ajv";
import AjvDraft04 from "ajv-draft-04";
import addFormats from "ajv-formats";
import { Fuzzer, Mutation, SecurityFinding, Audit } from "./Types";
import { BaseDetectorException } from "./BaseDetectorException";
import { Logger } from "@nestjs/common";
import { SchemaUtils } from "../common/SchemaUtils";



export abstract class BaseDetector {

    private readonly logger: Logger = new Logger(BaseDetector.name);
    protected readonly fuzzer: Fuzzer;
    private readonly schemaUtils: SchemaUtils;

    constructor(fuzzer: Fuzzer) {
        this.fuzzer = fuzzer;
        this.schemaUtils = new SchemaUtils();
    }

    //abstract detect(): Promise<SecurityFinding[]>;

    protected isVulnerable(): boolean {
        return this.fuzzer.response.audit.statusCode.isValid && this.fuzzer.response.audit.payload.isValid;
    }

    private isValid(mutation: Mutation): Mutation | null {
        return mutation && mutation.valid ? mutation : null;
    }

    protected getPayloadVector(): Mutation | undefined {
        const payload: Mutation | undefined = this.fuzzer.request.mutations.payload;
        return payload?.vectorId ? payload : undefined;
    }

    private getAudit(audit: Audit): Audit | null {
        return audit ? audit : null;
    }

    protected getAuditPayload(): Audit | null {
        return this.getAudit(this.fuzzer.response.audit.payload);
    }

    protected getMutationPayload(): Mutation | null {
        return this.isValid(this.fuzzer.request.mutations.payload);
    }

    protected getMutationHeaders(): Mutation | null {
        return this.isValid(this.fuzzer.request.mutations.headers);
    }

    protected getMutationPath(): Mutation | null {
        return this.isValid(this.fuzzer.request.mutations.path);
    }

    protected getMutationQuery(): Mutation | null {
        return this.isValid(this.fuzzer.request.mutations.query);
    }

    protected isMutation(): boolean {
        return this.fuzzer.request.mutations.isValid;
    }

    protected decodeBase64(payload: string | undefined): string {
        try {
            return Buffer.from(payload, 'base64').toString('utf-8');
        } catch (e) {
            const errorMsg = `getPayload: Response body is not a valid encode base64`;
            this.logger.error(errorMsg, e.message, payload);
            throw new BaseDetectorException(errorMsg);
        }
    }

    protected getValidator(schema: any): ValidateFunction {
        try {
            const newSchema: any = this.schemaUtils.enforceStrictProperties(schema);
            return this.schemaUtils.getValidator(newSchema).compile(newSchema);
        } catch (e) {
            const errorMsg = `getValidator: Error retrieving validator`;
            this.logger.error(errorMsg, e.message, schema);
            throw new BaseDetectorException(errorMsg);
        }
    }

}