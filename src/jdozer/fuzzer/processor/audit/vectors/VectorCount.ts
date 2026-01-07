import { UUID } from "crypto";


export class VectorCount {

    private readonly operationId: string;
    private readonly vectors: any = {};

    constructor(operationId: string) {
        this.operationId = operationId;
    }

    public addVector(vectorId: number) {
        this.vectors[vectorId.toString()] = { requestIds: [] };
    }

    public addRequest(vectorId: number, requestId: UUID) {
        this.vectors[vectorId.toString()].requestIds.push(requestId);
    }

    public getVector(vectorId: number) {
        return this.vectors[vectorId.toString()];
    }

    public getOperationId() {
        return this.operationId;
    }

}