import { redirect } from "next/navigation";
import { diseases, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return diseases().map((d) => ({ slug: slugOf(d.id) }));
}

// The patient action view is now steps 3 and 4 of the disease page; old links land there.
export default async function ActionRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/disease/${slug}#next`);
}
