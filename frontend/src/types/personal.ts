import type { PipelineLink, ProjectStage } from '@/lib/personalProjectStatus'
export interface PersonalNotice {id:string;title:string;detail:string;url:string;read_at:string|null;created_at:string}
export interface PersonalPreferences {preferences:{morning_time:string|null;weekly_time:string|null;timezone:string};push_configured:boolean;vapid_public_key:string|null}
export interface PersonalProject {id:string;name:string;description:string;repository:string|null;main_branch:string;status:string;next_step:string;blockers:string;updated_at:string;milestone_count:number;completed_count:number;current_milestone:string|null;pipeline_stage?:ProjectStage|null;pipeline_links?:Partial<Record<PipelineLink,string>>;latest_update_kind?:string|null}
export interface ProjectMilestone {id:string;title:string;acceptance:string;completed_at:string|null}
export interface ProjectUpdate {id:string;kind:string;summary:string;created_at:string;reviewed_at:string|null;report:{commit:string;pull_request?:string;tests:{name:string;command:string;result:string;evidence_url:string}[];acceptance:string[];next_step:string;blockers:string[]}|null}
export interface ProjectDetails {project:PersonalProject;milestones:ProjectMilestone[];updates:ProjectUpdate[]}
