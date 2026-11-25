BEGIN;
ALTER TABLE personal_projects
  ADD COLUMN pipeline_stage text CHECK (pipeline_stage IN ('backlog','planning','development','testing','staging','awaiting_approval','production','completed')),
  ADD COLUMN pipeline_links jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(pipeline_links)='object');
COMMIT;
