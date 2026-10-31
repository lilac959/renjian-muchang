extends CanvasLayer
## Presentation only: the tutorial director owns simulation, casting and camera state.

signal conversation_finished(id: String)
signal dialogue_visibility_changed(visible: bool)
signal line_changed(id: String, index: int, speaker: String)
signal exit_requested
signal challenge_requested
signal replay_requested

const STORY_PATH := "res://config/tutorial_story.json"
const Content = preload("res://scripts/content_config.gd")
const UiConfig = preload("res://scripts/ui_config.gd")
const INK := Color("f2efe7")
const MUTED := Color("a8bac3")
const GOLD := Color("e7c787")
const GODS := {
	"love": {"name": "生命之神", "role": "养育 · 和解", "color": "f0afbc", "side": "left"},
	"weather": {"name": "天气之神", "role": "云层服务部", "color": "8fd2e7", "side": "right"},
	"death": {"name": "死亡之神", "role": "灵魂归档科", "color": "c1afe8", "side": "right"},
	"you": {"name": "见习上帝", "role": "入职第一天", "color": "e7c787", "side": ""},
	"narrator": {"name": "", "role": "", "color": "cbd4d9", "side": ""}
}

var root_control: Control
var dialogue_panel: PanelContainer
var dialogue_text: RichTextLabel
var name_label: Label
var speaker_badge: PanelContainer
var role_label: Label
var dialogue_hint: Label
var advance_button: Button
var exit_button: Button
var chapter_label: Label
var objective_panel: PanelContainer
var objective_title: Label
var objective_details: Label
var objective_progress: Label
var objective_toggle: Button
var objective_exit: Button
var objective_chapter: Label
var portrait_slots: Dictionary = {}
var black_overlay: ColorRect
var title_group: VBoxContainer
var title_label: Label
var complete_panel: PanelContainer
var challenge_button: Button
var menu_button: Button

var _dialogue_surface: Control
var _objective_body: VBoxContainer
var _objective_scroll: ScrollContainer
var _story: Dictionary = {}
var _conversation_id := ""
var _lines: Array = []
var _line_index := 0
var _dialogue_visible := false
var _revealed_characters := 0.0
var _typing := false
var _type_clock := 0.0
var _characters_per_second := 38.0
var _last_advance_frame := -1
var _chapter_index := 0
var _chapter_title := "见习神明入职引导"
var _objective := {"title": "", "details": "", "progress": "", "collapsed": false}
var _left_god := ""
var _right_god := ""
var _textures: Dictionary = {}
var _portrait_tweens: Dictionary = {}
var _finale_phase := "none"
var _finale_progress := 0.0
var _complete := false

func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	root_control = Control.new()
	root_control.name = "TutorialDialogue"
	root_control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root_control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_control.theme = UiConfig.theme(16)
	_characters_per_second = UiConfig.number("ux","dialogue_characters_per_second",38.0,1.0,300.0)
	add_child(root_control)
	UiConfig.bind(root_control,"tutorial")
	_build_dialogue()
	_build_objective()
	_build_finale()
	root_control.resized.connect(_layout)
	_load_story()
	_refresh_all()
	_layout.call_deferred()

func _process(delta: float) -> void:
	if not _dialogue_visible or not _typing or not is_instance_valid(dialogue_text):
		return
	_type_clock += maxf(0.0, delta)
	var full_text: String = _current_text()
	while _type_clock >= 1.0 / _characters_per_second and _typing:
		_type_clock -= 1.0 / _characters_per_second
		_revealed_characters += 1.0
		var amount := mini(int(_revealed_characters), full_text.length())
		dialogue_text.visible_characters = amount
		if amount >= full_text.length():
			_typing = false
			_refresh_hint()
		elif amount > 0:
			var character: String = full_text.substr(amount - 1, 1)
			if character in ["。", "！", "？", "…"]:
				_type_clock -= UiConfig.number("ux","dialogue_punctuation_pause_seconds",0.10,0.0,2.0)
			elif character in ["，", "；", "："]:
				_type_clock -= UiConfig.number("ux","dialogue_comma_pause_seconds",0.045,0.0,1.0)

