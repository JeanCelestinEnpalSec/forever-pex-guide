-- Pex Guide Export
-- Enregistre une photo de la fiche du personnage dans PexGuideExportDB (SavedVariables).
-- Le fichier est écrit par le jeu sur le disque au /reload ou à la déconnexion :
--   World of Warcraft\_forever_\WTF\Account\<COMPTE>\SavedVariables\PexGuideExport.lua
--
-- Règles :
--   * lecture seule : l'addon n'agit jamais sur le jeu, il lit et enregistre ;
--   * jamais pendant un combat (on attend la fin du combat) ;
--   * chaque appel d'API est protégé : une API absente ou modifiée dans Forever
--     ne casse pas l'export, l'erreur est notée dans la section concernée ;
--   * les « valeurs secrètes » (restrictions façon Midnight) sont ignorées.

local ADDON_NAME = ...
local SCHEMA = 1

local unpack = unpack

local function pack(...)
  return { n = select("#", ...), ... }
end

-- Appelle fn(...) sans jamais lever d'erreur. Renvoie toutes les valeurs, ou rien.
local function call(fn, ...)
  if type(fn) ~= "function" then return nil end
  local r = pack(pcall(fn, ...))
  if not r[1] then return nil end
  return unpack(r, 2, r.n)
end

local isSecret = function() return false end
if type(issecretvalue) == "function" then
  isSecret = function(v)
    local ok, res = pcall(issecretvalue, v)
    return ok and res
  end
end

-- Ne garde que les valeurs simples et lisibles.
local function clean(v)
  if v == nil or isSecret(v) then return nil end
  local t = type(v)
  if t == "number" then
    if v ~= v or v == math.huge or v == -math.huge then return nil end
    return v
  end
  if t == "string" or t == "boolean" then return v end
  return nil
end

local function round(v, digits)
  v = clean(v)
  if type(v) ~= "number" then return nil end
  local m = 10 ^ (digits or 2)
  return math.floor(v * m + 0.5) / m
end

local function metadata(field)
  local getter = (C_AddOns and C_AddOns.GetAddOnMetadata) or GetAddOnMetadata
  return clean(call(getter, ADDON_NAME, field))
end

local VERSION = metadata("Version") or "dev"

local function itemIDFromLink(link)
  if type(link) ~= "string" then return nil end
  local id = link:match("item:(%d+)")
  return id and tonumber(id) or nil
end

local function nameFromLink(link)
  if type(link) ~= "string" then return nil end
  return link:match("%[(.-)%]")
end

-- Exécute un collecteur ; en cas d'erreur, garde le message pour le diagnostic.
local function safe(fn)
  local ok, res = pcall(fn)
  if ok then return res end
  return { error = tostring(res) }
end

---------------------------------------------------------------------------
-- Collecteurs
---------------------------------------------------------------------------

local function collectCharacter()
  local c = {}
  c.name = clean(call(UnitName, "player"))
  c.realm = clean(call(GetRealmName))
  c.level = clean(call(UnitLevel, "player"))
  local raceName, raceFile = call(UnitRace, "player")
  c.race, c.raceId = clean(raceName), clean(raceFile)
  local className, classFile = call(UnitClass, "player")
  c.class, c.classId = clean(className), clean(classFile)
  local faction, factionLabel = call(UnitFactionGroup, "player")
  c.faction, c.factionLabel = clean(faction), clean(factionLabel)
  c.sex = clean(call(UnitSex, "player"))
  c.xp = clean(call(UnitXP, "player"))
  c.xpMax = clean(call(UnitXPMax, "player"))
  c.rested = clean(call(GetXPExhaustion))
  c.money = clean(call(GetMoney))
  c.guild = clean((call(GetGuildInfo, "player")))
  return c
end

local function collectPosition()
  local p = { zone = clean(call(GetZoneText)), subzone = clean(call(GetSubZoneText)) }
  if C_Map and C_Map.GetBestMapForUnit then
    local mapID = clean(call(C_Map.GetBestMapForUnit, "player"))
    p.mapID = mapID
    if mapID then
      local pos = call(C_Map.GetPlayerMapPosition, mapID, "player")
      if type(pos) == "table" and type(pos.GetXY) == "function" then
        local x, y = call(pos.GetXY, pos)
        x, y = clean(x), clean(y)
        if x and y then
          p.x = round(x * 100, 1)
          p.y = round(y * 100, 1)
        end
      end
    end
  end
  return p
end

local ATTRIBUTES = { "strength", "agility", "stamina", "intellect", "spirit" }

