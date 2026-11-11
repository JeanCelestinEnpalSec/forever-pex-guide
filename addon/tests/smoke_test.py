"""Test de fumée de l'addon PexGuideExport, hors du jeu.

Charge l'addon dans un vrai Lua 5.1 (via lupa) avec une API WoW simulée,
déclenche ADDON_LOADED puis /pge, et vérifie la photo enregistrée.
Deux variantes d'API sont testées : « ancienne » (fonctions globales Classic)
et « récente » (espaces C_*), car Forever mélange les deux.

Usage :  python addon/tests/smoke_test.py [--write-fixture chemin.lua]
Les valeurs simulées sont des données de test, pas des données du jeu.
"""
import argparse
import pathlib
import sys

try:
    from lupa import lua51 as lupa_mod
except ImportError:  # lupa < 2.0
    import lupa as lupa_mod

ROOT = pathlib.Path(__file__).resolve().parents[1]
ADDON = ROOT / "PexGuideExport" / "PexGuideExport.lua"

STUBS_COMMON = r"""
time, date = os.time, os.date
local registered, script = {}, nil
function CreateFrame()
  return {
    RegisterEvent = function(self, e) registered[e] = true end,
    SetScript = function(self, _, fn) script = fn end,
  }
end
function FireEvent(e, ...) if registered[e] and script then script(nil, e, ...) end end
SlashCmdList = {}
C_Timer = { NewTimer = function(_, fn) fn(); return { Cancel = function() end } end }
MESSAGES = {}
DEFAULT_CHAT_FRAME = { AddMessage = function(self, m) MESSAGES[#MESSAGES + 1] = m end }
NUM_BAG_SLOTS, NUM_PET_ACTION_SLOTS = 4, 10
function InCombatLockdown() return IN_COMBAT == true end
function GetBuildInfo() return "1.60.1", "70888", "Nov 9 2026", 16001 end
function GetLocale() return "frFR" end
function GetAddOnMetadata(_, field) if field == "Version" then return "0.1.0" end end
function UnitName(u) if u == "player" then return "Jeanpalsec" elseif u == "pet" then return "Pumba" end end
function GetRealmName() return "Royaume Test" end
function UnitLevel(u) return 10 end
function UnitRace() return "Nain", "Dwarf" end
function UnitClass() return "Chasseur", "HUNTER" end
function UnitFactionGroup() return "Alliance", "Alliance" end
function UnitSex() return 2 end
function UnitXP() return 3200 end
function UnitXPMax() return 7600 end
function GetXPExhaustion() return nil end
function GetMoney() return 605 end
function GetGuildInfo() return nil end
function GetZoneText() return "Dun Morogh" end
function GetSubZoneText() return "Kharanos" end
C_Map = {
  GetBestMapForUnit = function() return 1426 end,
  GetPlayerMapPosition = function() return { GetXY = function() return 0.46, 0.484 end } end,
}
function UnitHealthMax(u) return u == "pet" and 287 or 269 end
function UnitPowerMax() return 286 end
local STATS = { {26,26,0,0}, {29,31,2,0}, {32,34,2,0}, {24,24,0,0}, {25,25,0,0} }
function UnitStat(_, i) local s = STATS[i]; return s[1], s[2], s[3], s[4] end
function UnitAttackPower() return 57, 0, 0 end
function UnitRangedAttackPower() return 62, 20, 0 end
function UnitRangedDamage() return 2.2, 20, 26 end
function UnitDamage(u) if u == "pet" then return 16, 21 end return 14, 22 end
function UnitArmor(u) if u == "pet" then return 600, 632 end return 200, 225 end
function GetCritChance() return 4.9 end
function GetRangedCritChance() return 4.9 end
function GetDodgeChance() return 9.0 end
function GetParryChance() return 4.9 end
function GetBlockChance() return 0 end
function GetHitModifier() return 1 end
function GetRangedHaste() return 10 end
function UnitDefense() return 48, 0 end
local EQUIP = {
  [0] = "|cffffffff|Hitem:2516::::::::10:::::::|h[Balle légère]|h|r",
  [5] = "|cff1eff00|Hitem:900001::::::::10:::::::|h[Tunique en cuir souple]|h|r",
  [16] = "|cff1eff00|Hitem:900002::::::::10:::::::|h[Dague d'artisan]|h|r",
  [18] = "|cffffffff|Hitem:2509::::::::10:::::::|h[Tromblon orné]|h|r",
}
function GetInventoryItemLink(_, slot) return EQUIP[slot] end
function GetInventoryItemID(_, slot) local l = EQUIP[slot]; return l and tonumber(l:match("item:(%d+)")) end
function GetInventoryItemDurability(slot) if slot == 18 then return 25, 30 end end
function GetInventoryItemCount(_, slot) if slot == 0 then return 444 end end
function UnitExists(u) return u == "pet" end
function UnitCreatureFamily() return "Sanglier" end
function GetPetExperience() return 0, 1900 end
function GetPetActionInfo(i)
  if i == 1 then return "PET_ACTION_ATTACK", "tex", true, false, false, false end
  if i == 4 then return "Charge", "tex", false, false, true, true, 7371 end
  if i == 5 then return "Grondement", "tex", false, false, true, true, 2649 end
end
function GetNumTalentTabs() return 3 end
TABS = { "Maîtrise des bêtes", "Précision", "Survie" }
function GetNumTalents(tab) return 2 end
function GetTalentInfo(tab, i)
  if tab == 2 and i == 1 then return "Œil de faucon", "tex", 1, 1, 1, 3 end
  return "Talent " .. tab .. "." .. i, "tex", 1, i, 0, 5
end
function UnitCharacterPoints() return 0 end
RXPCData = { currentGuideName = "5-11 Dun Morogh Speedrun Guide 1-20", currentGuideGroup = "RestedXP Alliance 1-20", currentStep = 82 }
"""

