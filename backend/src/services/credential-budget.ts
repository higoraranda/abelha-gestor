import { createHash } from 'node:crypto'

const accountLimit=12, processLimit=90, minute=60_000, accountWindow=10*minute

// A bounded, process-local safety net for the invitation-sized deployment.
// Use a shared rate limiter before scaling to multiple replicas.
export function createCredentialBudget(now=Date.now) {
  const accounts=new Map<string,{count:number;until:number}>()
  let windowEnd=0, used=0
  const key=(email:string)=>createHash('sha256').update(email).digest('hex')
  return {
    reserve(email:string){
      const time=now()
      if(time>=windowEnd){
        windowEnd=time+minute;used=0
        for(const [id,record] of accounts)if(record.until<=time)accounts.delete(id)
      }
      if(used>=processLimit)return false
      const identity=key(email)
      const prior=accounts.get(identity)
      const attempt=prior&&prior.until>time?prior:{count:0,until:time+accountWindow}
      if(attempt.count>=accountLimit)return false
      used++;attempt.count++
      accounts.set(identity,attempt)
      return true
    },
    success(email:string){accounts.delete(key(email))},
  }
}
