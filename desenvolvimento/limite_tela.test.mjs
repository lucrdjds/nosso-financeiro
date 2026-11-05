import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const codigo=html.slice(html.indexOf('function tetoLimite('),html.indexOf('function atualizarBarra('));
const criar=new Function('S','simular',codigo+'; return tetoLimite');
test('teto respeita outros limites e desconta gasto apenas uma vez',()=>{
 const S={lim:[{categoria_id:'mercado',valor:1200}]};
 const teto=criar(S,()=>({balance:8200,ambiguous:false,sc:{confirmado:true}}));
 assert.equal(teto('mercado',{buy:{mercado:10000}}).teto,9400);
});
test('plano acima do disponível permite redução gradual',()=>{
 const S={lim:[{categoria_id:'mercado',valor:1200}]};
 const teto=criar(S,()=>({balance:-500,ambiguous:false,sc:{confirmado:true}}));
 assert.equal(teto('mercado',{buy:{mercado:10000}}).teto,700);
});
test('sem confirmação ou com duplicidade bloqueia aumento',()=>{
 const S={lim:[{categoria_id:'mercado',valor:1200}]};
 for(const F of [{balance:8000,ambiguous:true,sc:{confirmado:true}},{balance:8000,ambiguous:false,sc:{confirmado:false}}]){
  const r=criar(S,()=>F)('mercado',{buy:{mercado:0}});assert.equal(r.incerto,true);assert.equal(r.teto,1200);
 }
});
