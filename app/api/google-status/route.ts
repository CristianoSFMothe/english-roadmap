import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { authConfigured } from "@/lib/auth";
import { googleGrant } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!authConfigured) return NextResponse.json({ enabled: false });
  const user = await allowedUser();
  if (!user) return NextResponse.json({ enabled: true, signedIn: false });
  try {
    return NextResponse.json({ enabled: true, signedIn: true, email: user.email, ...(await googleGrant(user.id)) });
  } catch {
    return NextResponse.json({ error: "Falha ao consultar a conta Google." }, { status: 500 });
  }
}
