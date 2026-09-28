from utils.storage import carregar, salvar

ARQUIVO = "competitivo.json"

PADRAO = {
    "catalogo": [],
    "perfis": {},
}


async def _carregar():
    dados = await carregar(ARQUIVO, PADRAO)
    dados.setdefault("catalogo", [])
    dados.setdefault("perfis", {})
    return dados


def _perfil_vazio(discord_id: str, nome: str) -> dict:
    return {
        "discordId": discord_id,
        "nome": nome,
        "pontos": 0,
        "elo": 1000,
        "vitorias": 0,
        "derrotas": 0,
    }


async def somar_pontos(discord_id: str, nome: str, pontos: int) -> dict:
    """Soma pontos no perfil de alguém no ranking (site). Não mexe no catálogo."""
    dados = await _carregar()
    perfil = dados["perfis"].get(discord_id) or _perfil_vazio(discord_id, nome)
    perfil["pontos"] = perfil.get("pontos", 0) + pontos
    perfil["nome"] = nome or perfil.get("nome")
    dados["perfis"][discord_id] = perfil
    await salvar(ARQUIVO, dados)
    return perfil


async def ajustar_elo(discord_id: str, nome: str, delta_elo: int, vitoria: bool = None) -> dict:
    """Ajusta o Elo e, se informado, soma uma vitória ou derrota no perfil."""
    dados = await _carregar()
    perfil = dados["perfis"].get(discord_id) or _perfil_vazio(discord_id, nome)
    perfil["elo"] = max(0, perfil.get("elo", 1000) + delta_elo)
    perfil["nome"] = nome or perfil.get("nome")
    if vitoria is True:
        perfil["vitorias"] = perfil.get("vitorias", 0) + 1
    elif vitoria is False:
        perfil["derrotas"] = perfil.get("derrotas", 0) + 1
    dados["perfis"][discord_id] = perfil
    await salvar(ARQUIVO, dados)
    return perfil