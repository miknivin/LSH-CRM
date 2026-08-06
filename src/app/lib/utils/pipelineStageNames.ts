import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";

// Resolves pipeline/stage ObjectIds to their display names, batched into a
// single query per collection, for logging human-readable activity entries
// instead of raw ids. Falls back to the id itself if the pipeline/stage was
// since deleted, so a lookup miss never breaks activity logging.
export async function getPipelineStageNameMap(pipelineIds: (string | undefined | null)[], stageIds: (string | undefined | null)[]) {
  const uniquePipelineIds = [...new Set(pipelineIds.filter((id): id is string => Boolean(id)))];
  const uniqueStageIds = [...new Set(stageIds.filter((id): id is string => Boolean(id)))];

  const [pipelines, stages] = await Promise.all([
    uniquePipelineIds.length ? Pipeline.find({ _id: { $in: uniquePipelineIds } }).select("name").lean() : [],
    uniqueStageIds.length ? Stage.find({ _id: { $in: uniqueStageIds } }).select("name").lean() : [],
  ]);

  const pipelineNameById = new Map(pipelines.map((pipeline) => [String(pipeline._id), pipeline.name]));
  const stageNameById = new Map(stages.map((stage) => [String(stage._id), stage.name]));

  return {
    getPipelineName: (id?: string | null) => (id ? pipelineNameById.get(id) ?? id : id),
    getStageName: (id?: string | null) => (id ? stageNameById.get(id) ?? id : id),
  };
}
