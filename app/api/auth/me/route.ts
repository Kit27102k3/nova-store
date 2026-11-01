import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };

  if (!getSupabaseConfig()) {
    return NextResponse.json({ user: null }, { headers });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh phiên tài khoản Supabase.", error);
    return NextResponse.json(
      { error: "Không thể tải trạng thái tài khoản." },
      { status: 500, headers },
    );
  }

  const user = data.user;

  return NextResponse.json(
    {
      user: user?.email
        ? {
            email: user.email,
            name:
              typeof user.user_metadata.full_name === "string"
                ? user.user_metadata.full_name
                : null,
          }
        : null,
    },
    { headers },
  );
}