local function collectStats()
  local s = { attributes = {} }
  s.health = clean(call(UnitHealthMax, "player"))
  s.mana = clean(call(UnitPowerMax, "player", 0))
  for i = 1, 5 do
    local base, total, bonus, malus = call(UnitStat, "player", i)
    s.attributes[ATTRIBUTES[i]] = { base = clean(base), total = clean(total), bonus = clean(bonus), malus = clean(malus) }
  end
  local apBase, apBonus, apMalus = call(UnitAttackPower, "player")
  s.meleeAttackPower = { base = clean(apBase), bonus = clean(apBonus), malus = clean(apMalus) }
  local rapBase, rapBonus, rapMalus = call(UnitRangedAttackPower, "player")
  s.rangedAttackPower = { base = clean(rapBase), bonus = clean(rapBonus), malus = clean(rapMalus) }
  local rSpeed, rMin, rMax = call(UnitRangedDamage, "player")
  s.rangedDamage = { speed = round(rSpeed, 2), min = round(rMin, 0), max = round(rMax, 0) }
  local mMin, mMax = call(UnitDamage, "player")
  s.meleeDamage = { min = round(mMin, 0), max = round(mMax, 0) }
  local _, effectiveArmor = call(UnitArmor, "player")
  s.armor = clean(effectiveArmor)
  s.crit = round(call(GetCritChance), 2)
  s.rangedCrit = round(call(GetRangedCritChance), 2)
  s.dodge = round(call(GetDodgeChance), 2)
  s.parry = round(call(GetParryChance), 2)
  s.block = round(call(GetBlockChance), 2)
  s.hit = round(call(GetHitModifier), 2)
  s.rangedHaste = round(call(GetRangedHaste), 2)
  local defBase, defBonus = call(UnitDefense, "player")
  s.defense = { base = clean(defBase), bonus = clean(defBonus) }
  return s
end

local SLOT_KEYS = {
  [0] = "AMMO", "HEAD", "NECK", "SHOULDER", "SHIRT", "CHEST", "WAIST", "LEGS", "FEET", "WRIST",
  "HANDS", "FINGER1", "FINGER2", "TRINKET1", "TRINKET2", "BACK", "MAINHAND", "OFFHAND", "RANGED", "TABARD",
}

local function itemInfo(itemRef)
  local getter = (C_Item and C_Item.GetItemInfo) or GetItemInfo
  local name, _, quality, itemLevel, minLevel, itemType, subType, _, equipLoc = call(getter, itemRef)
  return {
    name = clean(name), quality = clean(quality), itemLevel = clean(itemLevel), minLevel = clean(minLevel),
    type = clean(itemType), subType = clean(subType), equipLoc = clean(equipLoc),
  }
end

