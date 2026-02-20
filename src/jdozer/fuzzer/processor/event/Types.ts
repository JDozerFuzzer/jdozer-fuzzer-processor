import { UUID } from "crypto";

export interface JDFEventCraft {
    entityId: UUID,
    eventType: string,
    payload: any
}

export interface JDFEvent {
    headers: Headers,
    payload: any
}

export interface Headers {
    id: UUID,
    timestamp: number,
    version: string,
    entityId: UUID,
    entityType: string,
    eventType: string
}