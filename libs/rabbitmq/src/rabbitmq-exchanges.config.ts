import { RabbitMQExchangeConfig } from "@golevelup/nestjs-rabbitmq";
import { RABBITMQ_EXCHANGES } from "./contracts/constants/exchanges.constants";

export function getRabbitMqExchangesConfig(): RabbitMQExchangeConfig[] {
    return Object.values(RABBITMQ_EXCHANGES).map((exchnage) => ({
        name: exchnage.name,
        type: exchnage.type,
        options: { durable: exchnage.durable }
    }));
}