import { Logger } from "@nestjs/common";


export class Router {

    private readonly log = new Logger(Router.name);

    constructor() {
    }

    route(event: any) {
        try {
            this.log.log(`[route] Routing event: ${event}`);
            if (!event || !event.entityType || !event.eventType || !event.data || !event.entityId) {
                this.log.error(`[route] Invalid event structure: ${event}`);
                return;
            }

            if ('fuzzer-engine' === event.entityType) {
                this.engine(event);
            }

        } catch (e) { }
    }

    private engine(event: any) {
        try {

            this.log.log(`[engine] Routing event: ${event}`);

            if ('response-received' === event.eventType) {

            }

        } catch (e) { }
    }

}