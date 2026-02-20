import { UUID } from "crypto";

export interface FuzzerRequest {
    uuidReq: UUID
    operationId: string;
    url: URL;
    params?: {
        payloadId?: UUID;
        pathId?: UUID;
        headersId?: UUID;
        queryId?: UUID;
    };
    /**
     * Base64 encoded
     */
    payload: string;
    beforeRequest: string;
    afterResponse: string;
    catchErrors: string;
    method: string;
    timeout: number;
    uuid: UUID;
    https: {};
    defaultName: string;
    body: string;
    followRedirect: boolean;
    decompress: boolean;
    headers: Record<string, string>;
    throwHttpErrors: boolean;
    retry: number;
    mutations?: {
        payload?: Mutation;
        path?: Mutation;
        query?: Mutation;
        headers?: Mutation;
        isValid: boolean;
    };
}

export interface Mutation {
    valid: boolean;
    data: string;
    property: string;
    message: string;
    id: string;
    vectorId: number;
}

export interface FuzzerResponse {
    uuidReq: UUID;
    /**
     * Base64 encoded
     */
    payload: string;
    headers: Record<string, string>;
    ip: string;
    complete: boolean;
    statusCode: number;
    statusMessage: string;
    url: URL;
    aborted: boolean;
    timings: {
        start: number,
        socket: number,
        lookup: number,
        connect: number,
        upload: number,
        response: number,
        end: number,
        phases: {
            wait: number,
            dns: number,
            tcp: number,
            request: number,
            firstByte: number,
            download: number,
            total: number
        }
    };
    time: number;
    audit: {
        statusCode: Audit;
        payload: Audit;
        headers: Audit;
        path: Audit;
        query: Audit;
    };
}

export interface Audit {
    isValid: boolean;
    errors: any[];
}

export interface Fuzzer {
    id: string;
    fuzzerId: UUID;
    caseId: UUID;
    operationId: string;
    request: FuzzerRequest;
    response: FuzzerResponse;
}

export interface SecurityFinding {
    id: string;
    type: FindingType;
    severity: SeverityLevel;
    title: string;
    category: string;
    subCategory: string;
    context: string;
    tags: string[];
    technique: string;
    browserSpecific: string;
    description: string;
    evidence: {
        endpoint: string;
        method: string;
        requestId: string;
        timestamp: number;
        details: Record<string, any>;
    };
    recommendation: string[];
    confidence: number; // 0-100
    metadata: {
        detector: string;
        patternId: string;
        references?: string[];
    };
}

export type FindingType =
    | 'DOS_RATE_LIMITING'
    | 'STATUS_CODE_VALIDATION'
    | 'XSS_STORED'
    | 'XSS_REFLECTED'
    | 'REQUEST_PAYLOAD_SCHEMA_VALIDATION'
    | 'RESPONSE_PAYLOAD_SCHEMA_VALIDATION'
    | 'SCHEMA_VALIDATION'
    | 'CONTRACT_VIOLATION'
    | 'RESOURCE_EXHAUSTION'
    | 'INFORMATION_DISCLOSURE'
    | 'AUTH_BYPASS'
    | 'SQL_INJECTION'
    | 'PATH_TRAVERSAL'
    | 'CUSTOM';

export type SeverityLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PatternDetectionResult {
    findings: SecurityFinding[];
    statistics: {
        totalRequests: number;
        endpointsAnalyzed: number;
        detectionTime: number;
        findingsByType: Record<FindingType, number>;
        findingsBySeverity: Record<SeverityLevel, number>;
    };
    summary: {
        mostAffectedEndpoint: string;
        highestSeverityFinding: SeverityLevel;
        timeline: Array<{
            timestamp: number;
            event: string;
            findingId?: string;
        }>;
    };
}

export interface Vector {
    id: number;
    description: string;
    script: string;
    type: string;
    owasp_category: string;
    subcategory: string;
    context: string;
    tags: string;
    technique: string;
    browser_specific: string;
}

export interface SchemaValidation {
    in: string;
    type: FindingType;
    severity: SeverityLevel;
    title: string;
    tags: string[];
    errors: Map<string, string>;
    recommendation: string[];
}

export interface StatusCodeValidation {
    /**
     * Response statusCode
     */
    statusCode: number;
    /**
     * Array of matched status codes ex: ['200', 'default']
     */
    matchedStatusCode: Array<string>;
    /**
     * True if the response status code matches the expected status code
     */
    isValid: boolean;
    /**
     * Array of messages
     */
    messages?: Array<string>;
    severity: SeverityLevel;
    validations?: Map<string, any>;
}

export interface Validation {
    in: 'statusCode' | 'payload' | 'headers' | 'path' | 'query';
    type: FindingType;
    severity: SeverityLevel;
    title: string;
    tags: string[];
    messages: Array<[string, string]>;
    recommendation: string[];
    validation: any;
}

export interface SecurityEvidence {
    endpoint: string;
    method: string;
    payload: any,
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
        time: number;
    },
    indicators: string[],
    requestId: UUID,
    timestamp: number
}