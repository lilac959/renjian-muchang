extends Node
## Story gates observe authoritative simulation receipts; they never grant food,
## residents, science, spirit, unlocks, damage or control of the camera/UI.
signal conversation_requested(id: String)
signal objective_changed(title: String, details: String, progress: float)
signal phase_changed(phase: String)
signal finale_requested(point: Vector3)
signal completed

const PHASES: Array[String] = ["intro", "peace", "weather", "rain", "stewardship", "harvest", "first_soul", "catastrophe", "final_cast", "finale", "complete"]
const LOVE_SKILLS: Array[String] = ["reconcile", "prosperity", "joy"]
const HARVEST_SKILLS: Array[String] = ["lightning", "meteor", "rage", "plague", "undead"]
const DIVINE_DEATH_CAUSES: Array[String] = ["meteor", "plague", "disease", "rage", "undead", "transformation", "halloween", "ghost_parade", "fire", "volcano", "lightning", "meteor_shower"]
const POPULATION_TARGET: int = 300
const HARVEST_TARGET: int = 50
const SOUL_SPIRIT_TARGET: float = 25.0
const DIALOGUES: Dictionary = {
	"intro": ["intro"], "peace": [], "weather": ["peace_done", "weather_intro"],
	"rain": [], "stewardship": ["rain_done", "stewardship"],
	"harvest": ["harvest_reveal"], "first_soul": ["first_soul"],
	"catastrophe": ["catastrophe"], "final_cast": ["before_finale"],
	"finale": [], "complete": [],
}

var phase: String = "intro"
var _sim
var _citizens
var _conflicts
var _started: bool = false
var _dialogue_id: String = ""
var _peace_nations: Array[bool] = [false, false]
var _peace_targets: Array[int] = [-1, -1]
var _rain_casts: int = 0
var _stewardship_achieved: bool = false
var _harvest_deaths: int = 0
var _soul_income_baseline: float = 0.0
var _elapsed_seconds: float = 0.0
var _finale_cast_armed: bool = false
var _finale_cast_id: int = -1
var _finale_impact_seen: bool = false
var _finale_point: Vector3 = Vector3.ZERO
var _last_objective: Dictionary = {}


func setup(sim, citizens, conflicts) -> void:
	_sim = sim
	_citizens = citizens
	_conflicts = conflicts
	phase = "intro"
	_started = false
	_dialogue_id = ""
	_peace_nations = [false, false]
	_peace_targets = [-1, -1]
	_rain_casts = 0
	_stewardship_achieved = false
	_harvest_deaths = 0
	_soul_income_baseline = 0.0
	_elapsed_seconds = 0.0
	_finale_cast_armed = false
	_finale_cast_id = -1
	_finale_impact_seen = false
	_finale_point = Vector3.ZERO
	_last_objective.clear()


func begin() -> void:
	if _sim == null: return
	if _started:
		refresh_presentation()
		return
	_started = true
	_publish_objective(true)
	_request_conversation("intro")


func refresh_presentation() -> void:
	# Call after restore, once the host has rebuilt and connected its UI.
	phase_changed.emit(phase)
	_publish_objective(true)
	if not _dialogue_id.is_empty(): conversation_requested.emit(_dialogue_id)
	elif phase == "finale": finale_requested.emit(_finale_point)
	elif phase == "complete": completed.emit()


func advance(delta: float, speed: float, paused: bool) -> void:
	if not _started or paused or is_dialogue_active() or is_finale(): return
	if not is_finite(delta) or not is_finite(speed) or delta <= 0.0 or speed <= 0.0: return
	var seconds: float = delta * speed
	if not is_finite(seconds): return
	_elapsed_seconds += seconds
	_check_world_objectives()
	_publish_objective()


func notify_conversation_finished(id: String) -> void:
	if not _started or id != _dialogue_id or id.is_empty(): return
	_dialogue_id = ""
	match id:
		"intro": _set_phase("peace")
		"peace_done": _request_conversation("weather_intro")
		"weather_intro": _set_phase("rain")
		"rain_done": _request_conversation("stewardship")
		"stewardship", "harvest_reveal", "catastrophe", "before_finale":
			_check_world_objectives()
		"first_soul":
			_set_phase("catastrophe")
			_request_conversation("catastrophe")
	_publish_objective(true)