func _input(event: InputEvent) -> void:
	if not blocks_world_input():
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var key: int = event.keycode if event.keycode != 0 else event.physical_keycode
		if UiConfig.event_is_action(event,"cancel"):
			get_viewport().set_input_as_handled()
			exit_requested.emit()
		elif _dialogue_visible and UiConfig.event_is_action(event,"dialogue_advance"):
			get_viewport().set_input_as_handled()
			advance_dialogue()
		elif not _complete or key not in [KEY_ENTER, KEY_KP_ENTER, KEY_SPACE, KEY_TAB, KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN]:
			# Do not let gameplay shortcuts fire behind the conversation or finale.
			get_viewport().set_input_as_handled()

func show_conversation(id: String, lines: Array = []) -> void:
	_load_story()
	var source: Variant = _story.get(id, []) if lines.is_empty() else lines
	_lines = _clean_lines(source)
	_conversation_id = id
	_line_index = 0
	_left_god = ""
	_right_god = ""
	_complete = false
	_finale_phase = "none"
	_finale_progress = 0.0
	_last_advance_frame = Engine.get_process_frames()
	if _lines.is_empty():
		set_dialogue_visible(false)
		conversation_finished.emit(id)
		return
	_dialogue_visible = true
	_revealed_characters = 0.0
	_type_clock = 0.0
	_typing = not _current_text().is_empty()
	if is_instance_valid(root_control):
		_apply_line(true)
		_refresh_visibility()
		dialogue_visibility_changed.emit(true)

func advance_dialogue() -> void:
	if not _dialogue_visible or _last_advance_frame == Engine.get_process_frames():
		return
	_last_advance_frame = Engine.get_process_frames()
	if _typing and UiConfig.flag("dialogue_click_reveals_first"):
		_revealed_characters = float(_current_text().length())
		_typing = false
		if is_instance_valid(dialogue_text):
			dialogue_text.visible_characters = int(_revealed_characters)
			_refresh_hint()
		return
	if _line_index + 1 < _lines.size():
		_line_index += 1
		_revealed_characters = 0.0
		_type_clock = 0.0
		_typing = not _current_text().is_empty()
		_apply_line(true)
	else:
		var finished_id := _conversation_id
		set_dialogue_visible(false)
		conversation_finished.emit(finished_id)

func set_dialogue_visible(value: bool) -> void:
	var changed := _dialogue_visible != value
	_dialogue_visible = value and not _lines.is_empty()
	if not _dialogue_visible:
		_typing = false
	if is_instance_valid(root_control):
		_refresh_visibility()
	if changed:
		dialogue_visibility_changed.emit(_dialogue_visible)

func set_objective(title: String, details: String, progress: String = "") -> void:
	_objective.title = title
	_objective.details = details
	_objective.progress = progress
	if is_instance_valid(root_control):
		_refresh_objective()
		_refresh_visibility()

func set_chapter(index: int, title: String) -> void:
	_chapter_index = maxi(0, index)
	_chapter_title = title
	if is_instance_valid(root_control):
		_refresh_chapter()

func set_finale(phase: String, progress: float) -> void:
	_finale_phase = phase if phase in ["none", "clear", "zoom", "black", "title"] else "none"
	_finale_progress = clampf(progress, 0.0, 1.0)
	_complete = false
	if _finale_phase not in ["none", "clear"]:
		set_dialogue_visible(false)
	if is_instance_valid(root_control):
		_refresh_finale()
		_refresh_visibility()

func show_complete() -> void:
	set_dialogue_visible(false)
	_finale_phase = "title"
	_finale_progress = 1.0
	_complete = true
	if is_instance_valid(root_control):
		_refresh_finale()
		_refresh_visibility()
		challenge_button.grab_focus.call_deferred()

func blocks_world_input() -> bool:
	return _dialogue_visible or _complete or _finale_phase not in ["none", "clear"] or _last_advance_frame == Engine.get_process_frames()

func is_conversation_active() -> bool:
	return _dialogue_visible

func is_typing() -> bool:
	return _typing

func reset() -> void:
	_conversation_id = ""
	_lines = []
	_line_index = 0
	_dialogue_visible = false
	_revealed_characters = 0.0
	_typing = false
	_type_clock = 0.0
	_last_advance_frame = -1
	_chapter_index = 0
	_chapter_title = "见习神明入职引导"
	_objective = {"title": "", "details": "", "progress": "", "collapsed": false}
	_left_god = ""
	_right_god = ""
	_finale_phase = "none"
	_finale_progress = 0.0
	_complete = false
	if is_instance_valid(root_control):
		_refresh_all()
	dialogue_visibility_changed.emit(false)

