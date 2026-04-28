import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const publicDir =
  process.env["PUBLIC_DIR"]?.trim() ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

export default app;
