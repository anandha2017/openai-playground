#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Iterator

from openai import OpenAI, NotFoundError

DEFAULT_DAYS = 90
FileEntry = tuple[Any, datetime]


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("Value must be a positive integer.")
    return parsed


def parse_before_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise argparse.ArgumentTypeError(
                "Timestamp must be ISO-8601 (e.g., 2024-01-15 or 2024-01-15T12:30:00+00:00)."
            ) from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)
    return parsed


def parse_args(default_days: int) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="List OpenAI files and optionally delete ones older than a threshold."
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete files older than the threshold after confirmation.",
    )
    parser.add_argument(
        "--older-than-days",
        type=positive_int,
        default=None,
        help=(
            f"Age threshold in days for deletion when --delete is set "
            f"(default: {default_days}; mutually exclusive with --before)."
        ),
    )
    parser.add_argument(
        "--before",
        metavar="YYYY-MM-DD[THH:MM[:SS]]",
        type=parse_before_timestamp,
        default=None,
        help=(
            "Only consider files created on or before this timestamp "
            "(assumes UTC when no timezone; mutually exclusive with --older-than-days)."
        ),
    )
    args = parser.parse_args()
    if args.before and args.older_than_days is not None:
        parser.error("Use either --before or --older-than-days, not both.")
    return args


def format_timestamp(seconds: int | None) -> str:
    if not seconds:
        return ""
    dt = datetime.fromtimestamp(seconds, tz=timezone.utc)
    return dt.isoformat()


def iter_old_files(files: Iterable, cutoff: datetime) -> Iterator[FileEntry]:
    for file_obj in files:
        created_at = file_obj.created_at
        if not created_at:
            continue
        created = datetime.fromtimestamp(created_at, tz=timezone.utc)
        if created <= cutoff:
            yield file_obj, created


def print_old_file_list(entries: Iterable[FileEntry], prefix: str = "- ") -> None:
    for file_obj, created in entries:
        print(f"{prefix}{file_obj.id}: {file_obj.filename} ({file_obj.bytes} bytes) | created {created.isoformat()}")


def main() -> None:
    args = parse_args(DEFAULT_DAYS)
    client = OpenAI()
    result = client.files.list()

    files = sorted(result.data or [], key=lambda f: f.created_at or 0, reverse=True)
    if not files:
        print("No files found.")
        return

    now = datetime.now(tz=timezone.utc)
    if args.before:
        cutoff = args.before
        filter_description = f"created on or before {cutoff.isoformat()}"
        threshold_days = None
    else:
        threshold_days = args.older_than_days if args.older_than_days is not None else DEFAULT_DAYS
        cutoff = now - timedelta(days=threshold_days)
        filter_description = f"older than {threshold_days} days"
    old_file_entries = list(iter_old_files(files, cutoff))

    print("Files in your OpenAI account (newest first):")
    for file_obj in files:
        created_info = format_timestamp(file_obj.created_at)
        created_suffix = f" | created {created_info}" if created_info else ""
        print(f"{file_obj.id}: {file_obj.filename} ({file_obj.bytes} bytes){created_suffix}")

    if args.delete:
        if not old_file_entries:
            print(f"No files are {filter_description}.")
            return

        print(
            f"\nThe following files are {filter_description} "
            "and will be deleted if you confirm:"
        )
        print_old_file_list(old_file_entries)

        confirmation = input("\nType 'delete' to remove these files (anything else cancels): ").strip().lower()
        if confirmation != "delete":
            print("Deletion cancelled.")
            return

        for file_obj, _created in old_file_entries:
            try:
                client.files.delete(file_obj.id)
            except NotFoundError as error:
                print(f"Skipped {file_obj.id} ({file_obj.filename}): {error}")
                continue
            print(f"Deleted {file_obj.id} ({file_obj.filename})")
        return

    if args.older_than_days is not None or args.before:
        if not old_file_entries:
            print(f"\nNo files are {filter_description}.")
            return

        print(f"\nFiles {filter_description} (newest first):")
        print_old_file_list(old_file_entries)


if __name__ == "__main__":
    main()
