export type QuoteLine={id:string;label:string;unit:'fixed'|'unit'|'hour';period:'once'|'monthly';priceCents:number}
export type QuoteModel={version:1;name:string;baseCents:number;monthlyCents:number;discountBps:number;lines:QuoteLine[]}
export type SavedModel={id:string;revision:number;model:QuoteModel;updated_at:string}
export type Quote={lines:{id:string;label:string;period:QuoteLine['period'];amountCents:number}[];subtotalCents:number;discountCents:number;oneTimeCents:number;monthlyCents:number}
export const emptyModel:QuoteModel={version:1,name:'',baseCents:0,monthlyCents:0,discountBps:0,lines:[]}
export const example:QuoteModel={version:1,name:'Exemplo de fotografia',baseCents:15000,monthlyCents:0,discountBps:500,lines:[
  {id:'cobertura',label:'Cobertura',unit:'hour',period:'once',priceCents:12000},
  {id:'deslocamento',label:'Deslocamento',unit:'fixed',period:'once',priceCents:5000},
  {id:'fotos',label:'Fotos extras',unit:'unit',period:'once',priceCents:800},
  {id:'galeria',label:'Galeria online',unit:'fixed',period:'monthly',priceCents:2500},
]}
export const modelingPrompt=`Ajude-me a criar um modelo de precificação para o Abelha. Pergunte quais são os serviços, preços, adicionais, condições de cobrança e mensalidades que ainda faltarem. Não invente valores nem solicite dados de clientes, senhas ou chaves. Use somente o formato de exemplo abaixo. Retorne um único JSON válido, sem Markdown, comentários, código ou campos extras. Mantenha version: 1. Preços e bases são inteiros em centavos de real (R$ 10,50 = 1050); desconto é inteiro em pontos-base (5% = 500), somente sobre a cobrança única. Para itens, unit aceita fixed, unit ou hour; period aceita once ou monthly. Limite: 30 itens, nomes de até 80 caracteres, IDs únicos com letras minúsculas, números, hífen ou sublinhado, começando com letra. Use zero para cobranças base que não se aplicam. Se uma regra não couber, explique antes de gerar o JSON e peça uma alternativa. Os valores abaixo são fictícios e não devem ser reutilizados.\n\n${JSON.stringify(example,null,2)}\n\nMeu negócio e como cobro: [preencher]`

export function scaled(value:string,digits:number,label:string):number {
  const input=value.trim()
  if(!input)return 0
  const [whole,decimal='']=input.replace(',','.').split('.')
  if(!/^\d+(?:[.,]\d+)?$/.test(input)||decimal.length>digits)throw new Error(label+' precisa ser um número não negativo com até '+digits+' casas decimais.')
  const result=Number(whole)*10**digits+Number(decimal.padEnd(digits,'0'))
  if(!Number.isSafeInteger(result))throw new Error(label+' excede o limite.')
  return result
}

// Preview of the server's integer-cent calculation. Persisted totals come from the API.
export function calculateQuotePreview(model:QuoteModel, quantities:Record<string,number>, optionalItems:readonly string[]=[]){
  const optional = new Set(optionalItems)
  const checkedInteger = (value:number,max:number,label:string) => {
    if(!Number.isInteger(value)||value<0||value>max)throw new Error(`${label} fora do intervalo aceito.`)
    return value
  }
  let subtotalCents=checkedInteger(model.baseCents,100_000_000,'Investimento base')
  let monthlyCents=checkedInteger(model.monthlyCents,100_000_000,'Mensalidade base')
  const discountBps=checkedInteger(model.discountBps,10_000,'Desconto')
  const lines=model.lines.map(line=>{
    const quantity=checkedInteger(quantities[line.id]??0,10_000_000,'Quantidade de '+line.label)
    if((line.unit==='fixed'&&quantity!==0&&quantity!==1000)||(line.unit==='unit'&&quantity%1000!==0)){
      throw new Error(`Quantidade incompatível com ${line.label}.`)
    }
    const price=checkedInteger(line.priceCents,100_000_000,'Preço de '+line.label)
    const amountCents=Number((BigInt(price)*BigInt(quantity)+500n)/1000n)
    if(!optional.has(line.id)){
      if(line.period==='monthly')monthlyCents+=amountCents
      else subtotalCents+=amountCents
    }
    return {id:line.id,label:line.label,period:line.period,amountCents}
  })
  const discountCents=Number((BigInt(subtotalCents)*BigInt(discountBps)+5000n)/10000n)
  const quote:Quote={lines,subtotalCents,discountCents,oneTimeCents:subtotalCents-discountCents,monthlyCents}
  return {quote,options:lines.filter(line=>optional.has(line.id)&&quantities[line.id]>0)}
}
