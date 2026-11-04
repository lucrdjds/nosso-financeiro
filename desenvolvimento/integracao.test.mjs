import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distribuir,ajustarLimite} from './orcamento.mjs';
import {prever,lancamento} from './motor.mjs';

test('Uber de 30/10 pertence ao ciclo de novembro e fatura de dezembro',()=>{
 const r=lancamento({data:'2026-10-30',valor:2000,parcelas:1,forma:'credito'},29,{fechamento:29,vencimento:5});
 assert.equal(r.ciclo.mes,'2026-11'); assert.equal(r.parcelas[0].mes,'2026-12'); assert.equal(r.parcelas[0].valor,2000);
});
test('Guardar é alocação; não é obrigação nem custo na previsão',()=>{
 const p={renda:1100000,compromissos:382216,guardar:200000,limites:[{id:'transporte',valor:382000}]};
 const aloc=distribuir(p); assert.equal(aloc.disponivel,717784); assert.equal(aloc.semDestino,135784);
 const resultado=prever({mes:'2026-12',renda:p.renda,obrigações:[
 {id:'contas',tipo:'conta',mes:'2026-12',valor:247000},
 {id:'parcelas',tipo:'outro',mes:'2026-12',valor:133216},
 {id:'picpay',tipo:'fatura',mes:'2026-12',itens:[{id:'uber',valor:2000}]}],
 limites:[{id:'transporte',limite:382000,gasto:2000,mesPagamento:'2026-12'}],meta:p.guardar});
 assert.equal(resultado.simulada,337784);assert.equal(resultado.diferencaMeta,137784);
});
test('limite já gasto e rubrica guardar respeitam o teto',()=>{
 const plano={renda:1000000,compromissos:300000,guardar:200000,limites:[{id:'mercado',valor:300000},{id:'lazer',valor:0}]};
 assert.equal(ajustarLimite(plano,'lazer',200000).aceito,true);
 assert.equal(ajustarLimite(plano,'lazer',200001).aceito,false);
});
