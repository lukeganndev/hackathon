import { tradeRoute } from "../_lib/server";

export const POST = (request: Request) => tradeRoute("find", request);
