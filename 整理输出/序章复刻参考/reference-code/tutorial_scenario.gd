extends RefCounted
## Explicit, session-local learning conditions. Apply immediately after loading
## the common config and BEFORE creating the opening nations and spirit ledger.
## Regular challenge/sandbox sessions never use these values.
const BLESSING_NAME: String = "见习丰饶祝福"
const BLESSING_DESCRIPTION: String = "教程专属：两国各60位真实居民，配套住房与农牧设施；住房每间15人，生育年率50%，普通施工2秒，学士每年研究8点，田地年产100粮，每只羊实际出肉40粮，羊群半年繁育一轮，开局3年口粮。保持3倍速，约一分钟完成养育；人口、建筑、屠宰与时代都由居民真实工作推进。"
const CONFIG: Dictionary = {
	"game_mode":"tutorial",
	"max_years":0.0,
	"target_souls":0,
	"science_ending":false,
	"initial_population":60,
	"initial_spirit":120.0,
	"initial_food_years":3.0,
	"house_capacity":15,
	"birth_rate":0.5,
	"construction_seconds":2.0,
	"civilization_research_per_scholar":8.0,
	"scholar_research_per_year":8.0,
	"field_food_per_year":100.0,
	"livestock_meat_food":40.0,
	"livestock_breeding_years":0.5,
}


static func apply_config(config: Dictionary) -> void:
	for key: String in CONFIG: config[key] = CONFIG[key]
	config["tutorial_blessing_name"] = BLESSING_NAME
	config["tutorial_blessing_description"] = BLESSING_DESCRIPTION


static func get_config_overrides() -> Dictionary:
	return CONFIG.duplicate(true)
