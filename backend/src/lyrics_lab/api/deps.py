from lyrics_lab.db.connection import connect


def get_db():
    with connect() as con:
        yield con
