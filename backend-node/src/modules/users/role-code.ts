const MAX_ROLE_CODE_LENGTH=78;

export function roleCodeBase(name:string){
 const normalized=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_');
 const safe=(normalized||'ROLE').replace(/^[^A-Z]+/,'')||'ROLE';
 return safe.slice(0,MAX_ROLE_CODE_LENGTH).replace(/_+$/,'')||'ROLE';
}

export function roleCodeCandidate(base:string,index:number){
 if(index<=1)return base;
 const suffix=`_${index}`;
 return `${base.slice(0,MAX_ROLE_CODE_LENGTH-suffix.length).replace(/_+$/,'')}${suffix}`;
}
