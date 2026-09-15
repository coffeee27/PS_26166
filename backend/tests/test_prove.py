from app.registration.prove import prove_score


def _cells(values):
    return [{"row": 0, "col": i, "tie_points": 0 if v is None else 10, "rmse_px": v} for i, v in enumerate(values)]


def _by_id(score):
    return {check["id"]: check for check in score["checks"]}


def test_all_checks_pass_gives_strong_evidence():
    score = prove_score(0.5, 1724, 1548, 0.98, 0.75, _cells([0.3] * 19 + [1.4]))

    assert (score["passed"], score["total"], score["evidence"]) == (5, 5, "STRONG")
    assert _by_id(score)["agreement"]["value"] == 1548 / 1724
    assert _by_id(score)["good_cells"]["value"] == 0.95


def test_weak_regions_alone_give_moderate_evidence():
    score = prove_score(0.89, 100, 77, 0.98, 0.76, _cells([0.5] * 8 + [1.5] * 2))

    assert (score["passed"], score["evidence"]) == (4, "MODERATE")
    assert [c["id"] for c in score["checks"] if not c["passed"]] == ["good_cells"]


def test_poor_registration_gives_weak_evidence():
    score = prove_score(1.8, 329, 150, 0.98, 0.76, _cells([1.8] * 10))

    assert (score["passed"], score["evidence"]) == (2, "WEAK")
    assert not _by_id(score)["subpixel"]["passed"] and not _by_id(score)["agreement"]["passed"]


def test_limits_are_inclusive_and_missing_measurements_fail():
    at_limits = prove_score(1.0, 10, 5, 0.8, 0.5, _cells([1.0] * 9 + [None]))
    assert at_limits["passed"] == 5

    nothing = prove_score(0.2, 0, 0, 0.9, 0.9, _cells([None, None]))
    assert not _by_id(nothing)["agreement"]["passed"] and _by_id(nothing)["agreement"]["value"] is None
    assert not _by_id(nothing)["good_cells"]["passed"]