func notify_cast(skill: String, receipt: Dictionary = {}) -> void:
	# Hosts call this AFTER a successful paid cast, never on preview/selection.
	# Death totals come only from notify_human_deaths, so synchronous cast kills
	# and delayed plague/fire/undead deaths cannot be counted twice here.
	if not _started or is_dialogue_active() or is_finale() or not is_skill_allowed(skill): return
	if not bool(receipt.get("ok", false)): return
	if phase == "peace" and skill == "reconcile":
		_observe_reconciliation(receipt)
	elif phase == "rain" and skill in ["climate", "rain"]:
		var nation: int = int(receipt.get("nation", -1))
		if nation not in [0, 1] or _sim == null or _sim.nations.size() != 2: return
		# Default dry weather alone, failed casts and empty receipts do not count.
		if float(_sim.nations[nation].get("rain", 0.22)) <= 0.220001: return
		if skill == "climate" and str(_sim.nations[nation].get("climate_precipitation", "none")) != "rain": return
		_rain_casts += 1
		_set_phase("stewardship")
		_request_conversation("rain_done")
	elif phase == "final_cast" and skill in ["meteor", "meteor_shower"]:
		# The one meteor button owns the upgraded shower. Only a real queued
		# continuous event can arm the finale; a normal single impact cannot.
		if int(receipt.get("id", receipt.get("event_id", -1))) < 0: return
		_finale_cast_armed = true
		_finale_cast_id = int(receipt.get("id", receipt.get("event_id", -1)))
		var point: Variant = receipt.get("point", Vector3.ZERO)
		if point is Vector3 and point.is_finite(): _finale_point = point
	_publish_objective(true)


func _observe_reconciliation(receipt: Dictionary) -> void:
	if _sim == null or not is_instance_valid(_citizens) or not _citizens.has_method("get_person_info"): return
	var id: int = int(receipt.get("target_id", receipt.get("person_id", -1)))
	var person: Dictionary = _citizens.get_person_info(id)
	if person.is_empty() or not bool(person.get("alive", false)): return
	var nation: int = int(person.get("nation", -1))
	if nation not in [0, 1] or _sim.nations.size() != 2: return
	# A soldier only withdraws himself. A reigning king accepting the paid
	# power opens the story's bilateral negotiation; the host then recalls both
	# real armies through negotiate_tutorial_peace, including the other side.
	if int(_sim.nations[nation].get("leader_id", -2)) != id: return
	if str(receipt.get("target_role", "king")) != "king": return
	if int(receipt.get("affected_count", receipt.get("count", 0))) <= 0: return
	if not bool(person.get("is_reconciled", false)) and float(person.get("reconcile_remaining", 0.0)) <= 0.0: return
	_peace_nations[nation] = true
	_peace_targets[nation] = id
	_peace_nations[1 - nation] = true
	_peace_targets[1 - nation] = int(_sim.nations[1 - nation].get("leader_id", -1))
	_set_phase("weather")
	_request_conversation("peace_done")


func notify_human_deaths(cause: String, count: int) -> void:
	# Connect once to the authoritative committed-human-death ledger. Animal
	# deaths, skeleton deaths, normal ageing, combat and predictions are excluded.
	if not _started or count <= 0 or cause not in DIVINE_DEATH_CAUSES: return
	if PHASES.find(phase) < PHASES.find("harvest") or is_finale(): return
	_harvest_deaths += count
	if phase == "harvest" and not is_dialogue_active():
		_set_phase("first_soul")
		_request_conversation("first_soul")
	elif phase == "catastrophe" and not is_dialogue_active():
		_check_world_objectives()
	_publish_objective(true)


func notify_impact(skill: String, point: Vector3, receipt: Dictionary = {}) -> void:
	# Forward CataclysmSystem.actual_impact here. A paid shower is armed above;
	# only its first real ground impact may start camera/black/title presentation.
	# The existing payload has radius, skill, point and actual damage, no event ID.
	if phase != "final_cast" or is_dialogue_active() or not _finale_cast_armed: return
	if skill != "meteor_shower" or not point.is_finite(): return
	if str(receipt.get("skill", skill)) != skill or float(receipt.get("radius", 0.0)) <= 0.0: return
	if receipt.has("event_id") and _finale_cast_id >= 0 and int(receipt.event_id) != _finale_cast_id: return
	_finale_impact_seen = true
	_finale_point = point
	_set_phase("finale")
	finale_requested.emit(point)


func notify_finale_finished() -> void:
	# The host calls after the actual zoom, fade and title have completed.
	if phase != "finale" or not _finale_impact_seen: return
	_set_phase("complete")
	completed.emit()


func _check_world_objectives() -> void:
	if is_dialogue_active(): return
	if phase == "stewardship" and _population() >= POPULATION_TARGET and _modern_count() == 2:
		_stewardship_achieved = true
		_soul_income_baseline = _soul_income()
		_set_phase("harvest")
		_request_conversation("harvest_reveal")
	elif phase == "harvest" and _harvest_deaths > 0:
		_set_phase("first_soul")
		_request_conversation("first_soul")
	elif phase == "catastrophe" and _harvest_deaths >= HARVEST_TARGET:
		_set_phase("final_cast")
		_request_conversation("before_finale")


