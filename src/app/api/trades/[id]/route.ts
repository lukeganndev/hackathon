import { tradeRoute } from "../_lib/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return tradeRoute("detail", request, await context.params);
}
