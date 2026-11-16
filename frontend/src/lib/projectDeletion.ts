import {api} from '@/lib/api'

export function hasProjectDeletionConfirmation(name:string,confirmation:string):boolean {
  return name.length>0&&confirmation===name
}

export async function deleteConfirmedProject(project:{id:string;name:string},confirmation:string):Promise<void> {
  if(!hasProjectDeletionConfirmation(project.name,confirmation))throw new Error('Digite exatamente o nome do projeto para confirmar a exclusão.')
  await api.delete('/api/v1/personal/projects/'+encodeURIComponent(project.id),{confirmation_name:confirmation})
}
