import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import GlobalErrorHandler from './Controllers/GlobalErrorHandler.js';
import authRouteHandler from './Routes/auth.routes.js'
import userRouteHandler from './Routes/user.routes.js'
import adminRouteHandler from './Routes/admin.routes.js'
import settingsRoutes from "./Routes/settings.routes.js";

export const app = express();

app.use(cookieParser());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use(express.json({
    limit: "16kb",
}));

app.use("/api/v1/auth", authRouteHandler);
app.use("/api/v1/user", userRouteHandler);
app.use("/api/v1/admin", adminRouteHandler);
app.use("/api/v1/settings", settingsRoutes);

app.use(GlobalErrorHandler);