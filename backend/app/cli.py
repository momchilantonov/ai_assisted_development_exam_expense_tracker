import argparse
import getpass
import os
import sys

from app.config import get_settings
from app.db import create_db_engine, create_session_factory, init_db
from app.services.auth import provision_user


def _read_credentials() -> tuple[str, str] | None:
    username = os.environ.get("INITIAL_USERNAME", "").strip()
    password = os.environ.get("INITIAL_PASSWORD", "")
    interactive = sys.stdin.isatty()
    if not username and interactive:
        username = input("Username: ").strip()
    if not password and interactive:
        password = getpass.getpass("Password: ")
        if getpass.getpass("Repeat password: ") != password:
            print("Passwords do not match.", file=sys.stderr)
            return None
    if not username or not password:
        print(
            "Username and password required: set INITIAL_USERNAME and INITIAL_PASSWORD "
            "or run interactively.",
            file=sys.stderr,
        )
        return None
    return username, password


def create_user(reset_password: bool) -> int:
    credentials = _read_credentials()
    if credentials is None:
        return 2
    username, password = credentials
    engine = create_db_engine(get_settings().database_url)
    try:
        init_db(engine)
        with create_session_factory(engine)() as db:
            result = provision_user(db, username, password, reset_password=reset_password)
    finally:
        engine.dispose()
    messages = {
        "created": "User created.",
        "reset": "Password reset.",
        "exists": "User already exists; nothing changed (use --reset-password to overwrite).",
    }
    print(messages[result])
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create-user", help="Provision the single user")
    create.add_argument("--reset-password", action="store_true")
    args = parser.parse_args(argv)
    return create_user(args.reset_password)


if __name__ == "__main__":
    sys.exit(main())
