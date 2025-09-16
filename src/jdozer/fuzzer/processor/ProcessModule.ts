import { Module } from '@nestjs/common';
import { RedisEventsGateway } from './event/RedisEventGateway';
import { RedisService } from './persistence/RedisService';
import { JDozerFuzzerProcessor } from './JDozerFuzzerProcessor';
import { ConfigModule } from '@nestjs/config';
import { Storage } from './persistence/Storage';

@Module({
    controllers: [],
    imports: [ConfigModule.forRoot({
        isGlobal: true,
        expandVariables: true
    })],
    providers: [Storage, RedisService, JDozerFuzzerProcessor, RedisEventsGateway]
})
export class ProcessModule { }