func capture_save_state() -> Dictionary:
	return {
		"version": 1, "conversation_id": _conversation_id, "lines": _lines.duplicate(true),
		"line_index": _line_index, "dialogue_visible": _dialogue_visible,
		"revealed_characters": int(_revealed_characters), "typing": _typing, "type_clock": _type_clock,
		"chapter_index": _chapter_index, "chapter_title": _chapter_title,
		"objective": _objective.duplicate(true), "left_god": _left_god, "right_god": _right_god,
		"finale_phase": _finale_phase, "finale_progress": _finale_progress, "complete": _complete
	}

func restore_save_state(state: Dictionary) -> bool:
	if int(state.get("version", 0)) != 1:
		return false
	_conversation_id = str(state.get("conversation_id", ""))
	_lines = _clean_lines(state.get("lines", []))
	_line_index = clampi(int(state.get("line_index", 0)), 0, maxi(0, _lines.size() - 1))
	_dialogue_visible = bool(state.get("dialogue_visible", false)) and not _lines.is_empty()
	_revealed_characters = float(clampi(int(state.get("revealed_characters", 0)), 0, _current_text().length()))
	_typing = bool(state.get("typing", false)) and _dialogue_visible and int(_revealed_characters) < _current_text().length()
	var clock_value: Variant = state.get("type_clock", 0.0)
	_type_clock = clampf(float(clock_value), -0.2, 1.0) if clock_value is float or clock_value is int else 0.0
	_chapter_index = maxi(0, int(state.get("chapter_index", 0)))
	_chapter_title = str(state.get("chapter_title", "见习神明入职引导"))
	var saved_objective: Variant = state.get("objective", {})
	var objective: Dictionary = saved_objective if saved_objective is Dictionary else {}
	_objective = {"title": str(objective.get("title", "")), "details": str(objective.get("details", "")), "progress": str(objective.get("progress", "")), "collapsed": bool(objective.get("collapsed", false))}
	_left_god = _known_god(str(state.get("left_god", "")))
	_right_god = _known_god(str(state.get("right_god", "")))
	var phase := str(state.get("finale_phase", "none"))
	_finale_phase = phase if phase in ["none", "clear", "zoom", "black", "title"] else "none"
	var progress_value: Variant = state.get("finale_progress", 0.0)
	_finale_progress = clampf(float(progress_value), 0.0, 1.0) if progress_value is float or progress_value is int else 0.0
	_complete = bool(state.get("complete", false))
	_last_advance_frame = Engine.get_process_frames()
	if is_instance_valid(root_control):
		_refresh_all()
		dialogue_visibility_changed.emit(_dialogue_visible)
	return true

func get_debug_state() -> Dictionary:
	var result := capture_save_state()
	result["text"] = _current_text()
	result["speaker"] = str(_lines[_line_index].get("speaker", "narrator")) if not _lines.is_empty() else ""
	result["line_count"] = _lines.size()
	result["blocks_world_input"] = blocks_world_input()
	result["objective_visible"] = is_instance_valid(objective_panel) and objective_panel.visible
	result["dialogue_rect"] = _rect_data(dialogue_panel) if is_instance_valid(dialogue_panel) else {}
	result["objective_rect"] = _rect_data(objective_panel) if is_instance_valid(objective_panel) else {}
	result["portraits"] = {"left": _left_god, "right": _right_god}
	return result

