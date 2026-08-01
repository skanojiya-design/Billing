import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, canEdit } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SupplierForm } from "@/components/SupplierForm";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !canEdit(user.role)) redirect("/suppliers");

  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${supplier.name}`} subtitle="Supplier details" />
      <SupplierForm supplier={supplier} />
    </div>
  );
}
