import {configuration,body,sameOrigin,failure} from './server';
import {calculate} from './engine.mjs';

// The public, stateless calculate path does not need React/Next request context.
// Stored calculations still use the normal route, including owner checks,
// encryption, consent handling and audit logging.
export async function transientCalculation(request:Request){
  try{
    sameOrigin(request);const data=await body(request);
    if(data.consent!==false)return new Request(request,{body:JSON.stringify(data)});
    const result=calculate(data.input,await configuration());
    return Response.json({...result,id:null,calculatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return failure(e);}
}
