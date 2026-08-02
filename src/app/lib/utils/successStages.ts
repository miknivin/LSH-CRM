import Stage from "@/app/models/Stage";

export async function getSuccessStageIds(): Promise<string[]> {
  const stages = await Stage.find({ isSuccess: true }).select("_id").lean();
  return stages.map((stage) => String(stage._id));
}
