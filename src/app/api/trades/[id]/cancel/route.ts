import { tradeRoute } from "../../_lib/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return tradeRoute("cancel", request, await context.params);
}
