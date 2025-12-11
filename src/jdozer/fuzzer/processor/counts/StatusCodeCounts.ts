import { Logger } from "@nestjs/common";


export class StatusCodeCounts {

    private readonly log = new Logger(StatusCodeCounts.name);

    private operation: string;
    private url: string;
    private method: string;
    private statusCodeCount = {};

    constructor(operation: string, url: string, method: string) {
        this.operation = operation;
        this.url = url;
        this.method = method;
    }

    add(statusCode: number): void {
        try {
            if (this.statusCodeCount[statusCode]) {
                this.statusCodeCount[statusCode].count++;
            } else {
                this.statusCodeCount[statusCode] = { count: 1 };
            }
        } catch (e) {
            const err = `An error occurred while adding the status code.`;
            this.log.error(err, e.message);
            throw e;
        }
    }

    get(): any[] {
        try {
            if (Object.keys(this.statusCodeCount).length === 0) {
                return [{
                    operation: this.operation,
                    method: this.method,
                    url: this.url,
                    cant: 0,
                    statusCode: undefined
                }];
            } else {
                return Object.keys(this.statusCodeCount).map(key => {
                    return {
                        operation: this.operation,
                        method: this.method,
                        url: this.url,
                        cant: this.statusCodeCount[key].count,
                        statusCode: key
                    };
                });
            }
        } catch (e) {
            const err = `Error trying to process the number of status codes.`;
            this.log.error(err, e.message);
            throw e;
        }
    }
}