func _build_dialogue() -> void:
	_dialogue_surface = Control.new()
	_dialogue_surface.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_dialogue_surface.mouse_filter = Control.MOUSE_FILTER_STOP
	_dialogue_surface.gui_input.connect(_on_dialogue_gui_input)
	root_control.add_child(_dialogue_surface)
	var dim := ColorRect.new()
	dim.color = Color(0.012, 0.024, 0.04, 0.23)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dialogue_surface.add_child(dim)
	for side: String in ["left", "right"]:
		var slot := Control.new()
		slot.name = side.capitalize() + "Portrait"
		slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_dialogue_surface.add_child(slot)
		var portrait := TextureRect.new()
		portrait.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(portrait)
		var fallback := _label("", 23, MUTED)
		fallback.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
		fallback.offset_left = -110
		fallback.offset_right = 110
		fallback.offset_top = -120
		fallback.offset_bottom = -70
		fallback.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		fallback.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(fallback)
		portrait_slots[side] = {"root": slot, "texture": portrait, "fallback": fallback, "god": ""}
	dialogue_panel = PanelContainer.new()
	dialogue_panel.name = "DialoguePanel"
	dialogue_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	dialogue_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.025, 0.055, 0.085, 0.94), Color("617b89"), 23, 16))
	_dialogue_surface.add_child(dialogue_panel)
	var content := VBoxContainer.new()
	content.mouse_filter = Control.MOUSE_FILTER_PASS
	content.add_theme_constant_override("separation", 10)
	dialogue_panel.add_child(content)
	var header := HBoxContainer.new()
	header.mouse_filter = Control.MOUSE_FILTER_PASS
	header.add_theme_constant_override("separation", 16)
	content.add_child(header)
	speaker_badge = PanelContainer.new()
	speaker_badge.mouse_filter = Control.MOUSE_FILTER_PASS
	speaker_badge.add_theme_stylebox_override("panel", _panel_style(Color(0.17, 0.12, 0.17, 0.7), Color("f0afbc"), 12, 3))
	header.add_child(speaker_badge)
	name_label = _label("生命之神", 22, INK)
	name_label.custom_minimum_size.x = 96
	speaker_badge.add_child(name_label)
	role_label = _label("", 13, MUTED)
	role_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(role_label)
	chapter_label = _label("", 13, MUTED)
	header.add_child(chapter_label)
	exit_button = _button("退出引导", func(): exit_requested.emit(), 30)
	exit_button.add_theme_font_size_override("font_size", 13)
	header.add_child(exit_button)
	dialogue_text = RichTextLabel.new()
	dialogue_text.name = "DialogueText"
	dialogue_text.bbcode_enabled = false
	dialogue_text.scroll_active = false
	dialogue_text.selection_enabled = false
	dialogue_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialogue_text.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dialogue_text.custom_minimum_size.y = 100
	dialogue_text.add_theme_font_size_override("normal_font_size", 23)
	dialogue_text.add_theme_color_override("default_color", INK)
	dialogue_text.mouse_filter = Control.MOUSE_FILTER_PASS
	content.add_child(dialogue_text)
	var footer := HBoxContainer.new()
	footer.mouse_filter = Control.MOUSE_FILTER_PASS
	content.add_child(footer)
	dialogue_hint = _label("", 13, MUTED)
	dialogue_hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(dialogue_hint)
	advance_button = _button("继续  →", advance_dialogue, 32)
	advance_button.custom_minimum_size.x = 132
	footer.add_child(advance_button)

func _build_objective() -> void:
	objective_panel = PanelContainer.new()
	objective_panel.name = "TutorialObjective"
	objective_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	objective_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.028, 0.075, 0.10, 0.95), Color("719b9c"), 17, 10))
	root_control.add_child(objective_panel)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 5)
	objective_panel.add_child(content)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	content.add_child(top)
	objective_chapter = _label("", 12, GOLD)
	objective_chapter.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(objective_chapter)
	objective_toggle = _button("收起", _toggle_objective, 24)
	objective_toggle.add_theme_font_size_override("font_size", 12)
	top.add_child(objective_toggle)
	objective_exit = _button("退出引导", func(): exit_requested.emit(), 24)
	objective_exit.add_theme_font_size_override("font_size", 12)
	top.add_child(objective_exit)
	objective_title = _label("", 19, INK)
	content.add_child(objective_title)
	_objective_body = VBoxContainer.new()
	_objective_body.add_theme_constant_override("separation", 4)
	content.add_child(_objective_body)
	_objective_scroll = ScrollContainer.new()
	_objective_scroll.custom_minimum_size.y = 32
	_objective_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_objective_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_objective_body.add_child(_objective_scroll)
	objective_details = _label("", 14, MUTED)
	objective_details.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	objective_details.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_objective_scroll.add_child(objective_details)
	objective_progress = _label("", 14, Color("8ee0cd"))
	objective_progress.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_objective_body.add_child(objective_progress)
	objective_panel.minimum_size_changed.connect(_layout.call_deferred)