func get_allowed_skills() -> Array[String]:
	var result: Array[String] = LOVE_SKILLS.duplicate()
	if PHASES.find(phase) >= PHASES.find("rain"): result.append("climate")
	if PHASES.find(phase) >= PHASES.find("harvest"): result.append_array(HARVEST_SKILLS)
	return result


func is_skill_allowed(key: String) -> bool:
	# Old saves may still send a queued shower/rain receipt, without exposing
	# either as an extra player-facing ability.
	if key == "meteor_shower": return PHASES.find(phase) >= PHASES.find("final_cast")
	if key == "rain": return PHASES.find(phase) >= PHASES.find("rain")
	return key in get_allowed_skills()


func is_god_visible(god: String) -> bool:
	if god == "love": return true
	if god == "weather": return PHASES.find(phase) >= PHASES.find("weather")
	if god == "death": return PHASES.find(phase) >= PHASES.find("harvest")
	return false


func is_dialogue_active() -> bool:
	return not _dialogue_id.is_empty()


func is_finale() -> bool:
	return phase in ["finale", "complete"]


func _set_phase(next_phase: String) -> void:
	if next_phase not in PHASES or PHASES.find(next_phase) <= PHASES.find(phase): return
	phase = next_phase
	phase_changed.emit(phase)
	_publish_objective(true)


func _request_conversation(id: String) -> void:
	_dialogue_id = id
	conversation_requested.emit(id)


func _population() -> int:
	if _sim == null or _sim.nations.size() != 2: return 0
	# The economic census owns births and deaths; floor each real national
	# population so fractional bookkeeping can never pass the 300-person gate.
	return int(floor(float(_sim.nations[0].get("population", 0.0)))) + int(floor(float(_sim.nations[1].get("population", 0.0))))


func _eras() -> Array[int]:
	if _sim == null or _sim.nations.size() != 2: return [0, 0]
	return [int(_sim.nations[0].get("era", 0)), int(_sim.nations[1].get("era", 0))]


func _modern_count() -> int:
	var count: int = 0
	for era: int in _eras():
		if era >= 1: count += 1
	return count


func _soul_income() -> float:
	if _sim == null: return 0.0
	return maxf(0.0, float(_sim.spirit_sources.get("souls", 0.0)))


func _objective() -> Dictionary:
	var title: String = "新神上任"
	var details: String = "听生命之神介绍双岛与神力。"
	var progress: float = 0.0
	match phase:
		"peace":
			title = "劝国王接受停火"
			details = "对任一国戴王冠的真实国王使用一次「和解」，生命之神将促成双方停火，所有士兵真实返乡。对士兵施法只会劝返该士兵。"
		"weather", "rain":
			title = "让雨水滋润土地"
			details = "选择天气之神的「气候控制」，选「恒温＋多云」后点击岛屿，让雨水帮助真实农牧生产。"
		"stewardship":
			title = "爱护子民，让双岛繁荣"
			details = "总人口 %d/300 · 两国热兵器时代 %d/2。停火持续到养育目标完成；居民会真实建房、生产、生育和研究。保持 3 倍速，约一分钟见证繁荣。" % [_population(), _modern_count()]
			progress = minf(1.0, float(_population()) / float(POPULATION_TARGET)) * 0.75 + float(_modern_count()) * 0.125
		"harvest", "first_soul", "catastrophe":
			title = "收集人类灵魂（%d/%d）" % [mini(_harvest_deaths, HARVEST_TARGET), HARVEST_TARGET]
			details = "用闪电或陨石收割，再用亡灵复苏尸体。神罚实际死亡 %d 人；新增收魂灵力 %.1f/25（累计收入，不受施法花费影响）。" % [_harvest_deaths, maxf(0.0, _soul_income() - _soul_income_baseline)]
			progress = minf(1.0, float(_harvest_deaths) / float(HARVEST_TARGET))
		"final_cast":
			title = "亲自施放最后一场流星雨"
			details = "陨石已获得满级祝福。选择「天气之神 → 陨石」点击城镇，等待流星雨真正落地。" if not _finale_cast_armed else "流星已经出发，等待真实落地……"
		"finale", "complete":
			title = "神明也疯狂"
			details = "序章完成。"
			progress = 1.0
	return {"title":title, "details":details, "progress":progress}


func _publish_objective(force: bool = false) -> void:
	var objective: Dictionary = _objective()
	if not force and objective == _last_objective: return
	_last_objective = objective.duplicate(true)
	objective_changed.emit(str(objective.title), str(objective.details), float(objective.progress))


