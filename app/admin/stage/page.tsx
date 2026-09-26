import { DrawStage } from "@/components/draw-stage";
import { getDrawStageData } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DrawStagePage() {
  await requireAdminPage();
  const data = await getDrawStageData();

  return (
    <DrawStage
      eventName={data.event.name}
      drawClosed={data.event.draw_status === "closed"}
      sampleIds={data.sampleIds}
      initialCompletedDraws={data.completedDraws}
    />
  );
}
