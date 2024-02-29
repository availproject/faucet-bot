import winston from "winston";
const { combine, timestamp, json, errors } = winston.format;

export const logger = winston.createLogger({
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
  ],
});
