from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document


PROJECT = Path(__file__).resolve().parent
SOURCE_ROOT = PROJECT.parent


def paragraph_text(path: Path) -> list[str]:
    return [paragraph.text for paragraph in Document(path).paragraphs if paragraph.text.strip()]


def parse_roles() -> list[dict]:
    lines = paragraph_text(SOURCE_ROOT / "人物台词加评价.docx")
    heading_pattern = re.compile(r"^(\d+)\.\s*(.+?)——(.+)$")
    starts = [(index, heading_pattern.match(line)) for index, line in enumerate(lines)]
    starts = [(index, match) for index, match in starts if match]
    roles = []

    for item_index, (start, match) in enumerate(starts):
        end = starts[item_index + 1][0] if item_index + 1 < len(starts) else len(lines)
        body = lines[start + 1:end]
        if len(body) < 2:
            raise ValueError(f"角色资料不完整: {lines[start]}")
        roles.append(
            {
                "name": match.group(2),
                "tag": match.group(3),
                "quote": body[0],
                "analysis": body[1:],
                "image": f"头像/{match.group(2)}.png",
            }
        )
    return roles


def parse_overview() -> dict:
    lines = paragraph_text(SOURCE_ROOT / "你的同事一览表.docx")
    entries = []
    for line in lines[1:]:
        if "——" not in line:
            continue
        name, tag = line.split("——", 1)
        entries.append({"name": name, "tag": tag, "image": f"头像/{name}.png"})
    return {"title": lines[0].lstrip("#"), "entries": entries}


def parse_score_names(raw: str) -> list[str]:
    return [name.strip() for name in raw.replace(" ", "").split("、") if name.strip()]


def parse_questions() -> list[dict]:
    lines = paragraph_text(SOURCE_ROOT / "13人 32题 题库.docx")
    choice_heading = "#第一大题、选择题"
    judgement_heading = "#第二大题、判断题"
    option_pattern = re.compile(r"^([A-Z])\.【([^】]+)】(.*)$")
    choice_pattern = re.compile(r"^第(\d+)题：(.*)$")
    judgement_pattern = re.compile(r"^判断(\d+)【(.+)】：(.*)$")
    score_pattern = re.compile(r"^选(YES|NO)：(.*?)\s*\+1$")

    questions: list[dict] = []
    section = ""
    current: dict | None = None

    def append_current() -> None:
        nonlocal current
        if current is not None:
            questions.append(current)
            current = None

    for line in lines:
        if line == choice_heading:
            append_current()
            section = "choice"
            continue
        if line == judgement_heading:
            append_current()
            section = "judgement"
            continue

        choice_match = choice_pattern.match(line)
        if section == "choice" and choice_match:
            append_current()
            current = {
                "kind": "choice",
                "sourceNumber": int(choice_match.group(1)),
                "section": "第一大题、选择题",
                "text": line,
                "options": [],
            }
            continue

        option_match = option_pattern.match(line)
        if section == "choice" and option_match and current is not None:
            current["options"].append(
                {
                    "label": option_match.group(1),
                    "text": option_match.group(3),
                    "scores": [option_match.group(2)],
                }
            )
            continue

        judgement_match = judgement_pattern.match(line)
        if section == "judgement" and judgement_match:
            append_current()
            current = {
                "kind": "judgement",
                "sourceNumber": int(judgement_match.group(1)),
                "section": "第二大题、判断题",
                "text": line,
                "options": [],
            }
            continue

        score_match = score_pattern.match(line)
        if section == "judgement" and score_match and current is not None:
            current["options"].append(
                {
                    "label": score_match.group(1),
                    "text": score_match.group(1),
                    "scores": parse_score_names(score_match.group(2)),
                }
            )
            continue

        raise ValueError(f"无法识别题库行: {line}")

    append_current()

    for index, question in enumerate(questions, start=1):
        question["number"] = index
        if question["kind"] == "choice" and not question["options"]:
            raise ValueError(f"选择题无选项: {question['text']}")
        if question["kind"] == "judgement" and {option["label"] for option in question["options"]} != {"YES", "NO"}:
            raise ValueError(f"判断题选项不完整: {question['text']}")
    return questions


def main() -> None:
    roles = parse_roles()
    overview = parse_overview()
    questions = parse_questions()
    role_names = {role["name"] for role in roles}

    if len(roles) != 13 or len(overview["entries"]) != 13:
        raise ValueError("角色数量应为 13")
    if len(questions) != 27:
        raise ValueError(f"题库实际题数应为 27，当前为 {len(questions)}")
    if any(entry["name"] not in role_names for entry in overview["entries"]):
        raise ValueError("同事一览表含有未定义角色")
    if any(name not in role_names for question in questions for option in question["options"] for name in option["scores"]):
        raise ValueError("题库中含有未定义计分角色")

    quote_by_name = {role["name"]: role["quote"] for role in roles}
    for entry in overview["entries"]:
        entry["quote"] = quote_by_name[entry["name"]]

    payload = {
        "roles": roles,
        "overview": overview,
        "questions": questions,
        "totalQuestions": len(questions),
    }
    content = "window.APP_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    (PROJECT / "app-data.js").write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
