import discord
from discord import app_commands
from discord.ext import commands
from utils.competitivo import somar_pontos

GUILD_ID_NEMESIS = 1543381737961160910
PONTOS_MVP_PARTIDA = 30
PONTOS_MVP_EVENTO = 100


class Competitivo(commands.Cog):
    """Comandos do sistema de ranking/pontos que não se encaixam em guerras
    ou patentes — hoje, só o registro de MVP."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="mvp-registrar", description="Registra o MVP de uma partida ou evento e credita os pontos no ranking.")
    @app_commands.describe(membro="Quem foi o MVP")
    @app_commands.choices(tipo=[
        app_commands.Choice(name="Partida (+30 pontos)", value="partida"),
        app_commands.Choice(name="Evento (+100 pontos)", value="evento"),
    ])
    @app_commands.checks.has_permissions(manage_guild=True)
    async def mvp_registrar(self, interaction: discord.Interaction, membro: discord.Member, tipo: app_commands.Choice[str]):
        if interaction.guild.id != GUILD_ID_NEMESIS:
            await interaction.response.send_message("Esse comando é exclusivo do servidor da NÊMESIS.", ephemeral=True)
            return

        pontos = PONTOS_MVP_PARTIDA if tipo.value == "partida" else PONTOS_MVP_EVENTO
        await somar_pontos(str(membro.id), str(membro), pontos)

        rotulo = "da partida" if tipo.value == "partida" else "do evento"
        await interaction.response.send_message(f"🏅 {membro.mention} é o MVP {rotulo}! **+{pontos} pontos** no ranking.")


async def setup(bot: commands.Bot):
    await bot.add_cog(Competitivo(bot))