local function collectEquipment()
  local list = {}
  for slot = 0, 19 do
    local link = clean(call(GetInventoryItemLink, "player", slot))
    local id = clean(call(GetInventoryItemID, "player", slot)) or itemIDFromLink(link)
    if id then
      local e = itemInfo(link or id)
      e.name = e.name or nameFromLink(link)
      e.slot, e.slotKey, e.itemID, e.link = slot, SLOT_KEYS[slot], id, link
      local cur, max = call(GetInventoryItemDurability, slot)
      cur, max = clean(cur), clean(max)
      if cur and max then e.durability = { cur, max } end
      if slot == 0 then e.count = clean(call(GetInventoryItemCount, "player", slot)) end
      list[#list + 1] = e
    end
  end
  return list
end

local function collectBags()
  local C = C_Container or {}
  local numSlotsFn = C.GetContainerNumSlots or GetContainerNumSlots
  local infoFn = C.GetContainerItemInfo or GetContainerItemInfo
  local linkFn = C.GetContainerItemLink or GetContainerItemLink
  local toInvFn = C.ContainerIDToInventoryID or ContainerIDToInventoryID
  local bags = {}
  for bag = 0, (NUM_BAG_SLOTS or 4) do
    local n = clean(call(numSlotsFn, bag))
    if n and n > 0 then
      local b = { bag = bag, slots = n, items = {} }
      if bag > 0 then
        local invSlot = clean(call(toInvFn, bag))
        local bagLink = invSlot and clean(call(GetInventoryItemLink, "player", invSlot))
        b.name, b.itemID = nameFromLink(bagLink), itemIDFromLink(bagLink)
      end
      local byID, order, used = {}, {}, 0
      for slot = 1, n do
        local link = clean(call(linkFn, bag, slot))
        local id = itemIDFromLink(link)
        if id then
          used = used + 1
          local info = pack(call(infoFn, bag, slot))
          local count
          if type(info[1]) == "table" then count = clean(info[1].stackCount) else count = clean(info[2]) end
          if not byID[id] then
            byID[id] = { itemID = id, name = nameFromLink(link), count = 0 }
            order[#order + 1] = id
          end
          byID[id].count = byID[id].count + (count or 1)
        end
      end
      for _, id in ipairs(order) do b.items[#b.items + 1] = byID[id] end
      b.used = used
      bags[#bags + 1] = b
    end
  end
  return bags
end

local function collectPet()
  if not clean(call(UnitExists, "pet")) then return nil end
  local p = {
    name = clean(call(UnitName, "pet")),
    level = clean(call(UnitLevel, "pet")),
    family = clean(call(UnitCreatureFamily, "pet")),
    health = clean(call(UnitHealthMax, "pet")),
  }
  local _, armor = call(UnitArmor, "pet")
  p.armor = clean(armor)
  local dMin, dMax = call(UnitDamage, "pet")
  p.damage = { min = round(dMin, 0), max = round(dMax, 0) }
  local xp, xpMax = call(GetPetExperience)
  p.xp, p.xpMax = clean(xp), clean(xpMax)

  local P = C_PetInfo or {}
  p.happiness = clean((call(P.GetPetHappiness))) or clean((call(GetPetHappiness)))
  p.loyalty = clean((call(P.GetPetLoyalty))) or clean((call(GetPetLoyalty)))
  p.trainingPoints = clean((call(P.GetPetTrainingPoints))) or clean((call(GetPetTrainingPoints)))

  p.foodTypes = {}
  local foods = pack(call(P.GetPetFoodTypes or GetPetFoodTypes))
  if type(foods[1]) == "table" then foods = foods[1]; foods.n = #foods end
  for i = 1, (foods.n or 0) do
    local f = clean(foods[i])
    if f then p.foodTypes[#p.foodTypes + 1] = f end
  end

  -- Barre du familier : deux formats selon la version du client.
  --   ancien : name, subtext, texture, isToken, isActive, autoCastAllowed, autoCastEnabled
  --   récent : name, texture, isToken, isActive, autoCastAllowed, autoCastEnabled, spellID
  p.abilities = {}
  for i = 1, (NUM_PET_ACTION_SLOTS or 10) do
    local r = pack(call(GetPetActionInfo, i))
    local name = clean(r[1])
    if name then
      local isToken, autocast, rank, spellID
      if type(r[3]) == "boolean" then
        isToken, autocast, spellID = r[3], r[6], r[7]
      else
        rank, isToken, autocast = r[2], r[4], r[7]
      end
      if not isToken then
        p.abilities[#p.abilities + 1] = { name = name, rank = clean(rank), spellID = clean(spellID), autocast = clean(autocast) }
      end
    end
  end
  return p
end

local function collectTalents()
  local t = { tabs = {} }
  t.unspent = clean((call(UnitCharacterPoints, "player")))
  local numTabs = clean(call(GetNumTalentTabs)) or 0
  for tab = 1, numTabs do
    local r = pack(call(GetTalentTabInfo, tab))
    local name, points
    if type(r[1]) == "number" and type(r[2]) == "string" then
      name, points = r[2], r[5]   -- format récent : id, name, description, icon, pointsSpent, ...
    else
      name, points = r[1], r[3]   -- format ancien : name, icon, pointsSpent, background
    end
    local tabData = { name = clean(name), pointsSpent = clean(points), talents = {} }
    local n = clean(call(GetNumTalents, tab)) or 0
    for i = 1, n do
      local tr = pack(call(GetTalentInfo, tab, i))
      if clean(tr[1]) then
        tabData.talents[#tabData.talents + 1] = {
          name = clean(tr[1]), tier = clean(tr[3]), column = clean(tr[4]), rank = clean(tr[5]), maxRank = clean(tr[6]),
        }
      end
    end
    t.tabs[#t.tabs + 1] = tabData
  end
  return t
end

local function collectSpells()
  local list = {}
  local SB = C_SpellBook
  if SB and SB.GetNumSpellBookSkillLines and SB.GetSpellBookSkillLineInfo then
    local bank = (Enum and Enum.SpellBookSpellBank and Enum.SpellBookSpellBank.Player) or 0
    local lines = clean(call(SB.GetNumSpellBookSkillLines)) or 0
    for line = 1, lines do
      local info = call(SB.GetSpellBookSkillLineInfo, line)
      if type(info) == "table" and clean(info.itemIndexOffset) and clean(info.numSpellBookItems) then
        for i = info.itemIndexOffset + 1, info.itemIndexOffset + info.numSpellBookItems do
          local name, sub = call(SB.GetSpellBookItemName, i, bank)
          local item = call(SB.GetSpellBookItemInfo, i, bank)
          local entry = { tab = clean(info.name), name = clean(name), rank = clean(sub) }
          if type(item) == "table" then entry.spellID, entry.passive = clean(item.spellID), clean(item.isPassive) end
          if entry.name then list[#list + 1] = entry end
        end
      end
    end
  elseif GetNumSpellTabs then
    local book = BOOKTYPE_SPELL or "spell"
    for tab = 1, (clean(call(GetNumSpellTabs)) or 0) do
      local tabName, _, offset, num = call(GetSpellTabInfo, tab)
      offset, num = clean(offset) or 0, clean(num) or 0
      for i = offset + 1, offset + num do
        local name, sub = call(GetSpellBookItemName, i, book)
        local _, spellID = call(GetSpellBookItemInfo, i, book)
        if clean(name) then
          list[#list + 1] = { tab = clean(tabName), name = clean(name), rank = clean(sub), spellID = clean(spellID) }
        end
      end
    end
  end
  return list
end

local function collectSkills()
  local list = {}
  local S = C_SkillInfo or {}
  local numFn = S.GetNumSkillLines or GetNumSkillLines
  local infoFn = S.GetSkillLineInfo or GetSkillLineInfo
  local num = clean((call(numFn))) or 0
  for i = 1, num do
    local r = pack(call(infoFn, i))
    local s
    if type(r[1]) == "table" then
      local v = r[1]
      s = {
        name = clean(v.skillName or v.name), header = clean(v.isHeader),
        rank = clean(v.skillRank or v.rank), max = clean(v.skillMaxRank or v.maxRank), modifier = clean(v.skillModifier),
      }
    else
      -- skillName, isHeader, isExpanded, skillRank, numTempPoints, skillModifier, skillMaxRank
      s = { name = clean(r[1]), header = clean(r[2]), rank = clean(r[4]), max = clean(r[7]), modifier = clean(r[6]) }
    end
    if s.name then list[#list + 1] = s end
  end
  return list
end

local function collectQuests()
  local list = {}
  local Q = C_QuestLog or {}
  local num = clean((call(Q.GetNumQuestLogEntries or GetNumQuestLogEntries))) or 0
  for i = 1, num do
    if Q.GetInfo then
      local info = call(Q.GetInfo, i)
      if type(info) == "table" and not info.isHeader and clean(info.title) then
        local q = { id = clean(info.questID), title = clean(info.title), level = clean(info.level), complete = clean(info.isComplete) or nil, objectives = {} }
        local objectives = q.id and call(Q.GetQuestObjectives, q.id)
        if type(objectives) == "table" then
          for _, o in ipairs(objectives) do
            q.objectives[#q.objectives + 1] = { text = clean(o.text), done = clean(o.finished) }
          end
        end
        list[#list + 1] = q
      end
    else
      local title, level, _, isHeader, _, isComplete, _, questID = call(GetQuestLogTitle, i)
      if clean(title) and not isHeader then
        local q = { id = clean(questID), title = clean(title), level = clean(level), objectives = {} }
        q.complete = (isComplete == 1 or isComplete == true) or nil
        for j = 1, (clean(call(GetNumQuestLeaderBoards, i)) or 0) do
          local text, _, finished = call(GetQuestLogLeaderBoard, j, i)
          q.objectives[#q.objectives + 1] = { text = clean(text), done = clean(finished) }
        end
        list[#list + 1] = q
      end
    end
  end
  return list
end

-- RestedXP (RXPGuides) garde son état par personnage dans RXPCData : guide et étape en cours.
local function collectRestedXP()
  local d = rawget(_G, "RXPCData")
  if type(d) ~= "table" then return nil end
  return {
    guide = clean(d.currentGuideName),
    group = clean(d.currentGuideGroup),
    step = clean(d.currentStep),
    stepId = clean(d.currentStepId),
    xpRate = clean(d.xprate),
  }
end

---------------------------------------------------------------------------
-- Photo et sauvegarde
---------------------------------------------------------------------------

local pendingAfterCombat = false
local lastReason

local function characterKey()
  local name, realm = clean(call(UnitName, "player")), clean(call(GetRealmName))
  if not name or not realm then return nil end
  return name .. "-" .. realm
end

local function snapshot(reason)
  if type(PexGuideExportDB) ~= "table" or type(PexGuideExportDB.characters) ~= "table" then return false end
  if InCombatLockdown and InCombatLockdown() then
    pendingAfterCombat = true
    return false
  end
  local key = characterKey()
  if not key then return false end
  local version, build, buildDate, interface = call(GetBuildInfo)
  PexGuideExportDB.characters[key] = {
    schema = SCHEMA,
    addonVersion = VERSION,
    reason = reason,
    exportedAt = clean(call(time)),
    exportedAtUTC = clean(call(date, "!%Y-%m-%dT%H:%M:%SZ")),
    client = { version = clean(version), build = clean(build), buildDate = clean(buildDate), interface = clean(interface), locale = clean(call(GetLocale)) },
    character = safe(collectCharacter),
    position = safe(collectPosition),
    stats = safe(collectStats),
    equipment = safe(collectEquipment),
    bags = safe(collectBags),
    pet = safe(collectPet),
    talents = safe(collectTalents),
    spells = safe(collectSpells),
    skills = safe(collectSkills),
    quests = safe(collectQuests),
    restedXP = safe(collectRestedXP),
  }
  PexGuideExportDB.lastKey = key
  pendingAfterCombat = false
  lastReason = reason
  return true
end

-- Regroupe les événements rapprochés : une seule photo 2 s après le dernier.
local timer
local function schedule(reason)
  lastReason = reason
  if not (C_Timer and C_Timer.NewTimer) then snapshot(reason) return end
  if timer then timer:Cancel() end
  timer = C_Timer.NewTimer(2, function()
    timer = nil
    snapshot(lastReason)
  end)
end

local function say(msg)
  local frame = DEFAULT_CHAT_FRAME
  if frame and frame.AddMessage then frame:AddMessage("|cff62b2d2Pex Guide Export|r : " .. msg) end
end

---------------------------------------------------------------------------
-- Événements
---------------------------------------------------------------------------

local f = CreateFrame("Frame")
local EVENTS = {
  "ADDON_LOADED", "PLAYER_ENTERING_WORLD", "PLAYER_LEVEL_UP", "PLAYER_EQUIPMENT_CHANGED",
  "SKILL_LINES_CHANGED", "CHARACTER_POINTS_CHANGED", "UNIT_PET", "QUEST_LOG_UPDATE",
  "PLAYER_MONEY", "LEARNED_SPELL_IN_TAB", "PLAYER_REGEN_ENABLED", "PLAYER_LOGOUT",
}
for _, event in ipairs(EVENTS) do pcall(f.RegisterEvent, f, event) end

f:SetScript("OnEvent", function(_, event, arg1)
  if event == "ADDON_LOADED" then
    if arg1 == ADDON_NAME then
      if type(PexGuideExportDB) ~= "table" then PexGuideExportDB = {} end
      PexGuideExportDB.schema = SCHEMA
      PexGuideExportDB.characters = PexGuideExportDB.characters or {}
    end
  elseif event == "PLAYER_LOGOUT" then
    snapshot("logout")
  elseif event == "PLAYER_REGEN_ENABLED" then
    if pendingAfterCombat then schedule("after-combat") end
  elseif event == "UNIT_PET" then
    if arg1 == "player" then schedule(event) end
  else
    schedule(event)
  end
end)

---------------------------------------------------------------------------
-- Commande /pge
---------------------------------------------------------------------------

SLASH_PEXGUIDEEXPORT1 = "/pge"
SlashCmdList.PEXGUIDEEXPORT = function(msg)
  msg = (msg or ""):lower():gsub("^%s+", ""):gsub("%s+$", "")
  if msg == "status" then
    local key = characterKey()
    local snap = key and PexGuideExportDB.characters[key]
    if snap then
      say(("dernière photo de %s : %s (%s). Version %s."):format(key, tostring(snap.exportedAtUTC), tostring(snap.reason), VERSION))
    else
      say("aucune photo pour ce personnage. Tape /pge pour en faire une.")
    end
  elseif msg == "reset" then
    local key = characterKey()
    if key then PexGuideExportDB.characters[key] = nil end
    say("photo de ce personnage effacée.")
  else
    if snapshot("manual") then
      say("fiche enregistrée. Fais /reload (ou déconnecte-toi) pour l'écrire sur le disque.")
    else
      say("pas maintenant (combat en cours ?). La photo sera prise à la fin du combat.")
    end
  end
end
