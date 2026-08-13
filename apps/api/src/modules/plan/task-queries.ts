export const taskListInclude = {
  pillar: true, milestone: true, owner: true,
  dependsOn: { include: { dependency: { select: { id: true, title: true, status: true } } } },
  transitions: { orderBy: { createdAt: "desc" as const }, take: 10 },
  runs: { orderBy: { createdAt: "desc" as const }, take: 3 },
  questions: { where: { status: "pending" }, orderBy: { createdAt: "desc" as const }, take: 3 },
  uploads: { orderBy: { createdAt: "desc" as const }, take: 10 }
};

export const taskDetailInclude = {
  ...taskListInclude,
  transitions: { orderBy: { createdAt: "desc" as const }, take: 100 },
  auditEvents: { orderBy: { createdAt: "desc" as const }, take: 100 },
  browserNavigations: { orderBy: { createdAt: "desc" as const }, take: 20 },
  runs: { orderBy: { createdAt: "desc" as const }, take: 20, include: {
    agent: true, report: true, communications: { orderBy: { createdAt: "asc" as const } }, steps: { orderBy: { order: "asc" as const } },
    messages: { orderBy: { createdAt: "asc" as const }, take: 100 }, usage: { orderBy: { createdAt: "asc" as const } }, uploads: { orderBy: { createdAt: "desc" as const }, take: 20 }
  }}
};
