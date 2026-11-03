import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { loadAdminDashboardData } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Quản trị" };

export default function AdminPage({
  searchParams,
}: PageProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <div
            aria-label="Đang tải khu vực quản trị"
            className="mx-auto h-[420px] max-w-md animate-pulse rounded-[28px] bg-white shadow-soft"
          />
        </AdminShell>
      }
    >
      <AdminSession searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminSession({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  await connection();
  void searchParams;

  const configured = Boolean(getSupabaseConfig());
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";

  if (!configured || !adminEmail) {
    return (
      <AdminShell>
        <AdminLoginForm adminEmail={adminEmail} configured={configured} />
      </AdminShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh phiên quản trị Supabase.", error);
  }

  if (data.user?.email?.toLowerCase() === adminEmail) {
    const dashboard = await loadAdminDashboardData();
    return (
      <AdminShell>
        <AdminDashboard
          email={data.user.email}
          data={dashboard.data}
          loadError={dashboard.error}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <AdminLoginForm
        adminEmail={adminEmail}
        configured
        unauthorized={Boolean(data.user)}
      />
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[75vh] bg-[#f7f8fb] py-8 sm:py-12">
      <div className="container-shell">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-cobalt"
        >
          <span aria-hidden="true">←</span> Về cửa hàng
        </Link>
        {children}
      </div>
    </div>
  );
}
