

export class OpenApiException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OpenApiException';
    }
}