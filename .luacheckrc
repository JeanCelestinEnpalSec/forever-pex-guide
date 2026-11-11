-- Configuration luacheck pour l'addon (Lua 5.1 du client WoW).
std = "lua51"
max_line_length = false
unused_args = false

globals = {
  "PexGuideExportDB",
  "SLASH_PEXGUIDEEXPORT1",
  "SlashCmdList",
}

read_globals = {
  "_G", "time", "date",
  -- Espaces de noms C_*
  "C_AddOns", "C_Container", "C_Item", "C_Map", "C_PetInfo", "C_QuestLog", "C_SkillInfo", "C_SpellBook", "C_Timer", "Enum",
  -- Interface et divers
  "CreateFrame", "DEFAULT_CHAT_FRAME", "InCombatLockdown", "GetBuildInfo", "GetLocale", "GetAddOnMetadata", "issecretvalue",
  "NUM_BAG_SLOTS", "NUM_PET_ACTION_SLOTS", "BOOKTYPE_SPELL",
  -- Personnage
  "UnitName", "GetRealmName", "UnitLevel", "UnitRace", "UnitClass", "UnitFactionGroup", "UnitSex", "UnitXP", "UnitXPMax",
  "GetXPExhaustion", "GetMoney", "GetGuildInfo", "GetZoneText", "GetSubZoneText", "UnitExists",
  -- Statistiques
  "UnitHealthMax", "UnitPowerMax", "UnitStat", "UnitAttackPower", "UnitRangedAttackPower", "UnitRangedDamage", "UnitDamage",
  "UnitArmor", "GetCritChance", "GetRangedCritChance", "GetDodgeChance", "GetParryChance", "GetBlockChance", "GetHitModifier",
  "GetRangedHaste", "UnitDefense",
  -- Objets et sacs
  "GetItemInfo", "GetInventoryItemLink", "GetInventoryItemID", "GetInventoryItemDurability", "GetInventoryItemCount",
  "GetContainerNumSlots", "GetContainerItemInfo", "GetContainerItemLink", "ContainerIDToInventoryID",
  -- Familier
  "UnitCreatureFamily", "GetPetExperience", "GetPetHappiness", "GetPetLoyalty", "GetPetTrainingPoints", "GetPetFoodTypes",
  "GetPetActionInfo",
  -- Talents, sorts, compétences, quêtes
  "UnitCharacterPoints", "GetNumTalentTabs", "GetTalentTabInfo", "GetNumTalents", "GetTalentInfo",
  "GetNumSpellTabs", "GetSpellTabInfo", "GetSpellBookItemName", "GetSpellBookItemInfo",
  "GetNumSkillLines", "GetSkillLineInfo",
  "GetNumQuestLogEntries", "GetQuestLogTitle", "GetNumQuestLeaderBoards", "GetQuestLogLeaderBoard",
}
