ALTER TABLE "LilyMission" ADD COLUMN "audienceV2Json" TEXT NOT NULL DEFAULT '{"mode":"all","levels":[],"users":[]}';
ALTER TABLE "LilyMission" ADD COLUMN "workflowGeneration" TEXT NOT NULL DEFAULT 'legacy';
