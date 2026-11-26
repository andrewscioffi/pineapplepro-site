// OS VALORES DO SITE DO ALARMINO (24/11/2026). Tudo o que muda fica aqui, num lugar só.
// A oferta foi fechada pelo Andrews em 24/11 ("sim quero construir"): Plano Fundador, R$ 97 pelo 1º ano, 100 vagas.

// O link de pagamento da Stripe: sai do painel/criar-link-stripe-alarmino.command. Vazio = o botão avisa que abre em breve.
export const LINK_PAGAMENTO = 'https://buy.stripe.com/6oU7sL8KegAP125c4mfUQ0a';

export const FUNCAO = 'https://foijkkdofcdzgohrixqm.supabase.co/functions/v1/alarmino';

export const OFERTA = {
  nome: 'Plano Fundador',
  preco: 'R$ 97',
  por_mes: 'R$ 8,08',
  preco_normal: 'R$ 19,90 por mês',
  vagas: 100,
  inicio_ate: '15/12/2026',
  horarios: 3,          // 26/11, o Andrews: "pode ser 3 horários e acima disso ele paga avulso por horário 9,90"
  horario_extra: 'R$ 9,90',
  familia: 2,
  garantia_dias: 7,
};

// Quem vende (o Decreto 7.962/2013 pede o nome e o CNPJ no site) e por onde a pessoa fala com gente.
// O Andrews, 24/11: "não tenho CNPJ ainda do projeto, pode usar o da Pineapple".
export const EMPRESA = { cnpj: '55.585.363/0001-28', cidade: 'Maringá (PR)', email: 'pineappleprocomercial@gmail.com' };
