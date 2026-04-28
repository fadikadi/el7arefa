import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
  // Express 5 / path-to-regexp v8 rejects app.get("*"); use middleware for SPA fallback.
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  if (res.headersSent) return;
  const msg =
    process.env.NODE_ENV !== "production" && err instanceof Error
      ? err.message
      : "Internal server error";
  res.status(500).json({ message: msg });
});

export default app;
