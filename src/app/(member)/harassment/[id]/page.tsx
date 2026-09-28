"use client";
import { use } from "react";
import { MemberRouteRedirect } from "@/components/modules/MemberRouteRedirect";
export default function Redirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MemberRouteRedirect section={`/harassment/${id}`} />;
}
