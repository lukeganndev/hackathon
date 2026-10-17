import { tradeRoute } from "../../../../_lib/server";

export async function POST(request: Request, context: { params: Promise<{ id: string; legId: string }> }) {
  return tradeRoute("confirm", request, await context.params);
}
