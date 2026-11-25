export const memberModuleList=[
  {id:'projects',slug:'projetos',label:'Projetos',navigation:'Meus projetos'},
  {id:'calculator',slug:'calculadora',label:'Calculadora',navigation:'Calculadora de valores'},
  {id:'finance',slug:'faturas',label:'Financeiro pessoal',navigation:'Faturas e metas'},
  {id:'subscriptions',slug:'contas',label:'Assinaturas',navigation:'Contas e assinaturas'},
  {id:'prices',slug:'precos',label:'Monitor de preços',navigation:'Preços acompanhados'},
] as const

export type MemberModule=typeof memberModuleList[number]['id']
export type MemberWorkspace=Record<MemberModule,boolean>&{hidden:MemberModule[]}
export function resolveMemberWorkspace(profile:MemberWorkspace|null,requested:string|null) {
  const allowed=memberModuleList.filter(module=>profile?.[module.id]===true)
  const visible=allowed.filter(module=>!profile?.hidden?.includes(module.id))
  return {allowed,visible,active:visible.find(module=>module.slug===requested)?.id??visible[0]?.id??null}
}
