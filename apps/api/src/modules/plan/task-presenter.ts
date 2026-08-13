import { parseJson } from "../../lib/errors";

export function presentTask(task: any) {
  return {
    ...task,
    evidence: parseJson(task.evidenceJson, []), dependencies: task.dependsOn?.map((item: any) => item.dependency) ?? [],
    evidenceJson: undefined, dependsOn: undefined,
    runs: task.runs?.map((run: any) => ({ ...run,
      report: run.report ? { ...run.report, successes: parseJson(run.report.successesJson, []), failures: parseJson(run.report.failuresJson, []), recommendations: parseJson(run.report.recommendationsJson, []), evidence: parseJson(run.report.evidenceJson, []), successesJson: undefined, failuresJson: undefined, recommendationsJson: undefined, evidenceJson: undefined } : undefined,
      communications: run.communications?.map((item: any) => ({ ...item, metadata: parseJson(item.metadataJson, {}), metadataJson: undefined }))
    }))
  };
}
