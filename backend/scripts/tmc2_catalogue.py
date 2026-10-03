"""Browse the Chandrayaan-2 TMC-2 archive catalogue and shortlist products to download.

The catalogue (`backend/data/catalogues/tmc2_archive_products.csv`) is an index of
what exists in ISRO's PRADAN archive: one row per product, with its filename,
camera code, acquisition time, size, orbit altitude and the PRADAN page it sits on.

Provenance: harvested from the public PRADAN archive listing and published as open
data by the SIH team at github.com/sehersiddiqui/SIH-26166-ISRO-Chandrayaan-DL-Model.
It is an index of a public ISRO archive; the products themselves are downloaded from
PRADAN directly and are the only thing that enters the engine.

IMPORTANT: the catalogue carries no latitude or longitude, so this script cannot
select products by location. Use it to see what product *types* and *dates* exist,
then use PRADAN's own coordinate search (login required) to pick the footprint you
want. Footprint corners are read from the PDS4 label once a product is downloaded.

Camera codes: NCN/NRN nadir, NCF/NRF fore, NCA/NRA aft, NDN derived (DTM + ortho).
Usage:
    python scripts/tmc2_catalogue.py                 # summary
    python scripts/tmc2_catalogue.py --dtm-pairs     # 5 m DTM + ortho pairs
    python scripts/tmc2_catalogue.py --stereo        # complete 3-camera observations
    python scripts/tmc2_catalogue.py --dtm-pairs --after 2021 --limit 40 --csv out.csv
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from pathlib import Path

CATALOGUE = Path(__file__).resolve().parent.parent / "data" / "catalogues" / "tmc2_archive_products.csv"

CAMERA = {
    "NCN": "nadir", "NRN": "nadir", "NCF": "fore", "NRF": "fore",
    "NCA": "aft", "NRA": "aft", "NDN": "derived (DTM/ortho)",
}
# ch2_tmc_<code>_<YYYYMMDD>T<time><serial>_d_<kind>_d18[_5m].zip
STAMP = re.compile(r"ch2_tmc_[a-z]{3}_(\d{8}T\d+)_", re.I)
# everything from "_d_dtm"/"_d_oth"/"_d_img" onwards is the kind + processing suffix
SUFFIX = re.compile(r"_d_(?:dtm|oth|img)_.*\.zip$", re.I)


def stem_of(filename: str) -> str:
    return SUFFIX.sub("", filename)


def load(path: Path = CATALOGUE) -> list[dict]:
    if not path.exists():
        raise SystemExit(f"Catalogue not found: {path}")
    with path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        row["gb"] = int(row["product_size_bytes"]) / 1e9
        row["date"] = row["start_time"][:10]
        match = STAMP.search(row["filename"])
        row["stamp"] = match.group(1) if match else ""
    return rows


def summary(rows: list[dict]) -> None:
    print(f"{len(rows):,} TMC-2 products  ({sum(r['gb'] for r in rows) / 1000:.1f} TB total)")
    print(f"acquired {min(r['date'] for r in rows)} to {max(r['date'] for r in rows)}\n")
    print("by camera:")
    for code, count in Counter(r["product_code"] for r in rows).most_common():
        print(f"  {code}  {CAMERA.get(code, '?'):<20} {count:>6,}")
    kinds = Counter(
        "DTM" if "_dtm_" in r["filename"] else "ortho" if "_oth_" in r["filename"] else "image"
        for r in rows
    )
    print("\nby kind:")
    for kind, count in kinds.most_common():
        print(f"  {kind:<8} {count:>6,}")


def dtm_pairs(rows: list[dict]) -> list[tuple[str, dict, dict]]:
    """Derived products come as a DTM and an orthoimage sharing one acquisition stamp."""
    by_stamp: dict[str, dict[str, dict]] = defaultdict(dict)
    for row in rows:
        if row["product_code"] != "NDN" or not row["stamp"]:
            continue
        if "_dtm_" in row["filename"]:
            by_stamp[row["stamp"]]["dtm"] = row
        elif "_oth_" in row["filename"]:
            by_stamp[row["stamp"]]["oth"] = row
    pairs = [(s, v["dtm"], v["oth"]) for s, v in by_stamp.items() if "dtm" in v and "oth" in v]
    return sorted(pairs)


def stereo_sets(rows: list[dict]) -> list[tuple[str, list[dict]]]:
    """Fore + nadir + aft acquired together: a full TMC-2 stereo triplet."""
    # NC* and NR* are two processing series of the same acquisition: keep them apart,
    # or a single pass looks like a six-camera triplet.
    by_key: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        if row["product_code"] in ("NCN", "NCF", "NCA", "NRN", "NRF", "NRA") and row["stamp"]:
            series = row["product_code"][:2]  # NC or NR
            by_key[f"{row['stamp'][:15]}/{series}"].append(row)
    complete = [
        (key, group) for key, group in by_key.items()
        if {CAMERA[r["product_code"]] for r in group} == {"nadir", "fore", "aft"}
    ]
    return sorted(complete)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dtm-pairs", action="store_true", help="list 5 m DTM + orthoimage pairs")
    parser.add_argument("--stereo", action="store_true", help="list complete fore/nadir/aft triplets")
    parser.add_argument("--after", default="", help="keep acquisitions on or after this date (YYYY or YYYY-MM-DD)")
    parser.add_argument("--before", default="", help="keep acquisitions before this date")
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--csv", type=Path, help="write the listing to this file")
    args = parser.parse_args()

    rows = load()
    if args.after:
        rows = [r for r in rows if r["date"] >= args.after]
    if args.before:
        rows = [r for r in rows if r["date"] < args.before]

    if not args.dtm_pairs and not args.stereo:
        summary(rows)
        print("\nNo location filter is possible: the catalogue has no lat/lon.")
        print("Use PRADAN's coordinate search to choose a footprint, then match it here.")
        return

    out: list[dict] = []
    if args.dtm_pairs:
        pairs = dtm_pairs(rows)
        print(f"{len(pairs):,} DTM + orthoimage pairs at 5 m\n")
        print(f"{'acquired':<12} {'DTM (GB)':>9} {'ortho (GB)':>11} {'page':>5}  product stem")
        for stamp, dtm, oth in pairs[: args.limit]:
            stem = stem_of(dtm["filename"])
            print(f"{dtm['date']:<12} {dtm['gb']:>9.2f} {oth['gb']:>11.2f} {dtm['archive_page']:>5}  {stem}")
            out.append({"acquired": dtm["date"], "stem": stem, "dtm": dtm["filename"],
                        "ortho": oth["filename"], "dtm_gb": round(dtm["gb"], 2),
                        "ortho_gb": round(oth["gb"], 2), "pradan_page": dtm["archive_page"]})
        if len(pairs) > args.limit:
            print(f"... {len(pairs) - args.limit:,} more (raise --limit)")

    if args.stereo:
        sets = stereo_sets(rows)
        print(f"\n{len(sets):,} complete fore/nadir/aft triplets\n")
        for stamp, group in sets[: args.limit]:
            total = sum(r["gb"] for r in group)
            print(f"{group[0]['date']:<12} {total:>6.2f} GB  page {group[0]['archive_page']:>4}  "
                  f"{group[0]['product_code'][:2]}  {'+'.join(sorted(CAMERA[r['product_code']] for r in group))}")
            out.append({"acquired": group[0]["date"], "stem": stamp, "total_gb": round(total, 2),
                        "pradan_page": group[0]["archive_page"],
                        "files": " | ".join(sorted(r["filename"] for r in group))})

    if args.csv and out:
        with args.csv.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(out[0]))
            writer.writeheader()
            writer.writerows(out)
        print(f"\nwrote {len(out)} rows to {args.csv}")


if __name__ == "__main__":
    main()