STUBS_OLD = r"""
function GetTalentTabInfo(tab) return TABS[tab], "tex", tab == 2 and 1 or 0, "bg" end
function GetItemInfo(ref) return nil end
function GetContainerNumSlots(bag) return bag == 0 and 16 or (bag == 1 and 6 or 0) end
local BAG = {
  [0] = { [1] = {"|cffffffff|Hitem:2318::::::::10:::::::|h[Cuir léger]|h|r", 20}, [2] = {"|cffffffff|Hitem:2318::::::::10:::::::|h[Cuir léger]|h|r", 2} },
  [1] = { [1] = {"|cffffffff|Hitem:2516::::::::10:::::::|h[Balle légère]|h|r", 200} },
}
function GetContainerItemLink(bag, slot) local b = BAG[bag]; return b and b[slot] and b[slot][1] end
function GetContainerItemInfo(bag, slot) local b = BAG[bag]; if b and b[slot] then return "tex", b[slot][2] end end
function ContainerIDToInventoryID(bag) return 19 + bag end
function GetPetHappiness() return 2, 100, 0 end
function GetPetLoyalty() return "Rebelle" end
function GetPetTrainingPoints() return 0, 0 end
function GetPetFoodTypes() return "Viande", "Poisson", "Pain", "Fromage", "Fruit", "Champignon" end
function GetNumSpellTabs() return 2 end
local SPELLTABS = { {"Général", 0, 2}, {"Précision", 2, 2} }
function GetSpellTabInfo(t) local s = SPELLTABS[t]; return s[1], "tex", s[2], s[3] end
local SPELLS = { {"Attaque", ""}, {"Forme de pierre", "Raciale"}, {"Tir des arcanes", "Rang 1"}, {"Morsure de serpent", "Rang 2"} }
function GetSpellBookItemName(i) local s = SPELLS[i]; return s[1], s[2] end
function GetSpellBookItemInfo(i) return "SPELL", 1000 + i end
function GetNumSkillLines() return 3 end
local SKILLS = { {"Métiers", true, true, 0, 0, 0, 0}, {"Dépeçage", false, false, 57, 0, 0, 75}, {"Cuisine", false, false, 3, 0, 0, 75} }
function GetSkillLineInfo(i) return unpack(SKILLS[i]) end
function GetNumQuestLogEntries() return 2, 1 end
function GetQuestLogTitle(i)
  if i == 1 then return "Dun Morogh", 0, nil, true end
  return "Opération Recombobulation", 10, nil, false, false, nil, nil, 412
end
function GetNumQuestLeaderBoards() return 2 end
function GetQuestLogLeaderBoard(j) if j == 1 then return "Rouage de rééquilibrage : 0/8", "item", false end return "Engrenage gyromécanique : 0/8", "item", false end
"""

