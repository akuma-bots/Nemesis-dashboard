const PADRAO = {

  titulo: "O site por dentro",

  subtitulo:
    "Um ponto de encontro pra tudo que forma a estrutura NÊMESIS.",


  cartoes: [

    {
      icone: "🎮",

      titulo: "DISCORD",

      descricao:
        "Entre no servidor pra acompanhar a comunidade, os avisos e conversar com a equipe.",

      url:
        "https://discord.gg/D4ZmMpht7",

      rotulo:
        "Entrar no servidor",
    },


    {
      icone: "🤖",

      titulo: "BOT",

      descricao:
        "Adicione o NÊMESIS BOT ao seu próprio servidor e ative os sistemas de administração.",

      url:
        "https://discord.com/oauth2/authorize?client_id=1530272683525410897",

      rotulo:
        "Convidar o bot",
    },


    {
      icone: "🧩",

      titulo: "ROBLOX",

      descricao:
        "Visite a comunidade da NÊMESIS no Roblox e acompanhe as atividades no jogo.",

      /*
       * IMPORTANTE:
       * Substitua pelo link REAL da comunidade Roblox
       * da NÊMESIS.
       */
      url:
        "https://www.roblox.com/communities/SEU_ID/NEMESIS",

      rotulo:
        "Ver comunidade",
    },


    {
      icone: "🏴",

      titulo: "DIVISÕES",

      descricao:
        "Conheça como a estrutura interna da NÊMESIS é organizada, divisão por divisão.",

      url:
        "/divisoes.html",

      rotulo:
        "Ver divisões",
    },

  ],


  divisoes: [

    {
      nome:
        "COMANDO CENTRAL",

      descricao:
        "Lidera a NÊMESIS como um todo: define direção, prioridades e decisões estratégicas para as demais divisões.",
    },


    {
      nome:
        "OPERAÇÕES",

      descricao:
        "Organiza guerras, eventos e a agenda competitiva — planeja e executa tudo que envolve a atividade da comunidade.",
    },


    {
      nome:
        "RECRUTAMENTO",

      descricao:
        "Cuida da entrada de novos membros: avalia inscrições, conduz seleções e integra quem chega.",
    },


    {
      nome:
        "SUPORTE & MODERAÇÃO",

      descricao:
        "Responde tickets, resolve conflitos e mantém a ordem no servidor, com registro de cada ação tomada.",
    },


    {
      nome:
        "DESENVOLVIMENTO",

      descricao:
        "Mantém o bot, o site e os sistemas técnicos da NÊMESIS funcionando e evoluindo.",
    },

  ],

};


function comPadrao(conteudo) {

  return {

    ...PADRAO,

    ...conteudo,

    cartoes:
      (conteudo && Array.isArray(conteudo.cartoes))
        ? conteudo.cartoes
        : PADRAO.cartoes,

    divisoes:
      (conteudo && Array.isArray(conteudo.divisoes))
        ? conteudo.divisoes
        : PADRAO.divisoes,

  };

}


module.exports = {
  PADRAO,
  comPadrao
};