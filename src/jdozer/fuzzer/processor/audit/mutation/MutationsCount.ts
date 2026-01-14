import { UUID } from "crypto";


export class MutationsCount {

    private readonly operationId: string;
    private readonly mutations: any = {};

    constructor(operationId: string) {
        this.operationId = operationId;
    }

    public addMutation(mutationId: UUID) {
        this.mutations[mutationId.toString()] = { requestIds: [] };
    }

    public addRequest(mutationId: UUID, requestId: UUID) {
        this.mutations[mutationId.toString()].requestIds.push(requestId);
    }

    public getMutation(mutationId: UUID) {
        return this.mutations[mutationId.toString()];
    }

    public getOperationId() {
        return this.operationId;
    }

}