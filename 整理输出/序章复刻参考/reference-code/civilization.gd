extends RefCounted
## Shared age rules. Research is produced by actual scholars; the last fifteen
## points belong to a physical project, not an automatic research countdown.
const RESEARCH_LIMIT: float = 85.0
const TITLES: Array[String] = ["冷兵器", "热兵器", "激光"]

static func era_for(science: float) -> int:
	return 0 if science < 30.0 else (1 if science < 60.0 else 2)

static func phase_for(science: float) -> int:
	return 1 if science >= float(era_for(science) * 30 + 15) else 0

static func title_for(science: float) -> String:
	return TITLES[era_for(science)] + (" · 末期" if phase_for(science) == 1 else " · 早期")

static func medical_multiplier(era: int) -> float:
	return [1.0, 0.6, 0.25][clampi(era, 0, 2)]

static func production_multiplier(era: int) -> float:
	return [1.0, 1.25, 1.5][clampi(era, 0, 2)]

static func disease_fatality(era: int) -> float:
	return [0.25, 0.15, 0.08][clampi(era, 0, 2)]

static func combat_profile(era: int) -> Dictionary:
	var value: int = clampi(era, 0, 2)
	return {"era":value, "weapon":["sword","musket","laser"][value],
		"range":[0.95,4.0,6.0][value], "damage":1.0, "cooldown":[0.8,1.3,1.0][value]}
