import { UUID } from "crypto";


export class Mutation {

    isValid: boolean;
    mutationId: UUID;
    operationId: string;
    requestId: UUID;
    description: string;
    type: string;

    constructor(isValid: boolean, mutationId: UUID, operationId: string, requestId: UUID, description: string, type: string) {
        this.isValid = isValid;
        this.mutationId = mutationId;
        this.operationId = operationId;
        this.requestId = requestId;
        this.description = description;
        this.type = type;
    }

}