func capture_save_state() -> Dictionary:
	# Deliberately contains no Node/Object/Callable/UI references.
	return {"version":1, "phase":phase, "started":_started, "dialogue_id":_dialogue_id,
		"peace_nations":_peace_nations.duplicate(), "peace_targets":_peace_targets.duplicate(),
		"rain_casts":_rain_casts, "stewardship_achieved":_stewardship_achieved,
		"harvest_deaths":_harvest_deaths, "soul_income_baseline":_soul_income_baseline,
		"elapsed_seconds":_elapsed_seconds, "finale_cast_armed":_finale_cast_armed,
		"finale_cast_id":_finale_cast_id, "finale_impact_seen":_finale_impact_seen,
		"finale_point":[_finale_point.x, _finale_point.y, _finale_point.z]}


func restore_save_state(state: Dictionary) -> bool:
	# Validate before assignment. Milestones remain historical after harvesting
	# reduces the population; live world metrics must never send a phase backward.
	if int(state.get("version", -1)) != 1: return false
	var restored_phase: String = str(state.get("phase", ""))
	if restored_phase not in PHASES: return false
	var rank: int = PHASES.find(restored_phase)
	var dialogue: String = str(state.get("dialogue_id", ""))
	if not dialogue.is_empty() and dialogue not in DIALOGUES[restored_phase]: return false
	for key: String in ["started", "stewardship_achieved", "finale_cast_armed", "finale_impact_seen"]:
		if not state.get(key) is bool: return false
	for key: String in ["peace_nations", "peace_targets", "finale_point"]:
		if not state.get(key) is Array: return false
	if state.peace_nations.size() != 2 or state.peace_targets.size() != 2 or state.finale_point.size() != 3: return false
	for value: Variant in state.peace_nations:
		if not value is bool: return false
	for value: Variant in state.peace_targets:
		if not value is int and not value is float: return false
	for key: String in ["rain_casts", "harvest_deaths", "soul_income_baseline", "elapsed_seconds", "finale_cast_id"]:
		if not (state.get(key) is int or state.get(key) is float) or not is_finite(float(state[key])): return false
	for value: Variant in state.finale_point:
		if not (value is int or value is float) or not is_finite(float(value)): return false
	if int(state.rain_casts) < 0 or int(state.harvest_deaths) < 0 or float(state.soul_income_baseline) < 0.0 or float(state.elapsed_seconds) < 0.0: return false
	if not bool(state.started) and (restored_phase != "intro" or not dialogue.is_empty()): return false
	if rank >= PHASES.find("weather") and (not bool(state.peace_nations[0]) or not bool(state.peace_nations[1])): return false
	if rank >= PHASES.find("stewardship") and int(state.rain_casts) <= 0: return false
	if rank >= PHASES.find("harvest") and not bool(state.stewardship_achieved): return false
	if rank >= PHASES.find("first_soul") and int(state.harvest_deaths) < 1: return false
	if rank >= PHASES.find("final_cast") and int(state.harvest_deaths) < HARVEST_TARGET: return false
	if rank >= PHASES.find("finale") and (not bool(state.finale_cast_armed) or not bool(state.finale_impact_seen)): return false
	phase = restored_phase
	_started = bool(state.started)
	_dialogue_id = dialogue
	_peace_nations.assign(state.peace_nations)
	_peace_targets.assign(state.peace_targets)
	# Older saves could contain one accepted king while waiting for a second
	# spell. That already satisfies the new treaty lesson; refresh_presentation
	# lets the host apply the same real bilateral recall as a fresh acceptance.
	if phase == "peace" and (_peace_nations[0] or _peace_nations[1]):
		phase = "weather"
		_dialogue_id = "peace_done"
		for nation: int in range(2):
			_peace_nations[nation] = true
			if _peace_targets[nation] < 0 and _sim != null and _sim.nations.size() == 2:
				_peace_targets[nation] = int(_sim.nations[nation].get("leader_id", -1))
	_rain_casts = int(state.rain_casts)
	_stewardship_achieved = bool(state.stewardship_achieved)
	_harvest_deaths = int(state.harvest_deaths)
	_soul_income_baseline = float(state.soul_income_baseline)
	_elapsed_seconds = float(state.elapsed_seconds)
	_finale_cast_armed = bool(state.finale_cast_armed)
	_finale_cast_id = int(state.finale_cast_id)
	_finale_impact_seen = bool(state.finale_impact_seen)
	_finale_point = Vector3(float(state.finale_point[0]), float(state.finale_point[1]), float(state.finale_point[2]))
	_last_objective.clear()
	return true


func get_state() -> Dictionary:
	var result: Dictionary = capture_save_state()
	result["population"] = _population()
	result["eras"] = _eras()
	result["modern_nations"] = _modern_count()
	result["harvest_target"] = HARVEST_TARGET
	result["soul_spirit_earned"] = maxf(0.0, _soul_income() - _soul_income_baseline)
	result["soul_spirit_target"] = SOUL_SPIRIT_TARGET
	result["allowed_skills"] = get_allowed_skills()
	result["objective"] = _objective()
	return result


func get_debug_stats() -> Dictionary:
	return get_state()