func _build_finale() -> void:
	black_overlay = ColorRect.new()
	black_overlay.name = "TutorialBlackout"
	black_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	black_overlay.color = Color(0, 0, 0, 0)
	black_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	root_control.add_child(black_overlay)
	title_group = VBoxContainer.new()
	title_group.name = "FinalTitle"
	title_group.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_group.add_theme_constant_override("separation", 18)
	black_overlay.add_child(title_group)
	var eyebrow := _label("入 职 培 训  ·  结 束", 15, MUTED)
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_group.add_child(eyebrow)
	title_label = _label("神明也疯狂", 76, INK)
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_color_override("font_shadow_color", Color(0.75, 0.46, 0.27, 0.32))
	title_label.add_theme_constant_override("shadow_offset_x", 2)
	title_label.add_theme_constant_override("shadow_offset_y", 3)
	title_group.add_child(title_label)
	complete_panel = PanelContainer.new()
	complete_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	complete_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.025, 0.055, 0.075, 0.9), Color("536774"), 24, 19))
	black_overlay.add_child(complete_panel)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 15)
	complete_panel.add_child(content)
	var label := _label("新手引导已完成", 17, INK)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(label)
	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 14)
	content.add_child(buttons)
	challenge_button = _button("开始主线挑战", func(): challenge_requested.emit(), 46)
	challenge_button.focus_mode = Control.FOCUS_ALL
	challenge_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	buttons.add_child(challenge_button)
	menu_button = _button("返回主菜单", func(): exit_requested.emit(), 46)
	menu_button.focus_mode = Control.FOCUS_ALL
	menu_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	buttons.add_child(menu_button)
	challenge_button.focus_neighbor_right = challenge_button.get_path_to(menu_button)
	menu_button.focus_neighbor_left = menu_button.get_path_to(challenge_button)

func _apply_line(animate: bool) -> void:
	if _lines.is_empty() or not is_instance_valid(dialogue_text):
		return
	var line: Dictionary = _lines[_line_index]
	var speaker := str(line.get("speaker", "narrator"))
	var god: Dictionary = GODS.get(speaker, GODS.narrator)
	if line.has("left"):
		_left_god = _known_god(str(line.left))
	if line.has("right"):
		_right_god = _known_god(str(line.right))
	if speaker in ["love", "weather", "death"] and speaker != _left_god and speaker != _right_god:
		if str(line.get("side", god.side)) == "left":
			_left_god = speaker
		else:
			_right_god = speaker
	var color := Color(str(god.color))
	name_label.text = str(god.name)
	name_label.add_theme_color_override("font_color", color)
	speaker_badge.add_theme_stylebox_override("panel", _panel_style(Color(color.r * 0.12, color.g * 0.12, color.b * 0.12, 0.75), color.darkened(0.25), 12, 3))
	role_label.text = str(god.role)
	dialogue_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.025, 0.055, 0.085, 0.94), color.darkened(0.35), 23, 16))
	dialogue_text.text = str(line.get("text", ""))
	dialogue_text.visible_characters = int(_revealed_characters)
	_set_portrait("left", _left_god, speaker == _left_god, animate)
	_set_portrait("right", _right_god, speaker == _right_god, animate)
	_refresh_hint()
	line_changed.emit(_conversation_id, _line_index, speaker)

func _set_portrait(side: String, god_id: String, speaking: bool, animate: bool) -> void:
	var slot: Dictionary = portrait_slots[side]
	var holder: Control = slot.root
	var portrait: TextureRect = slot.texture
	var fallback: Label = slot.fallback
	var changed: bool = str(slot.god) != god_id
	slot.god = god_id
	if changed: _layout.call_deferred()
	holder.visible = not god_id.is_empty()
	if god_id.is_empty():
		return
	var god: Dictionary = GODS[god_id]
	if changed or portrait.texture == null:
		portrait.texture = _portrait_texture(god_id)
		fallback.text = str(god.name) if portrait.texture == null else ""
		fallback.add_theme_color_override("font_color", Color(str(god.color)))
		fallback.visible = portrait.texture == null
	var options: Dictionary = _portrait_options(god_id)
	var target := Color.WHITE if speaking else UiConfig.color(UiConfig.section("ux").get("portrait_listener_modulate",null),Color(0.78, 0.80, 0.84, 0.96))
	target *= UiConfig.color(options.get("modulate",null),Color.WHITE)
	if _portrait_tweens.has(side) and is_instance_valid(_portrait_tweens[side]):
		_portrait_tweens[side].kill()
	if animate:
		if changed:
			holder.modulate = Color(target.r, target.g, target.b, 0.0)
		var tween := create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
		tween.tween_property(holder, "modulate", target, UiConfig.number("ux","portrait_transition_seconds",0.26,0.0,2.0))
		_portrait_tweens[side] = tween
	else:
		holder.modulate = target

