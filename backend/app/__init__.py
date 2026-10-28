"""Gagan Suraksha Backend Application Package."""

# Package initialization must remain decoupled from the FastAPI application instance
# to prevent circular imports when submodules (e.g. models, db, ml) are loaded.
