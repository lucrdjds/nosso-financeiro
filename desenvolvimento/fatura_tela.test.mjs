import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consolidarFaturas} from './motor.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const codigo=html.slice(html.indexOf('function simular('),html.indexOf('function abrirCenario('));
const montar=new Function('S','mesPagamento','sugestaoCenario','consolidarFaturas',codigo+';return simular');
const setup=(fixos=[])=>{
 const S={oldBills:[{mes:'2026-12-01',valor:1332.16}],allplans:[],gastos:[],aportes:[],lim:[],cards:[{id:'p',nome:'PicPay'},{id:'n',nome:'Nubank'}]};
 const sim=montar(S,()=> '2026-12-01',()=>({data:{renda:11000,fixos},confirmado:true}),consolidarFaturas);
 const C={buy:{},bills:{p:{[2026*12+11]:2000}},missingCards:false};return {sim,C};
};
test('previsão soma gasto e parcelas antigas sem total informado',()=>{const {sim,C}=setup();const f=sim(C);assert.equal(f.card,20);assert.equal(f.base,1332.16);assert.equal(f.balance,9647.84)});
test('previsão não soma compras e parcelas incluídas no total',()=>{const {sim,C}=setup([{nome:'PicPay',tipo:'fatura_total',cartao_id:'p',inclui_antigas:true,valor:1500}]);const f=sim(C);assert.equal(f.card,1500);assert.equal(f.base,0);assert.equal(f.balance,9500);assert.equal(f.revisaoTotal,false)});
test('previsão usa maior valor e avisa quando total é menor',()=>{const {sim,C}=setup([{nome:'PicPay',tipo:'fatura_total',cartao_id:'p',inclui_antigas:true,valor:1000}]);const f=sim(C);assert.equal(f.card,1352.16);assert.equal(f.base,0);assert.equal(f.balance,9647.84);assert.equal(f.revisaoTotal,true)});
test('parcelas não vinculadas continuam separadas',()=>{const {sim,C}=setup([{nome:'Nubank',tipo:'fatura_total',cartao_id:'n',inclui_antigas:false,valor:600}]);const f=sim(C);assert.equal(f.card,620);assert.equal(f.base,1332.16);assert.equal(f.balance,9047.84)});
test('total com cartão inválido não apresenta previsão como segura',()=>{const {sim,C}=setup([{nome:'Inválido',tipo:'fatura_total',cartao_id:'x',valor:600}]);assert.equal(sim(C).ambiguous,true)});
test('compra posterior aumenta fatura sem total manual',()=>{const {sim,C}=setup();assert.equal(sim(C).card,20);C.bills.p[2026*12+11]+=2000;assert.equal(sim(C).card,40)});
test('total antigo preservado exige revisão antes de exibir previsão segura',()=>{const {sim,C}=setup([{nome:'PicPay',tipo:'fatura_total',cartao_id:'p',inclui_antigas:true,valor:1500}]);assert.equal(sim(C).ambiguous,true)});