STUBS_NEW = r"""
function GetTalentTabInfo(tab) return 360 + tab, TABS[tab], "desc", "tex", tab == 2 and 1 or 0, "bg", 0, true end
C_Item = { GetItemInfo = function(ref) if type(ref) == "string" and ref:find("2509") then return "Tromblon orné", ref, 1, 9, 4, "Arme", "Armes à feu", 1, "INVTYPE_RANGEDRIGHT" end end }
C_Container = {
  GetContainerNumSlots = function(bag) return bag == 0 and 16 or 0 end,
  GetContainerItemLink = function(bag, slot) if bag == 0 and slot == 1 then return "|cffffffff|Hitem:2318::::::::10:::::::|h[Cuir léger]|h|r" end end,
  GetContainerItemInfo = function(bag, slot) if bag == 0 and slot == 1 then return { stackCount = 22 } end end,
  ContainerIDToInventoryID = function(bag) return 19 + bag end,
}
C_PetInfo = {
  GetPetHappiness = function() return 3 end,
  GetPetLoyalty = function() return 1 end,
  GetPetTrainingPoints = function() return 5 end,
  GetPetFoodTypes = function() return { "Viande", "Poisson" } end,
}
Enum = { SpellBookSpellBank = { Player = 0 } }
C_SpellBook = {
  GetNumSpellBookSkillLines = function() return 1 end,
  GetSpellBookSkillLineInfo = function() return { name = "Général", itemIndexOffset = 0, numSpellBookItems = 2 } end,
  GetSpellBookItemName = function(i) if i == 1 then return "Attaque", "" end return "Dressage des bêtes", "" end,
  GetSpellBookItemInfo = function(i) return { spellID = 6000 + i, isPassive = false } end,
}
C_SkillInfo = {
  GetNumSkillLines = function() return 1 end,
  GetSkillLineInfo = function() return { skillName = "Dépeçage", isHeader = false, skillRank = 57, skillMaxRank = 75 } end,
}
C_QuestLog = {
  GetNumQuestLogEntries = function() return 1, 1 end,
  GetInfo = function() return { title = "La bière parfaite", questID = 315, level = 9, isHeader = false, isComplete = false } end,
  GetQuestObjectives = function() return { { text = "Chatoyante : 0/6", finished = false } } end,
}
-- Valeur secrète simulée : doit être ignorée.
SECRET = setmetatable({}, { __tostring = function() return "secret" end })
function issecretvalue(v) return v == SECRET end
function GetDodgeChance() return SECRET end
"""


def run(variant: str):
    lua = lupa_mod.LuaRuntime(unpack_returned_tuples=True)
    lua.execute(STUBS_COMMON)
    lua.execute(STUBS_OLD if variant == "old" else STUBS_NEW)
    src = ADDON.read_text(encoding="utf-8")
    chunk = lua.eval("function(src) return assert(loadstring(src, '@PexGuideExport.lua')) end")(src)
    chunk("PexGuideExport")
    lua.eval("function() FireEvent('ADDON_LOADED', 'PexGuideExport') end")()
    lua.eval("function() SlashCmdList.PEXGUIDEEXPORT('') end")()
    return lua


