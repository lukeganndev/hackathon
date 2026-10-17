import { tradeRoute } from "../../_lib/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return tradeRoute("accept", request, await context.params);
}
