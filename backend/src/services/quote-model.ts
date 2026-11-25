import { InputError } from './personal'

const MAX_PRICE=100_000_000
const MAX_LINES=30
const MAX_QUANTITY=10_000_000

type Unit='fixed'|'unit'|'hour'
type Period='once'|'monthly'
type QuoteLine={id:string;label:string;unit:Unit;period:Period;priceCents:number}
export type QuoteModel={version:1;name:string;baseCents:number;monthlyCents:number;discountBps:number;lines:QuoteLine[]}

function invalid(message:string):never {throw new InputError(message,400)}
function record(value:unknown,keys?:string[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))return invalid('Esperado um objeto JSON.')
  const object=value as Record<string,unknown>
  if(keys&&Object.keys(object).some(key=>!keys.includes(key)))return invalid('O JSON contém campos fora do modelo aceito.')
  return object
}
function integer(value:unknown,max:number,label:string):number {
  if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>max)return invalid(label+' fora do intervalo aceito.')
  return value
}
function name(value:unknown,label:string):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>80)return invalid(label+' deve ter de 1 a 80 caracteres.')
  return value.trim()
}

export function parseQuoteModel(input:unknown):QuoteModel {
  const data=record(input,['version','name','baseCents','monthlyCents','discountBps','lines'])
  if(data.version!==1)return invalid('Versão do modelo não suportada. Use a versão 1.')
  if(!Array.isArray(data.lines)||data.lines.length>MAX_LINES)return invalid('O modelo pode ter no máximo 30 itens.')
  const ids=new Set<string>()
  const lines:QuoteLine[]=data.lines.map(item=>{
    const line=record(item,['id','label','unit','period','priceCents'])
    if(typeof line.id!=='string'||!/^[a-z][a-z0-9_-]{0,39}$/.test(line.id)||ids.has(line.id)||line.id==='constructor')return invalid('Cada item precisa de um identificador único e válido.')
    ids.add(line.id)
    if(line.unit!=='fixed'&&line.unit!=='unit'&&line.unit!=='hour')return invalid('Escolha cobrança fixa, por unidade ou por hora.')
    if(line.period!=='once'&&line.period!=='monthly')return invalid('Escolha cobrança única ou mensal.')
    return {id:line.id,label:name(line.label,'O nome do item'),unit:line.unit,period:line.period,priceCents:integer(line.priceCents,MAX_PRICE,'Preço do item')}
  })
  return {version:1,name:name(data.name,'O nome do modelo'),baseCents:integer(data.baseCents,MAX_PRICE,'Preço base'),monthlyCents:integer(data.monthlyCents,MAX_PRICE,'Mensalidade base'),discountBps:integer(data.discountBps,10000,'Desconto'),lines}
}

export function calculateQuote(model:QuoteModel,input:unknown) {
  const quantities=record(input,model.lines.map(line=>line.id))
  let subtotalCents=model.baseCents
  let monthlyCents=model.monthlyCents
  const lines=model.lines.map(line=>{
    const quantity=integer(Object.hasOwn(quantities,line.id)?quantities[line.id]:0,MAX_QUANTITY,'Quantidade de '+line.label)
    if((line.unit==='fixed'&&quantity!==0&&quantity!==1000)||(line.unit==='unit'&&quantity%1000!==0))return invalid('Quantidade incompatível com '+line.label+'.')
    const amountCents=Math.floor((line.priceCents*quantity+500)/1000)
    if(line.period==='monthly')monthlyCents+=amountCents
    else subtotalCents+=amountCents
    return {id:line.id,label:line.label,period:line.period,amountCents}
  })
  const discountCents=Number((BigInt(subtotalCents)*BigInt(model.discountBps)+5000n)/10000n)
  return {lines,subtotalCents,discountCents,oneTimeCents:subtotalCents-discountCents,monthlyCents}
}
