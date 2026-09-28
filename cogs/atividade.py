import datetime
import discord
from discord.ext import commands
from utils.storage import carregar, salvar
from utils.competitivo import somar_pontos

GUILD_ID_NEMESIS = 1543381737961160910
ARQUIVO = "atividade.json"

PONTOS_DIA = 10
PONTOS_3_DIAS = 30
PONTOS_7_DIAS = 75


def _semana_atual(data: datetime.date) -> str:
    ano, semana, _ = data.isocalendar()
    return f"{ano}-W{semana:02d}"


class Atividade(commands.Cog):
    """Detecta quem mandou mensagem no servidor da NÊMESIS e credita os
    bônus de atividade (Participar do Dia / 3 Dias / 7 Dias na Semana)
    automaticamente no ranking do site. A semana reinicia toda segunda."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return
        if message.guild.id != GUILD_ID_NEMESIS:
            return

        hoje = datetime.date.today()
        hoje_str = hoje.isoformat()
        semana_str = _semana_atual(hoje)

        dados = await carregar(ARQUIVO, {})
        chave = str(message.author.id)
        registro = dados.get(chave) or {
            "ultima_data": None,
            "semana": semana_str,
            "dias_semana": [],
            "bonus_3_dado": False,
            "bonus_7_dado": False,
        }

        if registro["ultima_data"] == hoje_str:
            return  # já contou hoje pra essa pessoa

        if registro.get("semana") != semana_str:
            registro["semana"] = semana_str
            registro["dias_semana"] = []
            registro["bonus_3_dado"] = False
            registro["bonus_7_dado"] = False

        registro["ultima_data"] = hoje_str
        registro["dias_semana"].append(hoje_str)

        nome = str(message.author)
        await somar_pontos(chave, nome, PONTOS_DIA)

        dias_na_semana = len(registro["dias_semana"])
        if dias_na_semana >= 3 and not registro["bonus_3_dado"]:
            registro["bonus_3_dado"] = True
            await somar_pontos(chave, nome, PONTOS_3_DIAS)
        if dias_na_semana >= 7 and not registro["bonus_7_dado"]:
            registro["bonus_7_dado"] = True
            await somar_pontos(chave, nome, PONTOS_7_DIAS)

        dados[chave] = registro
        await salvar(ARQUIVO, dados)


async def setup(bot: commands.Bot):
    await bot.add_cog(Atividade(bot))