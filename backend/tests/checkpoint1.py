"""
Testing Checkpoint 1 - Automated Validation Script

Validates all requirements from IMPLEMENTATION_PROMPTS.md Checkpoint 1.
"""

import sys
import time
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

BASE = "http://127.0.0.1:8000"
results = []


def test(name, method, url, expect_status=200):
    start = time.perf_counter()
    try:
        r = getattr(httpx, method)(url, timeout=10)
        elapsed = (time.perf_counter() - start) * 1000
        passed = r.status_code == expect_status
        if r.headers.get("content-type", "").startswith("application/json"):
            body = r.json()
        else:
            body = r.text[:300]
        results.append((name, passed, r.status_code, elapsed, body))
    except Exception as e:
        results.append((name, False, 0, 0, str(e)))


def main():
    print()
    print("=" * 80)
    print("  TESTING CHECKPOINT 1 - Farm Help API")
    print("=" * 80)
    print()

    # ---------------------------------------------------------------
    # T1: Server health
    # ---------------------------------------------------------------
    test("GET / (root)", "get", f"{BASE}/")
    test("GET /health", "get", f"{BASE}/health")

    # ---------------------------------------------------------------
    # T4: Treatment with valid English name
    # ---------------------------------------------------------------
    test(
        "POST /treatment (English: Paddy Blast)",
        "post",
        f"{BASE}/api/disease/treatment?disease_name=Paddy%20Blast",
    )

    # ---------------------------------------------------------------
    # T5: Treatment with Hindi name
    # ---------------------------------------------------------------
    hindi_encoded = "%E0%A4%A7%E0%A4%BE%E0%A4%A8%20%E0%A4%95%E0%A4%BE%20%E0%A4%AC%E0%A5%8D%E0%A4%B2%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%9F"
    test(
        "POST /treatment (Hindi name)",
        "post",
        f"{BASE}/api/disease/treatment?disease_name={hindi_encoded}",
    )

    # ---------------------------------------------------------------
    # T6: List all diseases
    # ---------------------------------------------------------------
    test("GET /list (all diseases)", "get", f"{BASE}/api/disease/list")

    # ---------------------------------------------------------------
    # T7: Filter by crop_type=Paddy
    # ---------------------------------------------------------------
    test(
        "GET /list?crop_type=Paddy",
        "get",
        f"{BASE}/api/disease/list?crop_type=Paddy",
    )

    # ---------------------------------------------------------------
    # T8: FastAPI docs page
    # ---------------------------------------------------------------
    test("GET /docs (Swagger UI)", "get", f"{BASE}/docs")

    # ---------------------------------------------------------------
    # T9: Error handling - disease not found
    # ---------------------------------------------------------------
    test(
        "POST /treatment (404 - invalid name)",
        "post",
        f"{BASE}/api/disease/treatment?disease_name=CompletelyFakeDisease123",
        expect_status=404,
    )

    # ---------------------------------------------------------------
    # Additional endpoint tests
    # ---------------------------------------------------------------
    test("GET /disease/1 (by ID)", "get", f"{BASE}/api/disease/1")
    test(
        "GET /disease/99999 (404)",
        "get",
        f"{BASE}/api/disease/99999",
        expect_status=404,
    )
    test(
        "POST /detect (Paddy)",
        "post",
        f"{BASE}/api/disease/detect?crop_type=Paddy",
    )

    # ---------------------------------------------------------------
    # Print results
    # ---------------------------------------------------------------
    print("-" * 80)
    print("  TEST RESULTS")
    print("-" * 80)

    all_pass = True
    for name, passed, status_code, elapsed_ms, body in results:
        icon = "PASS" if passed else "FAIL"
        time_flag = "OK" if elapsed_ms < 200 else "SLOW"
        if not passed:
            all_pass = False
        print(
            f"  [{icon}] {name:45s} | HTTP {status_code:3d} | {elapsed_ms:7.1f}ms ({time_flag})"
        )
        if not passed:
            detail = body if isinstance(body, str) else json.dumps(body)[:200]
            print(f"         DETAIL: {detail}")

    # ---------------------------------------------------------------
    # Data validation
    # ---------------------------------------------------------------
    print()
    print("-" * 80)
    print("  DATA VALIDATION")
    print("-" * 80)

    for name, passed, status_code, elapsed_ms, body in results:
        if name == "GET /list (all diseases)" and passed and isinstance(body, dict):
            total = body.get("total", 0)
            ok = total >= 30
            icon = "PASS" if ok else "FAIL"
            if not ok:
                all_pass = False
            print(f"  [{icon}] Total diseases: {total} (expected >= 30)")

        if name == "GET /list?crop_type=Paddy" and passed and isinstance(body, dict):
            total = body.get("total", 0)
            diseases = body.get("diseases", [])
            crops = set(d.get("crop_type", "").lower() for d in diseases)
            filter_ok = crops == {"paddy"} or total == 0
            icon = "PASS" if filter_ok and total > 0 else "FAIL"
            if not (filter_ok and total > 0):
                all_pass = False
            print(f"  [{icon}] Paddy filter: {total} diseases, all Paddy: {filter_ok}")

        if (
            name == "POST /treatment (English: Paddy Blast)"
            and passed
            and isinstance(body, dict)
        ):
            dname = body.get("disease_name", "")
            score = body.get("match_score", 0)
            exact = dname == "Paddy Blast" and score == 1.0
            icon = "PASS" if exact else "FAIL"
            if not exact:
                all_pass = False
            print(f"  [{icon}] English match: name={dname}, score={score}")

        if (
            name == "POST /treatment (Hindi name)"
            and passed
            and isinstance(body, dict)
        ):
            dname = body.get("disease_name", "")
            score = body.get("match_score", 0)
            icon = "PASS" if score >= 0.9 else "FAIL"
            if score < 0.9:
                all_pass = False
            print(f"  [{icon}] Hindi match: name={dname}, score={score}")

        if name == "GET /health" and passed and isinstance(body, dict):
            db_status = body.get("database", "unknown")
            icon = "PASS" if db_status == "connected" else "FAIL"
            if db_status != "connected":
                all_pass = False
            print(f"  [{icon}] Database health: {db_status}")

    # ---------------------------------------------------------------
    # Response time check
    # ---------------------------------------------------------------
    print()
    print("-" * 80)
    print("  RESPONSE TIME VALIDATION (< 200ms)")
    print("-" * 80)
    slow = [(n, e) for n, p, s, e, b in results if e >= 200]
    if slow:
        all_pass = False
        for n, e in slow:
            print(f"  [FAIL] {n}: {e:.1f}ms")
    else:
        print(f"  [PASS] All {len(results)} requests completed in < 200ms")

    max_time = max(e for _, _, _, e, _ in results)
    avg_time = sum(e for _, _, _, e, _ in results) / len(results)
    print(f"         Max: {max_time:.1f}ms | Avg: {avg_time:.1f}ms")

    # ---------------------------------------------------------------
    # Final verdict
    # ---------------------------------------------------------------
    print()
    print("=" * 80)
    passed_count = sum(1 for _, p, _, _, _ in results if p)
    total_count = len(results)
    print(f"  RESULTS: {passed_count}/{total_count} endpoint tests passed")
    if all_pass:
        print("  CHECKPOINT 1: ALL TESTS PASSED")
    else:
        print("  CHECKPOINT 1: SOME TESTS FAILED")
    print("=" * 80)
    print()

    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