func _portrait_texture(god_id: String) -> Texture2D:
	if _textures.has(god_id) and _textures[god_id] is Texture2D:
		return _textures[god_id]
	var fallback := "res://assets/portraits/%s.png" % god_id
	var path: String = str(_portrait_options(god_id).get("texture",fallback))
	var resource: Resource = Content.resource(path)
	if not resource is Texture2D: resource=Content.resource(fallback)
	if resource is Texture2D:
		_textures[god_id] = resource
		return resource
	return null

func _portrait_options(god_id: String) -> Dictionary:
	var all: Variant = Content.read("assets").get("portraits",{})
	var options: Variant = all.get(god_id,{}) if all is Dictionary else {}
	return options if options is Dictionary else {}

func _refresh_all() -> void:
	_refresh_chapter()
	_refresh_objective()
	if not _lines.is_empty():
		_apply_line(false)
	_refresh_finale()
	_refresh_visibility()
	_layout()

func _refresh_visibility() -> void:
	_dialogue_surface.visible = _dialogue_visible
	objective_panel.visible = not _dialogue_visible and not _complete and _finale_phase in ["none", "clear"] and not str(_objective.title).is_empty()
	black_overlay.visible = _complete or _finale_phase not in ["none", "clear"]
	complete_panel.visible = _complete

func _refresh_chapter() -> void:
	var text := "%02d  /  %s" % [_chapter_index, _chapter_title] if _chapter_index > 0 else _chapter_title
	chapter_label.text = text
	objective_chapter.text = text

func _refresh_objective() -> void:
	objective_title.text = str(_objective.title)
	objective_details.text = str(_objective.details)
	objective_details.tooltip_text = str(_objective.details)
	_objective_scroll.scroll_vertical = 0
	objective_progress.text = str(_objective.progress)
	objective_progress.visible = not str(_objective.progress).is_empty()
	_objective_body.visible = not bool(_objective.collapsed)
	objective_toggle.text = "展开" if bool(_objective.collapsed) else "收起"
	_layout.call_deferred()

func _refresh_hint() -> void:
	dialogue_hint.text = "点击任意处 / Enter / Space · 立即显示" if _typing else "点击任意处 / Enter / Space · 继续"
	advance_button.text = "显示全文" if _typing else ("开始操作  →" if _line_index + 1 >= _lines.size() else "继续  →")

func _refresh_finale() -> void:
	var alpha := _finale_progress if _finale_phase == "black" else (1.0 if _finale_phase == "title" or _complete else 0.0)
	black_overlay.color = Color(0, 0, 0, alpha)
	title_group.visible = _finale_phase == "title" or _complete
	title_group.modulate.a = 1.0 if _complete else _finale_progress
	_layout.call_deferred()