def check(lua, variant: str):
    g = lua.globals()
    db = g.PexGuideExportDB
    assert db is not None, "PexGuideExportDB absent"
    snap = db.characters["Jeanpalsec-Royaume Test"]
    assert snap is not None, "photo absente"
    for section in ("character", "position", "stats", "equipment", "bags", "pet", "talents", "spells", "skills", "quests"):
        value = snap[section]
        assert value is not None, f"section {section} absente"
        if hasattr(value, "error") and value["error"] is not None:
            raise AssertionError(f"{variant}: erreur dans {section}: {value['error']}")
    assert snap.character.level == 10
    assert snap.stats.attributes.agility.total == 31
    assert snap.position.x == 46.0 and snap.position.y == 48.4
    assert snap.equipment[1] is not None
    ranged = [e for e in snap.equipment.values() if e.slotKey == "RANGED"][0]
    assert ranged.itemID == 2509 and ranged.durability[1] == 25
    assert snap.pet.name == "Pumba" and len(list(snap.pet.abilities.values())) == 2
    talents = snap.talents.tabs[2]
    assert talents.name == "Précision" and talents.pointsSpent == 1, (talents.name, talents.pointsSpent)
    assert len(list(snap.skills.values())) >= 1
    assert len(list(snap.quests.values())) == 1
    assert snap.restedXP.step == 82 and snap.restedXP.guide.startswith("5-11"), "étape RestedXP absente"
    if variant == "new":
        assert snap.stats.dodge is None, "une valeur secrète a été exportée"
        assert snap.bags[1]["items"][1]["count"] == 22
    else:
        assert snap.bags[1]["items"][1]["count"] == 22, snap.bags[1]["items"][1]["count"]
        assert snap.quests[1].objectives[1].text.startswith("Rouage")
    # Combat : pas de photo, puis photo à la fin du combat
    g.IN_COMBAT = True
    lua.eval("function() PexGuideExportDB.characters = {} ; SlashCmdList.PEXGUIDEEXPORT('') end")()
    assert db.characters["Jeanpalsec-Royaume Test"] is None, "photo prise en combat"
    g.IN_COMBAT = False
    lua.eval("function() FireEvent('PLAYER_REGEN_ENABLED') end")()
    assert db.characters["Jeanpalsec-Royaume Test"] is not None, "pas de photo après le combat"
    print(f"[ok] variante {variant} : toutes les sections exportées")


SERIALIZER = r"""
local function key(k)
  if type(k) == "string" then return string.format("[%q]", k) end
  return "[" .. tostring(k) .. "]"
end
local function ser(v, indent, out)
  local t = type(v)
  if t == "table" then
    out[#out + 1] = "{\n"
    local n = #v
    for i = 1, n do
      out[#out + 1] = indent .. "\t"
      ser(v[i], indent .. "\t", out)
      out[#out + 1] = ", -- [" .. i .. "]\n"
    end
    local keys = {}
    for k in pairs(v) do if not (type(k) == "number" and k >= 1 and k <= n and k % 1 == 0) then keys[#keys + 1] = k end end
    table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
    for _, k in ipairs(keys) do
      out[#out + 1] = indent .. "\t" .. key(k) .. " = "
      ser(v[k], indent .. "\t", out)
      out[#out + 1] = ",\n"
    end
    out[#out + 1] = indent .. "}"
  elseif t == "string" then
    out[#out + 1] = string.format("%q", v)
  else
    out[#out + 1] = tostring(v)
  end
end
return function(name, value)
  local out = { "\n", name, " = " }
  ser(value, "", out)
  out[#out + 1] = "\n"
  return table.concat(out)
end
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-fixture", help="écrit un fichier SavedVariables de test (variante ancienne)")
    args = parser.parse_args()
    for variant in ("old", "new"):
        lua = run(variant)
        check(lua, variant)
        if args.write_fixture and variant == "old":
            serialize = lua.execute(SERIALIZER)
            text = serialize("PexGuideExportDB", lua.globals().PexGuideExportDB)
            pathlib.Path(args.write_fixture).write_text(text, encoding="utf-8")
            print(f"[ok] fixture écrite : {args.write_fixture}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
