import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cicloCategoria, compraCredito, parcelasCentavos } from './motor.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const trecho = html.slice(html.indexOf('function noCiclo('), html.indexOf('\nfunction mesPagamento('));
const criar = new Function('S', 'cicloCategoria', 'compraCredito', 'parcelasCentavos', `const pad=n=>String(n).padStart(2,'0'); const mk=()=>S.y+'-'+pad(S.mo+1); ${trecho}; return {calc,noCiclo,periodoCiclo}`);
function dados() {return {y:2026,mo:10,gastos:[],cards:[],fixas:[],aportes:[],plan:null};}
test('cálculo usado pela tela: Uber em novembro e fatura de dezembro', () => {
  const s=dados(); s.cards=[{id:'p',fechamento:29,vencimento:5}];
  s.gastos=[{categoria_id:'t',cartao_id:'p',data_compra:'2026-10-30',valor:20,parcelas:1}];
  const ui=criar(s,cicloCategoria,compraCredito,parcelasCentavos), c=ui.calc();
  assert.equal(c.buy.t,2000);assert.equal(c.bills.p[2026*12+11],2000);
  assert.equal(ui.periodoCiclo(),'30/10/2026 a 29/11/2026');
});
test('cálculo usado pela tela distribui centavos nas primeiras parcelas', () => {
  const s=dados();s.cards=[{id:'p',fechamento:29,vencimento:5}];
  s.gastos=[{categoria_id:'m',cartao_id:'p',data_compra:'2026-10-30',valor:100,parcelas:3}];
  const c=criar(s,cicloCategoria,compraCredito,parcelasCentavos).calc();
  assert.deepEqual([c.bills.p[2026*12+11],c.bills.p[2027*12],c.bills.p[2027*12+1]],[3334,3333,3333]);
});
test('cartão sem datas ou ausente deixa a previsão pendente', () => {
  const s=dados();s.cards=[{id:'p',fechamento:null,vencimento:5}];
  s.gastos=[{categoria_id:'m',cartao_id:'p',data_compra:'2026-10-30',valor:20,parcelas:1}];
  assert.equal(criar(s,cicloCategoria,compraCredito,parcelasCentavos).calc().missingCards,true);
  s.cards=[];assert.equal(criar(s,cicloCategoria,compraCredito,parcelasCentavos).calc().missingCards,true);
});
test('período da tela trata fevereiro e virada do ano', () => {
  const s=dados();s.y=2027;s.mo=2;const ui=criar(s,cicloCategoria,compraCredito,parcelasCentavos);
  assert.equal(ui.periodoCiclo(),'01/03/2027 a 29/03/2027');
  s.y=2027;s.mo=0;assert.equal(ui.periodoCiclo(),'30/12/2026 a 29/01/2027');
});
