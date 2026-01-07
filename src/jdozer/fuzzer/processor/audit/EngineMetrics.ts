import { Logger } from "@nestjs/common";
import { UUID } from "crypto";
import fs from 'fs';


export class EngineMetrics {

    private readonly log: Logger = new Logger(EngineMetrics.name);

    constructor() { }

    async read(fuzzerId: UUID): Promise<any> {
        try {

            const path: string = `/tmp/${fuzzerId}-summary.json`;
            const summary: any = require(path);
            const counters = summary.aggregate.counters;

            this.log.verbose(`Summary: ${counters}`);

            const localSummary = {
                id: fuzzerId,
                vusers: {
                    created: counters[`vusers.created`],
                    failed: counters[`vusers.falied`],
                    completed: counters[`vusers.completed`],
                    skipped: counters[`vusers.skipped`],
                    byOperations: Object.keys(counters)
                        .filter(r => r.indexOf(`vusers.created_by_name.`) === 0)
                        .map(r => {
                            return { name: r.split(`.`)[2], cant: counters[`${r}`] };
                        })
                },
                http: {
                    request: counters[`http.request`],
                    responses: counters[`http.responses`],
                    codes: Object.keys(counters)
                        .filter(c => c.indexOf(`http.codes.`) === 0)
                        .map(k => {
                            return { code: k.split(`.`)[2], cant: counters[`${k}`] }
                        })
                },
                endpoints: Object.keys(counters)
                    .filter(k => k.indexOf(`plugins.metrics-by-endpoint.`) === 0)
                    .map(k => {
                        return {
                            endpoint: k.split(`.`)[2],
                            cant: counters[`${k}`],
                            code: (k.split(`.`)[3] === 'codes' ? k.split(`.`)[4] : undefined),
                            error: (k.split(`.`)[3] === 'errors' ? k.split(`.`)[4] : undefined)
                        }
                    })
            };

            return localSummary;

        } catch (e) {
            const err = `An error occurred while trying to obtain engine metrics.`;
            this.log.error(err, e.message);
            throw new Error(err);
        }
    }

}