import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import gamesRouter from "./games";
import registrationsRouter from "./registrations";
import teamsRouter from "./teams";
import notificationsRouter from "./notifications";
import statsRouter from "./stats";
import pushRouter from "./push";
import motmRouter from "./motm";
import invitesRouter from "./invites";
import playersRouter from "./players";
import adminResetRouter from "./admin-reset";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(gamesRouter);
router.use(registrationsRouter);
router.use(teamsRouter);
router.use(notificationsRouter);
router.use(statsRouter);
router.use(pushRouter);
router.use(motmRouter);
router.use(invitesRouter);
router.use(playersRouter);
router.use(adminResetRouter);

export default router;