func _layout() -> void:
	if not is_instance_valid(root_control):
		return
	var screen := root_control.size
	var panel_height := 238.0 if screen.y < 850.0 else 248.0
	dialogue_panel.position = Vector2(26, screen.y - panel_height - 18)
	dialogue_panel.size = Vector2(maxf(600.0, screen.x - 52), panel_height)
	dialogue_text.add_theme_font_size_override("normal_font_size", UiConfig.font_size(22 if screen.y < 850.0 else 23))
	chapter_label.visible = screen.x >= 1360.0
	var portrait_height := minf(464.0, screen.y * 0.53)
	var portrait_width := minf(360.0, screen.x * 0.27)
	for side: String in ["left", "right"]:
		var holder: Control = portrait_slots[side].root
		var options: Dictionary=_portrait_options(str(portrait_slots[side].get("god","")))
		var scale_value: Variant=options.get("scale",1.0)
		var portrait_scale: float=clampf(float(scale_value),0.25,2.0) if (scale_value is int or scale_value is float) and is_finite(float(scale_value)) else 1.0
		holder.size = Vector2(portrait_width, portrait_height)*portrait_scale
		holder.position = Vector2(40 if side == "left" else screen.x - holder.size.x - 40, dialogue_panel.position.y - holder.size.y - 8)
		var offset: Variant=options.get("offset",[0,0])
		if offset is Array and offset.size()==2 and (offset[0] is int or offset[0] is float) and (offset[1] is int or offset[1] is float): holder.position+=Vector2(float(offset[0]),float(offset[1]))
		UiConfig.layout(holder,"tutorial_portrait_"+side)
	var objective_width := minf(602.0, maxf(390.0, screen.x - 564.0))
	objective_panel.position = Vector2((screen.x - objective_width) * 0.5, 144)
	objective_panel.size = Vector2(objective_width, 0)
	title_group.position = Vector2(40, screen.y * (0.24 if _complete else 0.36))
	title_group.size = Vector2(maxf(560.0, screen.x - 80), 190)
	title_label.add_theme_font_size_override("font_size", UiConfig.font_size(66 if screen.x < 1360 else 76))
	complete_panel.position = Vector2((screen.x - 548) * 0.5, screen.y * 0.61)
	complete_panel.size = Vector2(548, 132)
	UiConfig.layout(dialogue_panel,"tutorial_dialogue")
	UiConfig.layout(objective_panel,"tutorial_objective")
	UiConfig.layout(title_group,"tutorial_title")
	UiConfig.layout(complete_panel,"tutorial_complete")
	UiConfig.skin(dialogue_panel,"tutorial_dialogue")
	UiConfig.skin(objective_panel,"tutorial_objective")

func _on_dialogue_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and UiConfig.flag("dialogue_mouse_advance"):
		_dialogue_surface.accept_event()
		advance_dialogue()

func _toggle_objective() -> void:
	_objective.collapsed = not bool(_objective.collapsed)
	_refresh_objective()

func _load_story() -> void:
	if not _story.is_empty():
		return
	var parsed: Variant = Content.read("tutorial_story")
	if parsed is Dictionary and parsed.get("conversations", {}) is Dictionary:
		_story = parsed.conversations

func _clean_lines(source: Variant) -> Array:
	var result: Array = []
	if not source is Array:
		return result
	for raw: Variant in source:
		if raw is String:
			result.append({"speaker": "narrator", "text": raw})
		elif raw is Dictionary and raw.get("text", "") is String:
			var speaker := str(raw.get("speaker", "narrator"))
			if speaker=="you": continue
			var line := {"speaker": speaker if GODS.has(speaker) else "narrator", "text": str(raw.get("text", ""))}
			for key: String in ["left", "right", "side"]:
				if raw.has(key):
					line[key] = str(raw[key])
			result.append(line)
	return result

func _current_text() -> String:
	return str(_lines[_line_index].get("text", "")) if not _lines.is_empty() else ""

func _known_god(value: String) -> String:
	return value if value in ["love", "weather", "death"] else ""

func _rect_data(control: Control) -> Dictionary:
	return {"x": control.position.x, "y": control.position.y, "width": control.size.x, "height": control.size.y}

func _label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = UiConfig.text(text)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

func _button(text: String, callback: Callable, height: float) -> Button:
	var button := Button.new()
	button.text = UiConfig.text(text)
	button.custom_minimum_size.y = height
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	button.add_theme_color_override("font_color", INK)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_stylebox_override("normal", _panel_style(Color(0.12, 0.20, 0.25, 0.85), Color("526977"), 12, 3))
	button.add_theme_stylebox_override("hover", _panel_style(Color("294551"), GOLD, 12, 3))
	button.add_theme_stylebox_override("pressed", _panel_style(Color("385762"), GOLD, 12, 3))
	button.pressed.connect(callback)
	return button

func _panel_style(background: Color, border: Color, margin_x: float, margin_y: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(9)
	style.content_margin_left = margin_x
	style.content_margin_right = margin_x
	style.content_margin_top = margin_y
	style.content_margin_bottom = margin_y
	return UiConfig.tune_style(style)
