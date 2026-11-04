// Valores em centavos inteiros. Módulo isolado; não acessa rede ou banco.
function cents(n, nome) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(nome + ' deve ser um valor não negativo em centavos');
  return n;
}

export function distribuir({ renda, compromissos, limites, guardar = 0 }) {
  cents(renda, 'Renda'); cents(compromissos, 'Compromissos'); cents(guardar, 'Guardar');
  if (!Array.isArray(limites)) throw new TypeError('Limites inválidos');
  const ids = new Set();
  let total = guardar;
  for (const item of limites) {
    if (!item.id || ids.has(item.id)) throw new Error('Categoria ausente ou repetida');
    ids.add(item.id); total += cents(item.valor, 'Limite');
  }
  if (!Number.isSafeInteger(total)) throw new RangeError('Total inválido');
  const disponivel = renda - compromissos;
  return { disponivel, distribuido: total, semDestino: Math.max(0, disponivel - total),
    faltaCobrir: Math.max(0, total - disponivel), valido: total <= disponivel };
}

export function ajustarLimite(plano, id, valor) {
  cents(valor, 'Limite');
  const item = plano.limites.find(x => x.id === id);
  if (!item) throw new Error('Categoria não encontrada');
  const outros = plano.limites.filter(x => x.id !== id).reduce((s,x) => s + cents(x.valor, 'Limite'), cents(plano.guardar ?? 0, 'Guardar'));
  const teto = Math.max(0, cents(plano.renda, 'Renda') - cents(plano.compromissos, 'Compromissos') - outros);
  if (valor > teto) return { aceito:false, teto, mensagem:'Esse valor ultrapassa o disponível. Reduza outro limite, aumente a renda ou diminua Guardar.' };
  const limites = plano.limites.map(x => x.id === id ? {...x,valor} : {...x});
  return { aceito:true, teto, plano:{...plano,limites}, resumo:distribuir({...plano,limites}) };
}

export function categoria(limite, gasto) {
  cents(limite, 'Limite'); cents(gasto, 'Gasto');
  return { limite, gasto, restante:Math.max(0, limite-gasto), excedeu:Math.max(0,gasto-limite) };
}
