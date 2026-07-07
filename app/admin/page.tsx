import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { ADMIN_COOKIE_NAME, isValidSessionToken } from "@/lib/adminAuth";
import { getAllProducts } from "@/lib/data/productStore";
import { getAllOrders } from "@/lib/data/orderStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const authed = isValidSessionToken(cookies().get(ADMIN_COOKIE_NAME)?.value);

  if (!authed) {
    return <AdminLoginForm />;
  }

  const products = getAllProducts();
  const orders = getAllOrders();

  return <AdminDashboard initialProducts={products} initialOrders={orders} />;
}
