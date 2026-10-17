import { tradeRoute } from "./_lib/server";

export const dynamic = "force-dynamic";
export const GET = (request: Request) => tradeRoute("list", request);
export const POST = (request: Request) => tradeRoute("create", request);
